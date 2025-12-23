/**
 * Move unique images from artist folders to covers/unused/{artist}/ (preserving artist organization).
 *
 * This script:
 * 1. Scans artist folders for duplicates of images in covers/used/ (the 90 used ones)
 * 2. Removes duplicates from artist folders
 * 3. Moves remaining unique images to covers/unused/{artist}/ (preserving artist organization)
 *
 * Usage:
 *   tsx src/db/move-artist-to-unused-organized.ts --dry-run
 *   tsx src/db/move-artist-to-unused-organized.ts --apply
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { readdir, stat, rename, mkdir, readFile, unlink } from 'fs/promises';
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
        backupDir: path.join(__dirname, '../../public/assets/_backup_move_organized_' + Date.now()),
    };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--apply') out.apply = true;
        else if (a === '--dry-run') out.apply = false;
        else if (a === '--assets') out.assetsDir = argv[++i] || out.assetsDir;
        else if (a === '--backup') out.backupDir = argv[++i] || out.backupDir;
        else if (a === '--help' || a === '-h') {
            console.log(`
Move artist folders to covers/unused/{artist}/ (preserving organization).

Usage:
  tsx src/db/move-artist-to-unused-organized.ts [--dry-run|--apply]

What it does:
  1. Scans artist folders for duplicates of images in covers/used/
  2. Removes duplicates from artist folders
  3. Moves remaining unique images to covers/unused/{artist}/
`);
            process.exit(0);
        }
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
 * Get all image files in a directory (non-recursive, excludes unused subfolders)
 */
async function getImagesInDir(dir: string, excludeUnused: boolean = true): Promise<string[]> {
    const images: string[] = [];
    if (!existsSync(dir)) return images;

    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (excludeUnused && entry.name === 'unused') continue;
            const subDir = path.join(dir, entry.name);
            const subImages = await getImagesInDir(subDir, excludeUnused);
            images.push(...subImages);
        } else if (/\.(jpg|jpeg|png|webp)$/i.test(entry.name)) {
            images.push(path.join(dir, entry.name));
        }
    }

    return images;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    console.log(`\n📋 Move Artist Folders to covers/unused/{artist}/`);
    console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY RUN'}`);
    console.log(`Assets: ${args.assetsDir}`);
    if (args.apply) {
        console.log(`Backup: ${args.backupDir}\n`);
    } else {
        console.log(`(Backup will be created in apply mode)\n`);
    }

    const imagesDir = path.join(args.assetsDir, 'images');
    const coversDir = path.join(imagesDir, 'covers');
    const coversUsedDir = path.join(coversDir, 'used');
    const coversUnusedDir = path.join(coversDir, 'unused');

    // Step 1: Build hash set of used covers (the 90 UUID files)
    console.log(`🔍 Scanning used covers...`);
    const usedCovers = await getImagesInDir(coversUsedDir, false);
    const usedCoversHashes = new Set<string>();

    for (const img of usedCovers) {
        const hash = await hashFile(img);
        usedCoversHashes.add(hash);
    }

    console.log(`   Found ${usedCoversHashes.size} used covers`);

    // Step 2: Scan artist folders
    console.log(`\n🔍 Scanning artist folders...`);
    const artistImages: Map<string, string[]> = new Map(); // artist -> [image paths]

    const artistFolders = await readdir(imagesDir);
    for (const artist of artistFolders) {
        if (artist === 'covers' || artist === 'skimask.png') continue;
        const artistDir = path.join(imagesDir, artist);
        const stats = await stat(artistDir);
        if (!stats.isDirectory()) continue;

        const images = await getImagesInDir(artistDir, true); // Exclude unused subfolders
        if (images.length > 0) {
            artistImages.set(artist, images);
            console.log(`   ${artist}/: ${images.length} images`);
        }
    }

    // Step 3: Identify duplicates and unique images
    console.log(`\n📊 Analyzing duplicates...`);
    const duplicates: string[] = [];
    const uniqueImages: Map<string, string[]> = new Map(); // artist -> [unique image paths]

    for (const [artist, images] of artistImages.entries()) {
        const unique: string[] = [];
        for (const img of images) {
            const hash = await hashFile(img);
            if (usedCoversHashes.has(hash)) {
                duplicates.push(img);
            } else {
                unique.push(img);
            }
        }
        if (unique.length > 0) {
            uniqueImages.set(artist, unique);
        }
        console.log(`   ${artist}: ${images.length - unique.length} duplicates, ${unique.length} unique`);
    }

    const totalDuplicates = duplicates.length;
    const totalUnique = Array.from(uniqueImages.values()).reduce((sum, arr) => sum + arr.length, 0);

    console.log(`\n📊 Summary:`);
    console.log(`   Duplicates (will be deleted): ${totalDuplicates}`);
    console.log(`   Unique images (will be moved): ${totalUnique}`);

    if (!args.apply) {
        console.log(`\n🔍 DRY RUN - No files moved. Use --apply to perform operations.`);
        console.log(`\nPlanned moves:`);
        for (const [artist, images] of uniqueImages.entries()) {
            console.log(`   ${artist}/ → covers/unused/${artist}/ (${images.length} images)`);
        }
        process.exit(0);
    }

    // Step 4: Create backup
    console.log(`\n💾 Creating backup...`);
    await mkdir(args.backupDir, { recursive: true });
    const { execSync } = await import('child_process');
    execSync(`cp -r "${imagesDir}" "${path.join(args.backupDir, 'images')}"`, { stdio: 'ignore' });
    console.log(`   ✅ Backup created: ${args.backupDir}`);

    // Step 5: Delete duplicates
    console.log(`\n🗑️  Deleting duplicates...`);
    let deleted = 0;
    for (const img of duplicates) {
        await unlink(img);
        deleted++;
        if (deleted % 50 === 0) {
            console.log(`   Deleted ${deleted}/${totalDuplicates}...`);
        }
    }
    console.log(`   ✅ Deleted ${deleted} duplicate images`);

    // Step 6: Move unique images to covers/unused/{artist}/
    console.log(`\n📦 Moving unique images to covers/unused/{artist}/...`);
    let moved = 0;
    for (const [artist, images] of uniqueImages.entries()) {
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
        console.log(`   ✅ ${artist}: moved ${images.length} images to covers/unused/${artist}/`);
    }

    // Step 7: Clean up empty artist folders (but keep unused subfolders if they exist)
    console.log(`\n🧹 Cleaning up empty artist folders...`);
    for (const artist of artistImages.keys()) {
        const artistDir = path.join(imagesDir, artist);
        if (!existsSync(artistDir)) continue;

        const entries = await readdir(artistDir, { withFileTypes: true });
        const hasFiles = entries.some((e) => e.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(e.name));
        
        if (!hasFiles) {
            // Check if there's an unused subfolder - if so, keep the folder
            const unusedSubfolder = path.join(artistDir, 'unused');
            if (existsSync(unusedSubfolder)) {
                const unusedFiles = await readdir(unusedSubfolder);
                if (unusedFiles.length > 0) {
                    console.log(`   Keeping ${artist}/ (has unused/ subfolder)`);
                    continue;
                }
            }
            console.log(`   ${artist}/ is now empty (keeping folder structure for now)`);
        }
    }

    console.log(`\n✅ Done!`);
    console.log(`   Backup: ${args.backupDir}`);
    console.log(`   Unique images organized in: ${coversUnusedDir}/{artist}/`);
    console.log(`\n📝 Final structure:`);
    console.log(`   covers/used/{uuid}.webp - Used covers (90)`);
    console.log(`   covers/unused/{artist}/ - Unique unused images organized by artist`);

    process.exit(0);
}

main().catch((err) => {
    console.error('move-artist-to-unused-organized error:', err);
    process.exit(1);
});

