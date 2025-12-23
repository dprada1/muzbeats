/**
 * Migrate cover images from updated_images/ to UUID-based naming.
 *
 * This script:
 * 1. Reads all beats from the database
 * 2. Matches images in updated_images/ to beats by beat name (from audio_path)
 * 3. Copies/renames images to UUID-based names in updated_images_uuid/
 * 4. Supports both flat structure (covers/{uuid}.webp) and artist folders ({artist}/{uuid}.webp)
 *
 * Usage:
 *   tsx src/db/migrate-covers-to-uuid.ts --dry-run [--flat|--artist-folders]
 *   tsx src/db/migrate-covers-to-uuid.ts --apply [--flat|--artist-folders]
 *
 * Options:
 *   --flat              Use flat structure: covers/{uuid}.webp (RECOMMENDED)
 *   --artist-folders    Use artist folders: {artist}/{uuid}.webp
 *   --apply             Perform file operations (default: dry-run)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdir, copyFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import pool from '@/config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Args = {
    apply: boolean;
    structure: 'flat' | 'artist-folders';
    sourceDir: string;
    targetDir: string;
};

function parseArgs(argv: string[]): Args {
    const out: Args = {
        apply: false,
        structure: 'flat',
        sourceDir: path.join(__dirname, '../../public/assets/updated_images'),
        targetDir: path.join(__dirname, '../../public/assets/updated_images_uuid'),
    };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--apply') out.apply = true;
        else if (a === '--dry-run') out.apply = false;
        else if (a === '--flat') out.structure = 'flat';
        else if (a === '--artist-folders') out.structure = 'artist-folders';
        else if (a === '--source') out.sourceDir = argv[++i] || out.sourceDir;
        else if (a === '--target') out.targetDir = argv[++i] || out.targetDir;
        else if (a === '--help' || a === '-h') {
            console.log(`
Migrate cover images to UUID-based naming.

Usage:
  tsx src/db/migrate-covers-to-uuid.ts [--dry-run|--apply] [--flat|--artist-folders]

Options:
  --flat              Flat structure: covers/{uuid}.webp (RECOMMENDED)
  --artist-folders   Artist folders: {artist}/{uuid}.webp
  --apply             Perform file operations (default: dry-run)
  --source <path>     Source directory (default: public/assets/updated_images)
  --target <path>     Target directory (default: public/assets/updated_images_uuid)

Examples:
  # Dry run with flat structure (recommended)
  tsx src/db/migrate-covers-to-uuid.ts --dry-run --flat

  # Apply with artist folders
  tsx src/db/migrate-covers-to-uuid.ts --apply --artist-folders
`);
            process.exit(0);
        }
    }

    return out;
}

/**
 * Extract beat slug from audio_path (e.g., "pierre_bourne__uncommon_Dmin_152.mp3" -> "uncommon")
 */
function extractBeatSlugFromAudioPath(audioPath: string): string | null {
    const filename = path.basename(audioPath);
    const stem = filename.replace(/\.(mp3|wav)$/i, '');
    const match = stem.match(/^.+?__(.+?)_[A-G][sb]?(?:maj|min)_\d+$/);
    if (!match) return null;
    return match[1].toLowerCase();
}

/**
 * Extract artist slug from audio_path (e.g., "pierre_bourne__uncommon_Dmin_152.mp3" -> "pierre_bourne")
 */
function extractArtistSlugFromAudioPath(audioPath: string): string | null {
    const filename = path.basename(audioPath);
    const stem = filename.replace(/\.(mp3|wav)$/i, '');
    const idx = stem.indexOf('__');
    if (idx <= 0) return null;
    return stem.slice(0, idx);
}

/**
 * Normalize image filename to beat slug for matching
 * (e.g., "uncommon.png" -> "uncommon", "life's_good.png" -> "lifes_good")
 */
function normalizeImageName(imgName: string): string {
    return imgName
        .replace(/\.(jpg|jpeg|png|webp)$/i, '')
        .toLowerCase()
        .replace(/['"]/g, '') // Remove quotes/apostrophes
        .replace(/\s+/g, '_'); // Spaces to underscores
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    console.log(`\n📋 Migrate Covers to UUID`);
    console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY RUN'}`);
    console.log(`Structure: ${args.structure === 'flat' ? 'Flat (covers/{uuid}.webp)' : 'Artist folders ({artist}/{uuid}.webp)'}`);
    console.log(`Source: ${args.sourceDir}`);
    console.log(`Target: ${args.targetDir}\n`);

    // 1. Load all beats from database
    const beatsResult = await pool.query(`
        SELECT id, audio_path, title
        FROM beats
        ORDER BY created_at DESC
    `);
    const beats = beatsResult.rows;

    console.log(`Found ${beats.length} beats in database\n`);

    // 2. Load all images from source directory
    if (!existsSync(args.sourceDir)) {
        console.error(`❌ Source directory does not exist: ${args.sourceDir}`);
        process.exit(1);
    }

    const sourceFiles = await readdir(args.sourceDir);
    const imageFiles = sourceFiles.filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));

    console.log(`Found ${imageFiles.length} images in source directory\n`);

    // 3. Build mapping: beat_slug -> image filename
    const slugToImage: Map<string, string> = new Map();
    for (const img of imageFiles) {
        const normalized = normalizeImageName(img);
        slugToImage.set(normalized, img);
    }

    // 4. Match beats to images
    type Match = {
        beatId: string;
        beatSlug: string;
        artistSlug: string | null;
        audioPath: string;
        title: string;
        imageFile: string | null;
        targetPath: string;
    };

    const matches: Match[] = [];
    const unmatched: Array<{ beatId: string; beatSlug: string; title: string }> = [];
    const unusedImages: string[] = [...imageFiles];

    for (const beat of beats) {
        const beatSlug = extractBeatSlugFromAudioPath(beat.audio_path);
        const artistSlug = extractArtistSlugFromAudioPath(beat.audio_path);

        if (!beatSlug) {
            console.warn(`⚠️  Could not extract beat slug from: ${beat.audio_path}`);
            continue;
        }

        const normalizedSlug = normalizeImageName(beatSlug);
        const imageFile = slugToImage.get(normalizedSlug) || null;

        // Determine target path
        let targetPath: string;
        if (args.structure === 'flat') {
            targetPath = path.join(args.targetDir, 'covers', `${beat.id}.webp`);
        } else {
            if (!artistSlug) {
                console.warn(`⚠️  Could not extract artist slug from: ${beat.audio_path}`);
                targetPath = path.join(args.targetDir, 'covers', `${beat.id}.webp`); // Fallback to flat
            } else {
                targetPath = path.join(args.targetDir, artistSlug, `${beat.id}.webp`);
            }
        }

        if (imageFile) {
            matches.push({
                beatId: beat.id,
                beatSlug,
                artistSlug,
                audioPath: beat.audio_path,
                title: beat.title,
                imageFile,
                targetPath,
            });
            // Remove from unused list
            const idx = unusedImages.indexOf(imageFile);
            if (idx >= 0) unusedImages.splice(idx, 1);
        } else {
            unmatched.push({
                beatId: beat.id,
                beatSlug,
                title: beat.title,
            });
        }
    }

    console.log(`✅ Matched: ${matches.length} beats`);
    console.log(`❌ Unmatched: ${unmatched.length} beats`);
    console.log(`📦 Unused images: ${unusedImages.length}\n`);

    if (unmatched.length > 0) {
        console.log(`\n⚠️  Unmatched beats (will need fallback images):`);
        for (const u of unmatched.slice(0, 10)) {
            console.log(`   - ${u.beatSlug} (${u.title})`);
        }
        if (unmatched.length > 10) console.log(`   ... (${unmatched.length - 10} more)`);
    }

    if (unusedImages.length > 0) {
        console.log(`\n📦 Unused images (not matched to any beat):`);
        for (const img of unusedImages.slice(0, 10)) {
            console.log(`   - ${img}`);
        }
        if (unusedImages.length > 10) console.log(`   ... (${unusedImages.length - 10} more)`);
    }

    if (!args.apply) {
        console.log(`\n🔍 DRY RUN - No files copied. Use --apply to perform operations.`);
        console.log(`\nExample matches (first 5):`);
        for (const m of matches.slice(0, 5)) {
            console.log(`   ${m.imageFile} -> ${path.relative(args.targetDir, m.targetPath)} (${m.beatSlug})`);
        }
        process.exit(0);
    }

    // 5. Create target directory structure
    if (args.structure === 'flat') {
        await mkdir(path.join(args.targetDir, 'covers'), { recursive: true });
    } else {
        // Create artist folders
        const artistFolders = new Set<string>();
        for (const m of matches) {
            if (m.artistSlug) {
                artistFolders.add(m.artistSlug);
            }
        }
        for (const artist of artistFolders) {
            await mkdir(path.join(args.targetDir, artist), { recursive: true });
        }
        // Also create covers folder for fallback
        await mkdir(path.join(args.targetDir, 'covers'), { recursive: true });
    }

    // 6. Copy and convert images
    console.log(`\n📋 Copying images...`);
    let copied = 0;
    let errors = 0;

    for (const m of matches) {
        try {
            const sourcePath = path.join(args.sourceDir, m.imageFile!);
            const targetPath = m.targetPath;

            // Ensure target directory exists
            await mkdir(path.dirname(targetPath), { recursive: true });

            // Copy file (we'll convert to webp later if needed, for now just copy)
            await copyFile(sourcePath, targetPath);
            copied++;

            if (copied % 10 === 0) {
                console.log(`   Copied ${copied}/${matches.length}...`);
            }
        } catch (err) {
            console.error(`   ❌ Error copying ${m.imageFile}: ${err}`);
            errors++;
        }
    }

    console.log(`\n✅ Done!`);
    console.log(`   Copied: ${copied} images`);
    if (errors > 0) console.log(`   Errors: ${errors}`);
    console.log(`   Target: ${args.targetDir}`);
    console.log(`\n📝 Next steps:`);
    if (args.structure === 'flat') {
        console.log(`   1. Review images in: ${path.join(args.targetDir, 'covers')}`);
        console.log(`   2. Update database: npm run update-covers -- --prefix /assets/images/covers --apply`);
    } else {
        console.log(`   1. Review images in: ${args.targetDir}`);
        console.log(`   2. Update database with custom script (artist folders not yet supported by update-covers)`);
    }
    console.log(`   3. Upload to R2: aws s3 sync "${args.targetDir}" "s3://muzbeats-media-public/images" --endpoint-url ...`);

    process.exit(0);
}

main().catch((err) => {
    console.error('migrate-covers-to-uuid error:', err);
    process.exit(1);
});

