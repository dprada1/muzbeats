const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

/**
 * Calculate MD5 hash of a file
 */
async function calculateHash(filePath) {
    const buffer = await readFile(filePath);
    return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Find all .webp files in a directory
 */
async function findWebpFiles(dir) {
    const files = [];
    
    async function walk(currentDir) {
        const entries = await readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            
            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.webp')) {
                files.push(fullPath);
            }
        }
    }
    
    await walk(dir);
    return files;
}

/**
 * Group files by their artist folder
 */
function groupByArtistFolder(files) {
    const groups = new Map();
    
    for (const file of files) {
        // Extract artist folder name (e.g., "ken_carson" from "unused/ken_carson/39.webp")
        const parts = file.split(path.sep);
        const unusedIndex = parts.findIndex(p => p === 'unused' || p === 'unused_copy');
        
        if (unusedIndex !== -1 && unusedIndex + 1 < parts.length) {
            const artist = parts[unusedIndex + 1];
            if (!groups.has(artist)) {
                groups.set(artist, []);
            }
            groups.get(artist).push(file);
        }
    }
    
    return groups;
}

/**
 * Find and remove duplicates within each artist folder
 */
async function removeDuplicatesWithinArtistFolders(unusedDir) {
    console.log('🔍 Scanning for duplicates within each artist folder...\n');
    
    const allFiles = await findWebpFiles(unusedDir);
    console.log(`   Found ${allFiles.length} total files`);
    
    // Group files by artist folder
    const artistGroups = groupByArtistFolder(allFiles);
    console.log(`   Found ${artistGroups.size} artist folders\n`);
    
    const filesToDelete = [];
    let totalDuplicatesFound = 0;
    
    // Process each artist folder separately
    for (const [artist, files] of artistGroups.entries()) {
        console.log(`   Processing ${artist}/...`);
        
        // Calculate hashes for all files in this artist folder
        const hashMap = new Map();
        
        for (const filePath of files) {
            try {
                const hash = await calculateHash(filePath);
                
                if (!hashMap.has(hash)) {
                    hashMap.set(hash, []);
                }
                
                hashMap.get(hash).push(filePath);
            } catch (error) {
                console.error(`     ⚠️  Error hashing ${filePath}:`, error.message);
            }
        }
        
        // Find duplicates (hash appears more than once)
        for (const [hash, fileList] of hashMap.entries()) {
            if (fileList.length > 1) {
                totalDuplicatesFound += fileList.length - 1;
                
                // Keep the first file, mark the rest for deletion
                const [keepFile, ...duplicates] = fileList;
                
                console.log(`     Found ${fileList.length} copies of same file:`);
                console.log(`       Keep: ${path.basename(keepFile)}`);
                
                for (const dup of duplicates) {
                    filesToDelete.push(dup);
                    console.log(`       Delete: ${path.basename(dup)}`);
                }
            }
        }
    }
    
    console.log(`\n   📊 Summary:`);
    console.log(`      Duplicate groups found: ${filesToDelete.length > 0 ? 'Yes' : 'No'}`);
    console.log(`      Files to delete: ${filesToDelete.length}`);
    
    if (filesToDelete.length === 0) {
        console.log('\n   ✅ No duplicates found within artist folders!');
        return;
    }
    
    // Delete the duplicate files
    console.log(`\n🗑️  Deleting ${filesToDelete.length} duplicate files...\n`);
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const filePath of filesToDelete) {
        try {
            await unlink(filePath);
            deletedCount++;
            const relPath = filePath.replace(process.cwd() + '/', '');
            console.log(`   ✅ Deleted: ${relPath}`);
        } catch (error) {
            errorCount++;
            console.error(`   ❌ Error deleting ${filePath}:`, error.message);
        }
    }
    
    console.log(`\n   📈 Deletion Summary:`);
    console.log(`      Successfully deleted: ${deletedCount}`);
    console.log(`      Errors: ${errorCount}`);
    
    // Calculate space freed
    let totalSize = 0;
    for (const filePath of filesToDelete) {
        try {
            const stats = await stat(filePath);
            totalSize += stats.size;
        } catch {
            // File already deleted, skip
        }
    }
    
    console.log(`      Space freed: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Main execution
 */
async function main() {
    const projectRoot = path.join(process.cwd(), '..');
    const unusedDir = path.join(projectRoot, 'server/public/assets/images/covers/unused');
    
    console.log('🚀 Removing duplicates within artist folders...');
    console.log(`   Target: ${unusedDir}\n`);
    
    try {
        await removeDuplicatesWithinArtistFolders(unusedDir);
        console.log('\n✅ Duplicate removal complete!');
        console.log('   Review the results above. If everything looks good,');
        console.log('   we can apply the same removal to the real unused/ folder.');
    } catch (error) {
        console.error('\n❌ Error during removal:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

