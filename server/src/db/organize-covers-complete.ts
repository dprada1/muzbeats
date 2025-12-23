/**
 * Complete cover organization: move used covers to covers/used/ and organize unused by artist.
 *
 * This script:
 * 1. Moves 90 used covers from covers/ to covers/used/
 * 2. Updates database cover_path values
 * 3. Organizes unused images by artist in covers/unused/{artist}/
 * 4. Moves mixed images to covers/unused/_mixed/
 *
 * Usage:
 *   tsx src/db/organize-covers-complete.ts --dry-run
 *   tsx src/db/organize-covers-complete.ts --apply
 *
 * After running, you'll need to:
 *   - Re-upload covers/used/ to R2 at images/covers/used/
 *   - Delete old covers from R2 at images/covers/ (the 90 UUID files)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdir, stat, rename, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import pool from '@/config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Args = {
    apply: boolean;
    assetsDir: string;
    backupDir: string;
    updateDb: boolean;
};

function parseArgs(argv: string[]): Args {
    const out: Args = {
        apply: false,
        assetsDir: path.join(__dirname, '../../public/assets'),
        backupDir: path.join(__dirname, '../../public/assets/_backup_organize_complete_' + Date.now()),
        updateDb: true,
    };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--apply') out.apply = true;
        else if (a === '--dry-run') out.apply = false;
        else if (a === '--no-db') out.updateDb = false;
        else if (a === '--assets') out.assetsDir = argv[++i] || out.assetsDir;
        else if (a === '--backup') out.backupDir = argv[++i] || out.backupDir;
        else if (a === '--help' || a === '-h') {
            console.log(`
Complete cover organization.

Usage:
  tsx src/db/organize-covers-complete.ts [--dry-run|--apply] [--no-db]

Options:
  --apply      Perform file operations (default: dry-run)
  --no-db      Skip database updates (for testing)
  --assets     Assets directory (default: public/assets)
  --backup     Backup directory (default: public/assets/_backup_organize_complete_<timestamp>)

What it does:
  1. Moves covers/{uuid}.webp → covers/used/{uuid}.webp
  2. Updates database cover_path values
  3. Organizes unused images by artist
  4. Moves mixed images to _mixed/

After running, re-upload covers/used/ to R2.
`);
            process.exit(0);
        }
    }

    return out;
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
            if (excludeUnused && (entry.name === 'unused' || entry.name === 'used')) continue;
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

    console.log(`\n📋 Complete Cover Organization`);
    console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY RUN'}`);
    console.log(`Assets: ${args.assetsDir}`);
    console.log(`Update DB: ${args.updateDb ? 'Yes' : 'No'}`);
    if (args.apply) {
        console.log(`Backup: ${args.backupDir}\n`);
    } else {
        console.log(`(Backup will be created in apply mode)\n`);
    }

    const imagesDir = path.join(args.assetsDir, 'images');
    const coversDir = path.join(imagesDir, 'covers');
    const coversUsedDir = path.join(coversDir, 'used');
    const coversUnusedDir = path.join(coversDir, 'unused');

    // Step 1: Find used covers (UUID files in covers/)
    console.log(`🔍 Scanning used covers...`);
    const usedCovers = await getImagesInDir(coversDir, false);
    const uuidCovers = usedCovers.filter((img) => {
        const filename = path.basename(img);
        // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.webp
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i.test(filename);
    });

    console.log(`   Found ${uuidCovers.length} used covers (UUID files)`);

    // Step 2: Find artist unused folders
    console.log(`\n🔍 Scanning artist folders...`);
    const artistUnusedFolders: Map<string, string> = new Map(); // artist -> unused folder path

    const artistFolders = await readdir(imagesDir);
    for (const artist of artistFolders) {
        if (artist === 'covers' || artist === 'skimask.png') continue;
        const artistDir = path.join(imagesDir, artist);
        const stats = await stat(artistDir);
        if (!stats.isDirectory()) continue;

        const unusedSubfolder = path.join(artistDir, 'unused');
        if (existsSync(unusedSubfolder)) {
            const unusedImages = await getImagesInDir(unusedSubfolder, false);
            if (unusedImages.length > 0) {
                artistUnusedFolders.set(artist, unusedSubfolder);
                console.log(`   ${artist}/unused/: ${unusedImages.length} images`);
            }
        }
    }

    // Step 3: Check existing mixed images in covers/unused/
    const existingMixedImages = await getImagesInDir(coversUnusedDir, false);
    const mixedImages = existingMixedImages.filter((img) => {
        const relPath = path.relative(coversUnusedDir, img);
        return !relPath.includes('/') || relPath.startsWith('_');
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Used covers to move: ${uuidCovers.length}`);
    console.log(`   Artist unused folders: ${artistUnusedFolders.size}`);
    console.log(`   Mixed images to organize: ${mixedImages.length}`);

    if (!args.apply) {
        console.log(`\n🔍 DRY RUN - No files moved. Use --apply to perform operations.`);
        console.log(`\nPlanned operations:`);
        console.log(`   1. Move ${uuidCovers.length} covers → covers/used/`);
        if (args.updateDb) {
            console.log(`   2. Update database: /assets/images/covers/{uuid}.webp → /assets/images/covers/used/{uuid}.webp`);
        }
        for (const [artist, unusedFolder] of artistUnusedFolders.entries()) {
            const images = await getImagesInDir(unusedFolder, false);
            console.log(`   3. Move ${artist}/unused/ → covers/unused/${artist}/ (${images.length} images)`);
        }
        if (mixedImages.length > 0) {
            console.log(`   4. Move ${mixedImages.length} mixed images → covers/unused/_mixed/`);
        }
        process.exit(0);
    }

    // Step 4: Create backup
    console.log(`\n💾 Creating backup...`);
    await mkdir(args.backupDir, { recursive: true });
    const { execSync } = await import('child_process');
    execSync(`cp -r "${coversDir}" "${path.join(args.backupDir, 'covers')}"`, { stdio: 'ignore' });
    console.log(`   ✅ Backup created: ${args.backupDir}`);

    // Step 5: Move used covers to covers/used/
    console.log(`\n📦 Moving used covers to covers/used/...`);
    await mkdir(coversUsedDir, { recursive: true });
    const movedCovers: Array<{ uuid: string }> = [];

    for (const cover of uuidCovers) {
        const filename = path.basename(cover);
        const uuid = filename.replace('.webp', '');
        const newPath = path.join(coversUsedDir, filename);
        await rename(cover, newPath);
        movedCovers.push({ uuid });
    }

    console.log(`   ✅ Moved ${movedCovers.length} covers to covers/used/`);

    // Step 6: Update database
    if (args.updateDb) {
        console.log(`\n💾 Updating database...`);
        let updated = 0;
        for (const { uuid } of movedCovers) {
            const newCoverPath = `/assets/images/covers/used/${uuid}.webp`;
            const result = await pool.query(
                'UPDATE beats SET cover_path = $1, updated_at = NOW() WHERE cover_path = $2',
                [newCoverPath, `/assets/images/covers/${uuid}.webp`]
            );
            if (result.rowCount && result.rowCount > 0) {
                updated++;
            }
        }
        console.log(`   ✅ Updated ${updated} database records`);
    }

    // Step 7: Move artist unused folders to covers/unused/{artist}/
    if (artistUnusedFolders.size > 0) {
        console.log(`\n📦 Moving artist unused folders...`);
        for (const [artist, unusedFolder] of artistUnusedFolders.entries()) {
            const targetDir = path.join(coversUnusedDir, artist);
            await mkdir(targetDir, { recursive: true });

            const unusedImages = await getImagesInDir(unusedFolder, false);
            for (const img of unusedImages) {
                const filename = path.basename(img);
                const dest = path.join(targetDir, filename);
                
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
        }
    }

    // Step 8: Organize mixed images
    if (mixedImages.length > 0) {
        console.log(`\n📦 Organizing mixed images...`);
        const mixedDir = path.join(coversUnusedDir, '_mixed');
        await mkdir(mixedDir, { recursive: true });
        
        for (const img of mixedImages) {
            const filename = path.basename(img);
            const dest = path.join(mixedDir, filename);
            
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

    console.log(`\n✅ Done!`);
    console.log(`   Backup: ${args.backupDir}`);
    console.log(`\n📝 Final structure:`);
    console.log(`   covers/used/{uuid}.webp - ${movedCovers.length} used covers`);
    console.log(`   covers/unused/{artist}/ - Unused images organized by artist`);
    console.log(`   covers/unused/_mixed/ - ${mixedImages.length} mixed images`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Upload covers/used/ to R2: aws s3 sync covers/used/ s3://muzbeats-media-public/images/covers/used/ --endpoint-url ...`);
    console.log(`   2. Delete old covers from R2: aws s3 rm s3://muzbeats-media-public/images/covers/ --recursive --exclude "unused/*" --endpoint-url ...`);
    console.log(`   3. Verify in staging/production`);

    process.exit(0);
}

main().catch((err) => {
    console.error('organize-covers-complete error:', err);
    process.exit(1);
});

