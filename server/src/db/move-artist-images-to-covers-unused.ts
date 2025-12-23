/**
 * Move unique images from artist folders to covers/unused/{artist}/.
 *
 * This script:
 * 1. Scans artist folders for duplicates of images in covers/ (the 90 used ones)
 * 2. Removes duplicates from artist folders
 * 3. Moves remaining unique images to covers/unused/{artist}/ (preserving artist organization)
 *
 * This keeps artist organization for easy browsing when creating new beats.
 *
 * Usage:
 *   tsx src/db/move-artist-images-to-covers-unused.ts --dry-run
 *   tsx src/db/move-artist-images-to-covers-unused.ts --apply
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { readdir, stat, rename, mkdir, readFile, unlink, copyFile } from 'fs/promises';
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
        backupDir: path.join(__dirname, '../../public/assets/_backup_move_artist_' + Date.now()),
    };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--apply') out.apply = true;
        else if (a === '--dry-run') out.apply = false;
        else if (a === '--assets') out.assetsDir = argv[++i] || out.assetsDir;
        else if (a === '--backup') out.backupDir = argv[++i] || out.backupDir;
        else if (a === '--help' || a === '-h') {
            console.log(`
Move unique images from artist folders to covers/unused/{artist}/.

Usage:
  tsx src/db/move-artist-images-to-covers-unused.ts [--dry-run|--apply]

What it does:
  1. Scans artist folders for duplicates of images in covers/ (90 used ones)
  2. Removes duplicates from artist folders
  3. Moves remaining unique images to covers/unused/{artist}/ (preserving artist organization)
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
            // Skip unused subfolders if excludeUnused is true
            if (excludeUnused && entry.name === 'unused') continue;
            // Recursively scan subdirectories (but still exclude unused)
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

    console.log(`\n📋 Move Artist Images to covers/unused/{artist}/`);
    console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY RUN'}`);
    console.log(`Assets: ${args.assetsDir}`);
    if (args.apply) {
        console.log(`Backup: ${args.backupDir}\n`);
    } else {
        console.log(`(Backup will be created in apply mode)\n`);
    }

    const imagesDir = path.join(args.assetsDir, 'images');
    const coversDir = path.join(imagesDir, 'covers');
    const coversUnusedDir = path.join(coversDir, 'unused');

    // Step 1: Build hash set of used covers (the 90 UUID files)
    console.log(`🔍 Scanning used covers...`);
    const usedCovers = await getImagesInDir(coversDir, false); // Include all in covers/
    const usedCoversHashes = new Set<string>();
    const usedCoversMap = new Map<string, string>(); // hash -> filepath

    for (const img of usedCovers) {
        // Skip unused subfolder
        if (img.includes('/unused/')) continue;
        const hash = await hashFile(img);
        usedCoversHashes.add(hash);
        usedCoversMap.set(hash, img);
    }

    console.log(`   Found ${usedCoversHashes.size} used covers (excluding unused/)`);

    // Step 2: Scan artist folders (including unused subfolders)
    console.log(`\n🔍 Scanning artist folders...`);
    const artistFolders = await readdir(imagesDir);
    const artistImages: Map<string, string[]> = new Map(); // artist -> [image paths]
    const artistUnusedFolders: Map<string, string> = new Map(); // artist -> unused folder path

    for (const artist of artistFolders) {
        if (artist === 'covers' || artist === 'skimask.png') continue;
        const artistDir = path.join(imagesDir, artist);
        const stats = await stat(artistDir);
        if (!stats.isDirectory()) continue;

        // Check for unused subfolder
        const unusedSubfolder = path.join(artistDir, 'unused');
        if (existsSync(unusedSubfolder)) {
            const unusedImages = await getImagesInDir(unusedSubfolder, false);
            if (unusedImages.length > 0) {
                artistUnusedFolders.set(artist, unusedSubfolder);
                console.log(`   ${artist}/unused/: ${unusedImages.length} images`);
            }
        }

        // Check for images in main artist folder (excluding unused)
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
        if (duplicates.length > 0) {
            console.log(`   ${artist}: ${images.length - unique.length} duplicates, ${unique.length} unique`);
        }
    }

    const totalDuplicates = duplicates.length;
    const totalUnique = Array.from(uniqueImages.values()).reduce((sum, arr) => sum + arr.length, 0);

    console.log(`\n📊 Summary:`);
    console.log(`   Duplicates (will be deleted): ${totalDuplicates}`);
    console.log(`   Unique images (will be moved): ${totalUnique}`);

    if (!args.apply) {
        console.log(`\n🔍 DRY RUN - No files moved. Use --apply to perform operations.`);
        console.log(`\nPlanned moves:`);
        if (totalUnique > 0) {
            for (const [artist, images] of uniqueImages.entries()) {
                if (images.length > 0) {
                    console.log(`   ${artist}/ → covers/unused/${artist}/ (${images.length} images)`);
                }
            }
        }
        if (artistUnusedFolders.size > 0) {
            for (const [artist, unusedFolder] of artistUnusedFolders.entries()) {
                const images = await getImagesInDir(unusedFolder, false);
                console.log(`   ${artist}/unused/ → covers/unused/${artist}/ (${images.length} images)`);
            }
        }
        const existingMixed = await getImagesInDir(coversUnusedDir, false);
        const mixedCount = existingMixed.filter((img) => {
            const relPath = path.relative(coversUnusedDir, img);
            return !relPath.includes('/') || relPath.startsWith('_');
        }).length;
        if (mixedCount > 0) {
            console.log(`   covers/unused/ (${mixedCount} mixed images) → covers/unused/_mixed/`);
        }
        process.exit(0);
    }

    // Step 4: Create backup
    console.log(`\n💾 Creating backup...`);
    await mkdir(args.backupDir, { recursive: true });
    // Simple backup - just copy the images directory structure
    const backupImagesDir = path.join(args.backupDir, 'images');
    await mkdir(backupImagesDir, { recursive: true });
    
    // Copy artist folders
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
    
    for (const artist of artistImages.keys()) {
        const src = path.join(imagesDir, artist);
        const dest = path.join(backupImagesDir, artist);
        if (existsSync(src)) {
            await copyDir(src, dest);
        }
    }
    console.log(`   ✅ Backup created: ${args.backupDir}`);

    // Step 5: Delete duplicates
    console.log(`\n🗑️  Deleting duplicates...`);
    let deleted = 0;
    for (const img of duplicates) {
        await unlink(img);
        deleted++;
        if (deleted % 10 === 0) {
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
            if (moved % 50 === 0) {
                console.log(`   Moved ${moved}/${totalUnique}...`);
            }
        }
        if (images.length > 0) {
            console.log(`   ✅ ${artist}: moved ${images.length} images to covers/unused/${artist}/`);
        }
    }

    // Step 6a: Move existing mixed images in covers/unused/ to _mixed/ subfolder
    const existingMixedImages = await getImagesInDir(coversUnusedDir, false);
    const mixedImages = existingMixedImages.filter((img) => {
        // Exclude any that are already in artist subfolders
        const relPath = path.relative(coversUnusedDir, img);
        return !relPath.includes('/') || relPath.startsWith('_');
    });
    
    if (mixedImages.length > 0) {
        console.log(`\n📦 Organizing ${mixedImages.length} mixed images in covers/unused/...`);
        const mixedDir = path.join(coversUnusedDir, '_mixed');
        await mkdir(mixedDir, { recursive: true });
        
        for (const img of mixedImages) {
            const filename = path.basename(img);
            const dest = path.join(mixedDir, filename);
            
            // Handle name conflicts
            let finalDest = dest;
            let counter = 1;
            while (existsSync(finalDest)) {
                const ext = path.extname(filename);
                const base = path.basename(filename, ext);
                finalDest = path.join(mixedDir, `${base}_${counter}${ext}`);
                counter++;
            }
            
            await rename(img, finalDest);
        }
        console.log(`   ✅ Moved ${mixedImages.length} mixed images to covers/unused/_mixed/`);
    }

    // Step 6b: Move artist/unused/ folders to covers/unused/{artist}/
    if (artistUnusedFolders.size > 0) {
        console.log(`\n📦 Moving artist/unused/ folders to covers/unused/{artist}/...`);
        for (const [artist, unusedFolder] of artistUnusedFolders.entries()) {
            const targetDir = path.join(coversUnusedDir, artist);
            await mkdir(targetDir, { recursive: true });

            const unusedImages = await getImagesInDir(unusedFolder, false);
            for (const img of unusedImages) {
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
            }
            console.log(`   ✅ ${artist}/unused/ → covers/unused/${artist}/ (${unusedImages.length} images)`);
            
            // Try to remove empty unused folder
            try {
                const remaining = await readdir(unusedFolder);
                if (remaining.length === 0 || (remaining.length === 1 && remaining[0] === '.DS_Store')) {
                    await unlink(path.join(unusedFolder, '.DS_Store')).catch(() => {});
                    // Note: We'll keep the unused/ folder structure for now
                }
            } catch {}
        }
    }

    // Step 7: Clean up empty artist folders (but keep unused subfolders)
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
            // Folder is empty, but we'll keep it for now (user might want to keep structure)
            console.log(`   ${artist}/ is now empty (keeping folder structure)`);
        }
    }

    console.log(`\n✅ Done!`);
    console.log(`   Backup: ${args.backupDir}`);
    console.log(`   Unique images organized in: ${coversUnusedDir}/{artist}/`);
    console.log(`\n📝 Final structure:`);
    console.log(`   covers/{uuid}.webp - Used covers (90)`);
    console.log(`   covers/unused/{artist}/ - Unique unused images organized by artist`);
    console.log(`   {artist}/unused/ - Images from old_images (kept for now)`);

    process.exit(0);
}

main().catch((err) => {
    console.error('move-artist-images-to-covers-unused error:', err);
    process.exit(1);
});

