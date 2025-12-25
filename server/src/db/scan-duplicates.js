const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

/**
 * Calculate MD5 hash of a file
 */
async function calculateHash(filePath) {
    const buffer = await readFile(filePath);
    return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Recursively find all .webp files in a directory
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
 * Scan for duplicates within a directory
 */
async function scanDuplicatesWithin(dir, label) {
    console.log(`\n🔍 Scanning for duplicates within ${label}...`);
    
    const files = await findWebpFiles(dir);
    console.log(`   Found ${files.length} files`);
    
    const hashMap = new Map();
    
    for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        const stats = await stat(filePath);
        
        try {
            const hash = await calculateHash(filePath);
            
            if (!hashMap.has(hash)) {
                hashMap.set(hash, []);
            }
            
            hashMap.get(hash).push({
                hash,
                filePath,
                size: stats.size,
            });
            
            if ((i + 1) % 50 === 0) {
                process.stdout.write(`   Processed ${i + 1}/${files.length} files...\r`);
            }
        } catch (error) {
            console.error(`\n   ⚠️  Error processing ${filePath}:`, error.message);
        }
    }
    
    console.log(`   ✅ Processed ${files.length} files`);
    
    // Filter to only duplicates (hash appears more than once)
    const duplicates = new Map();
    for (const [hash, fileList] of hashMap.entries()) {
        if (fileList.length > 1) {
            duplicates.set(hash, fileList);
        }
    }
    
    return duplicates;
}

/**
 * Scan for duplicates between two directories
 */
async function scanDuplicatesBetween(dir1, label1, dir2, label2) {
    console.log(`\n🔍 Scanning for duplicates between ${label1} and ${label2}...`);
    
    const files1 = await findWebpFiles(dir1);
    const files2 = await findWebpFiles(dir2);
    
    console.log(`   ${label1}: ${files1.length} files`);
    console.log(`   ${label2}: ${files2.length} files`);
    
    // Hash all files in dir1
    console.log(`   Hashing ${label1} files...`);
    const hashMap1 = new Map();
    
    for (let i = 0; i < files1.length; i++) {
        const filePath = files1[i];
        const stats = await stat(filePath);
        
        try {
            const hash = await calculateHash(filePath);
            
            if (!hashMap1.has(hash)) {
                hashMap1.set(hash, []);
            }
            
            hashMap1.get(hash).push({
                hash,
                filePath,
                size: stats.size,
            });
            
            if ((i + 1) % 50 === 0) {
                process.stdout.write(`   Processed ${i + 1}/${files1.length} files...\r`);
            }
        } catch (error) {
            console.error(`\n   ⚠️  Error processing ${filePath}:`, error.message);
        }
    }
    
    console.log(`   ✅ Processed ${files1.length} files from ${label1}`);
    
    // Hash files in dir2 and check against dir1
    console.log(`   Hashing ${label2} files and comparing...`);
    const sharedDuplicates = new Map();
    
    for (let i = 0; i < files2.length; i++) {
        const filePath = files2[i];
        const stats = await stat(filePath);
        
        try {
            const hash = await calculateHash(filePath);
            
            if (hashMap1.has(hash)) {
                // This file exists in both directories
                if (!sharedDuplicates.has(hash)) {
                    sharedDuplicates.set(hash, {
                        used: hashMap1.get(hash),
                        unused: [],
                    });
                }
                
                sharedDuplicates.get(hash).unused.push({
                    hash,
                    filePath,
                    size: stats.size,
                });
            }
            
            if ((i + 1) % 50 === 0) {
                process.stdout.write(`   Processed ${i + 1}/${files2.length} files...\r`);
            }
        } catch (error) {
            console.error(`\n   ⚠️  Error processing ${filePath}:`, error.message);
        }
    }
    
    console.log(`   ✅ Processed ${files2.length} files from ${label2}`);
    
    return sharedDuplicates;
}

/**
 * Generate a report of duplicates
 */
function generateReport(withinUnused, betweenUsedAndUnused) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 DUPLICATE SCAN REPORT');
    console.log('='.repeat(80));
    
    // Report 1: Duplicates within unused/
    console.log('\n1️⃣  DUPLICATES WITHIN unused/ (same file in multiple artist folders):');
    console.log('   ' + '-'.repeat(76));
    
    if (withinUnused.size === 0) {
        console.log('   ✅ No duplicates found within unused/');
    } else {
        let totalDuplicateFiles = 0;
        let totalWastedSpace = 0;
        
        for (const [hash, files] of withinUnused.entries()) {
            const uniqueCount = files.length;
            const wastedSpace = files[0].size * (uniqueCount - 1);
            totalDuplicateFiles += uniqueCount - 1; // Keep 1, remove the rest
            totalWastedSpace += wastedSpace;
            
            console.log(`\n   Hash: ${hash.substring(0, 16)}...`);
            console.log(`   Found ${uniqueCount} copies (can remove ${uniqueCount - 1})`);
            console.log(`   Size per file: ${(files[0].size / 1024).toFixed(2)} KB`);
            console.log(`   Wasted space: ${(wastedSpace / 1024).toFixed(2)} KB`);
            console.log(`   Files:`);
            files.forEach((f, idx) => {
                const relPath = f.filePath.replace(process.cwd() + '/', '');
                console.log(`     ${idx + 1}. ${relPath}`);
            });
        }
        
        console.log(`\n   📈 Summary:`);
        console.log(`      Total duplicate groups: ${withinUnused.size}`);
        console.log(`      Files that can be removed: ${totalDuplicateFiles}`);
        console.log(`      Space that can be freed: ${(totalWastedSpace / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Report 2: Duplicates between used/ and unused/
    console.log('\n\n2️⃣  DUPLICATES BETWEEN used/ AND unused/ (files already in used/):');
    console.log('   ' + '-'.repeat(76));
    
    if (betweenUsedAndUnused.size === 0) {
        console.log('   ✅ No duplicates found between used/ and unused/');
    } else {
        let totalFilesToRemove = 0;
        let totalSpaceToFree = 0;
        
        for (const [hash, { used, unused }] of betweenUsedAndUnused.entries()) {
            totalFilesToRemove += unused.length;
            totalSpaceToFree += unused.reduce((sum, f) => sum + f.size, 0);
            
            console.log(`\n   Hash: ${hash.substring(0, 16)}...`);
            console.log(`   Found in used/: ${used.length} file(s)`);
            console.log(`   Found in unused/: ${unused.length} file(s) (can remove all)`);
            console.log(`   Size per file: ${(unused[0].size / 1024).toFixed(2)} KB`);
            console.log(`   Used file(s):`);
            used.forEach((f, idx) => {
                const relPath = f.filePath.replace(process.cwd() + '/', '');
                console.log(`     ${idx + 1}. ${relPath}`);
            });
            console.log(`   Unused file(s) to remove:`);
            unused.forEach((f, idx) => {
                const relPath = f.filePath.replace(process.cwd() + '/', '');
                console.log(`     ${idx + 1}. ${relPath}`);
            });
        }
        
        console.log(`\n   📈 Summary:`);
        console.log(`      Total duplicate groups: ${betweenUsedAndUnused.size}`);
        console.log(`      Files in unused/ that can be removed: ${totalFilesToRemove}`);
        console.log(`      Space that can be freed: ${(totalSpaceToFree / 1024 / 1024).toFixed(2)} MB`);
    }
    
    console.log('\n' + '='.repeat(80));
}

/**
 * Main execution
 */
async function main() {
    const coversDir = path.join(process.cwd(), 'server/public/assets/images/covers');
    const usedDir = path.join(coversDir, 'used');
    const unusedDir = path.join(coversDir, 'unused_copy'); // Test on copy first
    
    console.log('🚀 Starting duplicate scan on unused_copy/...');
    console.log(`   Used dir: ${usedDir}`);
    console.log(`   Unused dir: ${unusedDir}`);
    
    try {
        // Scan 1: Duplicates within unused_copy/
        const withinUnused = await scanDuplicatesWithin(unusedDir, 'unused_copy/');
        
        // Scan 2: Duplicates between used/ and unused_copy/
        const betweenUsedAndUnused = await scanDuplicatesBetween(
            usedDir,
            'used/',
            unusedDir,
            'unused_copy/'
        );
        
        // Generate report
        generateReport(withinUnused, betweenUsedAndUnused);
        
        console.log('\n✅ Scan complete! Review the report above.');
        console.log('   If results look good, we can apply removal to the real unused/ folder.');
        
    } catch (error) {
        console.error('\n❌ Error during scan:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

