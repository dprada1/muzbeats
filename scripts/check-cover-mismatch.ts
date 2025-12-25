import dotenv from 'dotenv';
import pool from '../server/src/config/database.js';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

dotenv.config();

async function checkCoverMismatch() {
    const coversDir = join(process.cwd(), 'server/public/assets/images/covers/used');
    
    // Get all beats from database
    const beats = await pool.query('SELECT id, title, cover_path FROM beats ORDER BY created_at');
    
    // Get all files in covers/used/
    const localFiles = new Set<string>();
    try {
        const files = await readdir(coversDir);
        for (const file of files) {
            if (file.endsWith('.webp')) {
                localFiles.add(file);
            }
        }
    } catch (error) {
        console.error('Error reading covers/used/ directory:', error);
        return;
    }
    
    console.log(`📊 Database: ${beats.rows.length} beats`);
    console.log(`📊 Local files: ${localFiles.size} files\n`);
    
    // Check which beats have covers
    const beatsWithCovers: string[] = [];
    const beatsWithoutCovers: string[] = [];
    const localFilesNotInDb: string[] = [];
    
    for (const beat of beats.rows) {
        const expectedFile = `${beat.id}.webp`;
        if (localFiles.has(expectedFile)) {
            beatsWithCovers.push(beat.id);
        } else {
            beatsWithoutCovers.push(beat.id);
            console.log(`❌ Missing: ${expectedFile} (${beat.title})`);
        }
    }
    
    // Check for local files not in DB
    for (const file of localFiles) {
        const beatId = file.replace('.webp', '');
        const exists = beats.rows.some(b => String(b.id) === beatId);
        if (!exists) {
            localFilesNotInDb.push(file);
        }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Beats with covers: ${beatsWithCovers.length}`);
    console.log(`   ❌ Beats without covers: ${beatsWithoutCovers.length}`);
    if (localFilesNotInDb.length > 0) {
        console.log(`   ⚠️  Local files not in DB: ${localFilesNotInDb.length}`);
        console.log(`      ${localFilesNotInDb.slice(0, 5).join(', ')}${localFilesNotInDb.length > 5 ? '...' : ''}`);
    }
    
    // Check specific beat
    const targetBeat = beats.rows.find(b => String(b.id) === 'fa17ccfb-9f5a-4c0f-a70b-2af3b16c0fd5');
    if (targetBeat) {
        console.log(`\n🔍 Target beat (fa17ccfb-9f5a-4c0f-a70b-2af3b16c0fd5):`);
        console.log(`   Title: ${targetBeat.title}`);
        console.log(`   Cover path: ${targetBeat.cover_path}`);
        console.log(`   Local file exists: ${localFiles.has('fa17ccfb-9f5a-4c0f-a70b-2af3b16c0fd5.webp') ? 'YES' : 'NO'}`);
    }
    
    await pool.end();
}

checkCoverMismatch().catch(console.error);

