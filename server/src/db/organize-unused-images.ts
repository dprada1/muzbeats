/**
 * Organize unused images from old_images/ into artist folders and scan for duplicates.
 *
 * This script:
 * 1. Moves old_images/carti/unused/ → images/playboi_carti/unused/
 * 2. Moves old_images/pierre/unused/ → images/pierre_bourne/unused/
 * 3. Scans for duplicates between:
 *    - Artist folders (images/{artist}/*.webp)
 *    - Covers (images/covers/*.webp)
 *    - Unused folders (images/{artist}/unused/*)
 * 4. Moves unique images from artist folders to images/covers/unused/
 * 5. Creates backups for easy revert
 *
 * Usage:
 *   tsx src/db/organize-unused-images.ts --dry-run
 *   tsx src/db/organize-unused-images.ts --apply
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { readdir, stat, copyFile, mkdir, readFile, rename } from 'fs/promises';
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
        backupDir: path.join(__dirname, '../../public/assets/_backup_organize_' + Date.now()),
    };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--apply') out.apply = true;
        else if (a === '--dry-run') out.apply = false;
        else if (a === '--assets') out.assetsDir = argv[++i] || out.assetsDir;
        else if (a === '--backup') out.backupDir = argv[++i] || out.backupDir;
        else if (a === '--help' || a === '-h') {
            console.log(`
Organize unused images and scan for duplicates.

Usage:
  tsx src/db/organize-unused-images.ts [--dry-run|--apply]

Options:
  --apply      Perform file operations (default: dry-run)
  --assets     Assets directory (default: public/assets)
  --backup     Backup directory (default: public/assets/_backup_organize_<timestamp>)

What it does:
  1. Moves old_images/carti/unused/ → images/playboi_carti/unused/
  2. Moves old_images/pierre/unused/ → images/pierre_bourne/unused/
  3. Scans for duplicates using file hashes
  4. Moves unique images from artist folders to images/covers/unused/
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
 * Get all image files in a directory recursively
 */
async function getAllImages(dir: string): Promise<string[]> {
    const images: string[] = [];
    if (!existsSync(dir)) return images;

    async function scan(current: string) {
        const entries = await readdir(current, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                await scan(fullPath);
            } else if (/\.(jpg|jpeg|png|webp)$/i.test(entry.name)) {
                images.push(fullPath);
            }
        }
    }

    await scan(dir);
    return images;
}

/**
 * Copy directory recursively
 */
async function copyDir(src: string, dest: string) {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await copyFile(srcPath, destPath);
        }
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    console.log(`\n📋 Organize Unused Images`);
    console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY RUN'}`);
    console.log(`Assets: ${args.assetsDir}`);
    if (args.apply) {
        console.log(`Backup: ${args.backupDir}\n`);
    } else {
        console.log(`(Backup will be created in apply mode)\n`);
    }

    const oldImagesDir = path.join(args.assetsDir, 'old_images');
    const imagesDir = path.join(args.assetsDir, 'images');
    const coversDir = path.join(imagesDir, 'covers');
    const coversUnusedDir = path.join(coversDir, 'unused');

    // Step 1: Check old_images structure
    if (!existsSync(oldImagesDir)) {
        console.error(`❌ old_images directory not found: ${oldImagesDir}`);
        process.exit(1);
    }

    const cartiUnused = path.join(oldImagesDir, 'carti', 'unused');
    const pierreUnused = path.join(oldImagesDir, 'pierre', 'unused');

    const cartiExists = existsSync(cartiUnused);
    const pierreExists = existsSync(pierreUnused);

    if (!cartiExists && !pierreExists) {
        console.error(`❌ No unused folders found in old_images/`);
        process.exit(1);
    }

    console.log(`📁 Found:`);
    if (cartiExists) {
        const files = await getAllImages(cartiUnused);
        console.log(`   - old_images/carti/unused/ (${files.length} images)`);
    }
    if (pierreExists) {
        const files = await getAllImages(pierreUnused);
        console.log(`   - old_images/pierre/unused/ (${files.length} images)`);
    }

    // Step 2: Create target directories
    const playboiCartiDir = path.join(imagesDir, 'playboi_carti');
    const playboiCartiUnused = path.join(playboiCartiDir, 'unused');
    const pierreBourneUnused = path.join(imagesDir, 'pierre_bourne', 'unused');

    console.log(`\n📋 Plan:`);
    console.log(`   1. Move old_images/carti/unused/ → images/playboi_carti/unused/`);
    console.log(`   2. Move old_images/pierre/unused/ → images/pierre_bourne/unused/`);
    console.log(`   3. Scan for duplicates across all image folders`);
    console.log(`   4. Move unique images from artist folders to images/covers/unused/`);

    if (!args.apply) {
        console.log(`\n🔍 DRY RUN - No files moved. Use --apply to perform operations.`);
        process.exit(0);
    }

    // Step 3: Create backup
    console.log(`\n💾 Creating backup...`);
    await mkdir(args.backupDir, { recursive: true });
    await copyDir(imagesDir, path.join(args.backupDir, 'images'));
    if (existsSync(oldImagesDir)) {
        await copyDir(oldImagesDir, path.join(args.backupDir, 'old_images'));
    }
    console.log(`   ✅ Backup created: ${args.backupDir}`);

    // Step 4: Move old_images to artist folders
    console.log(`\n📦 Moving old_images to artist folders...`);

    if (cartiExists) {
        await mkdir(playboiCartiUnused, { recursive: true });
        const files = await readdir(cartiUnused);
        for (const file of files) {
            const src = path.join(cartiUnused, file);
            const dest = path.join(playboiCartiUnused, file);
            const stats = await stat(src);
            if (stats.isFile()) {
                await copyFile(src, dest);
            }
        }
        console.log(`   ✅ Moved carti/unused/ → playboi_carti/unused/`);
    }

    if (pierreExists) {
        await mkdir(pierreBourneUnused, { recursive: true });
        const files = await readdir(pierreUnused);
        for (const file of files) {
            const src = path.join(pierreUnused, file);
            const dest = path.join(pierreBourneUnused, file);
            const stats = await stat(src);
            if (stats.isFile()) {
                await copyFile(src, dest);
            }
        }
        console.log(`   ✅ Moved pierre/unused/ → pierre_bourne/unused/`);
    }

    // Step 5: Build hash map of all images
    console.log(`\n🔍 Scanning for duplicates...`);
    const hashMap = new Map<string, string[]>(); // hash -> [file paths]

    // Scan covers (these are the "used" images)
    const coversImages = await getAllImages(coversDir);
    console.log(`   Scanning covers/ (${coversImages.length} images)...`);
    for (const img of coversImages) {
        const hash = await hashFile(img);
        if (!hashMap.has(hash)) {
            hashMap.set(hash, []);
        }
        hashMap.get(hash)!.push(img);
    }

    // Scan artist folders (excluding unused subfolders for now)
    const artistFolders = await readdir(imagesDir);
    for (const artist of artistFolders) {
        if (artist === 'covers' || artist === 'skimask.png') continue;
        const artistDir = path.join(imagesDir, artist);
        const stats = await stat(artistDir);
        if (!stats.isDirectory()) continue;

        const images = await getAllImages(artistDir);
        // Filter out unused subfolder for now
        const mainImages = images.filter((img) => !img.includes('/unused/'));
        if (mainImages.length > 0) {
            console.log(`   Scanning ${artist}/ (${mainImages.length} images)...`);
            for (const img of mainImages) {
                const hash = await hashFile(img);
                if (!hashMap.has(hash)) {
                    hashMap.set(hash, []);
                }
                hashMap.get(hash)!.push(img);
            }
        }
    }

    // Step 6: Identify unique images in artist folders (not in covers)
    console.log(`\n📊 Analyzing duplicates...`);
    const coversHashes = new Set<string>();
    for (const [hash, files] of hashMap.entries()) {
        if (files.some((f) => f.includes('/covers/'))) {
            coversHashes.add(hash);
        }
    }

    const uniqueInArtists: string[] = [];
    for (const [hash, files] of hashMap.entries()) {
        if (coversHashes.has(hash)) continue; // Skip if already in covers
        // Only consider files in artist folders (not unused subfolders)
        const artistFiles = files.filter(
            (f) => !f.includes('/covers/') && !f.includes('/unused/')
        );
        uniqueInArtists.push(...artistFiles);
    }

    console.log(`   Found ${uniqueInArtists.length} unique images in artist folders (not in covers)`);

    // Step 7: Move unique images to covers/unused/
    if (uniqueInArtists.length > 0) {
        await mkdir(coversUnusedDir, { recursive: true });
        console.log(`\n📦 Moving unique images to covers/unused/...`);
        let moved = 0;
        for (const img of uniqueInArtists) {
            const filename = path.basename(img);
            const dest = path.join(coversUnusedDir, filename);
            // Handle name conflicts
            let finalDest = dest;
            let counter = 1;
            while (existsSync(finalDest)) {
                const ext = path.extname(filename);
                const base = path.basename(filename, ext);
                finalDest = path.join(coversUnusedDir, `${base}_${counter}${ext}`);
                counter++;
            }
            await rename(img, finalDest);
            moved++;
            if (moved % 10 === 0) {
                console.log(`   Moved ${moved}/${uniqueInArtists.length}...`);
            }
        }
        console.log(`   ✅ Moved ${moved} unique images to covers/unused/`);
    }

    console.log(`\n✅ Done!`);
    console.log(`   Backup: ${args.backupDir}`);
    console.log(`   Unique images: ${coversUnusedDir}`);
    console.log(`\n📝 To revert:`);
    console.log(`   rm -rf ${imagesDir}`);
    console.log(`   mv ${path.join(args.backupDir, 'images')} ${imagesDir}`);

    process.exit(0);
}

main().catch((err) => {
    console.error('organize-unused-images error:', err);
    process.exit(1);
});

