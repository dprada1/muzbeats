/**
 * Recover artist organization for mixed images by matching file hashes with backup.
 *
 * This script:
 * 1. Scans backup artist folders and builds hash -> artist map
 * 2. Scans covers/unused/_mixed/ and matches by hash
 * 3. Moves matched images to covers/unused/{artist}/
 * 4. Leaves unmatched images in _mixed/
 *
 * Usage:
 *   tsx src/db/recover-artist-organization.ts --backup <backup_path> --dry-run
 *   tsx src/db/recover-artist-organization.ts --backup <backup_path> --apply
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { readdir, stat, rename, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Args = {
    apply: boolean;
    assetsDir: string;
    backupDir: string;
};

function parseArgs(argv: string[]): Args {
    const out: Args = {
        apply: false,
        assetsDir: path.join(__dirname, '../../public/assets'),
        backupDir: '',
    };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--apply') out.apply = true;
        else if (a === '--dry-run') out.apply = false;
        else if (a === '--backup') out.backupDir = argv[++i] || '';
        else if (a === '--assets') out.assetsDir = argv[++i] || out.assetsDir;
        else if (a === '--help' || a === '-h') {
            console.log(`
Recover artist organization for mixed images.

Usage:
  tsx src/db/recover-artist-organization.ts --backup <backup_path> [--dry-run|--apply]

Options:
  --backup <path>  Path to backup folder (required)
  --apply          Perform file operations (default: dry-run)
  --assets         Assets directory (default: public/assets)

Example:
  tsx src/db/recover-artist-organization.ts --backup ../_backup_organize_1766433359744 --dry-run
`);
            process.exit(0);
        }
    }

    if (!out.backupDir) {
        console.error('❌ --backup is required');
        process.exit(1);
    }

    return out;
}

/**
 * Calculate MD5 hash of a file
 */
async function hashFile(filePath: string): Promise<string> {
    const buffer = await readFile(filePath);
    return createHash('md5').update(buffer).digest('hex');
}

/**
 * Get all image files in a directory recursively
 */
async function getAllImages(dir: string): Promise<string[]> {
    const images: string[] = [];
    if (!existsSync(dir)) return images;

    async function scan(current: string) {
        const entries = await readdir(current, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory() && entry.name !== 'unused' && entry.name !== 'used') {
                await scan(fullPath);
            } else if (/\.(jpg|jpeg|png|webp)$/i.test(entry.name)) {
                images.push(fullPath);
            }
        }
    }

    await scan(dir);
    return images;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    console.log(`\n📋 Recover Artist Organization`);
    console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY RUN'}`);
    console.log(`Backup: ${args.backupDir}`);
    console.log(`Assets: ${args.assetsDir}\n`);

    if (!existsSync(args.backupDir)) {
        console.error(`❌ Backup directory not found: ${args.backupDir}`);
        process.exit(1);
    }

    const backupImagesDir = path.join(args.backupDir, 'images');
    const coversUnusedDir = path.join(args.assetsDir, 'images', 'covers', 'unused');
    const mixedDir = path.join(coversUnusedDir, '_mixed');

    if (!existsSync(mixedDir)) {
        console.error(`❌ Mixed images directory not found: ${mixedDir}`);
        process.exit(1);
    }

    // Step 1: Build hash -> artist map from backup
    console.log(`🔍 Building hash map from backup...`);
    const hashToArtist = new Map<string, string>(); // hash -> artist name

    const backupArtistFolders = await readdir(backupImagesDir);
    for (const artist of backupArtistFolders) {
        if (artist === 'covers' || artist === 'skimask.png') continue;
        const artistDir = path.join(backupImagesDir, artist);
        const stats = await stat(artistDir);
        if (!stats.isDirectory()) continue;

        const images = await getAllImages(artistDir);
        console.log(`   Scanning ${artist}/ (${images.length} images)...`);
        
        for (const img of images) {
            try {
                const hash = await hashFile(img);
                hashToArtist.set(hash, artist);
            } catch (err) {
                console.warn(`   ⚠️  Could not hash ${img}: ${err}`);
            }
        }
    }

    console.log(`   ✅ Built hash map: ${hashToArtist.size} unique images`);

    // Step 2: Scan mixed images and match by hash
    console.log(`\n🔍 Matching mixed images...`);
    const mixedImages = await getAllImages(mixedDir);
    console.log(`   Found ${mixedImages.length} images in _mixed/`);

    const matches: Map<string, string[]> = new Map(); // artist -> [image paths]
    const unmatched: string[] = [];

    for (const img of mixedImages) {
        try {
            const hash = await hashFile(img);
            const artist = hashToArtist.get(hash);
            if (artist) {
                if (!matches.has(artist)) {
                    matches.set(artist, []);
                }
                matches.get(artist)!.push(img);
            } else {
                unmatched.push(img);
            }
        } catch (err) {
            console.warn(`   ⚠️  Could not hash ${img}: ${err}`);
            unmatched.push(img);
        }
    }

    console.log(`\n📊 Results:`);
    for (const [artist, images] of matches.entries()) {
        console.log(`   ${artist}: ${images.length} images matched`);
    }
    console.log(`   Unmatched: ${unmatched.length} images (will stay in _mixed/)`);

    if (!args.apply) {
        console.log(`\n🔍 DRY RUN - No files moved. Use --apply to perform operations.`);
        process.exit(0);
    }

    // Step 3: Move matched images to artist folders
    console.log(`\n📦 Moving matched images...`);
    let moved = 0;
    for (const [artist, images] of matches.entries()) {
        const targetDir = path.join(coversUnusedDir, artist);
        await mkdir(targetDir, { recursive: true });

        for (const img of images) {
            const filename = path.basename(img);
            const dest = path.join(targetDir, filename);
            
            // Handle name conflicts
            let finalDest = dest;
            let counter = 1;
            while (existsSync(finalDest)) {
                const ext = path.extname(filename);
                const base = path.basename(filename, ext);
                finalDest = path.join(targetDir, `${base}_${counter}${ext}`);
                counter++;
            }

            await rename(img, finalDest);
            moved++;
        }
        console.log(`   ✅ ${artist}: moved ${images.length} images`);
    }

    console.log(`\n✅ Done!`);
    console.log(`   Matched and moved: ${moved} images`);
    console.log(`   Unmatched (stayed in _mixed/): ${unmatched.length} images`);

    process.exit(0);
}

main().catch((err) => {
    console.error('recover-artist-organization error:', err);
    process.exit(1);
});

