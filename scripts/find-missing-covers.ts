import dotenv from 'dotenv';
import { readdir } from 'fs/promises';
import { join } from 'path';
import pool from '../server/src/config/database.js';

dotenv.config();

async function findMissingCovers() {
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
    
    // Find beats without covers
    const beatsWithoutCovers: Array<{ id: string; title: string; cover_path: string }> = [];
    
    for (const beat of beats.rows) {
        const expectedFile = `${beat.id}.webp`;
        if (!localFiles.has(expectedFile)) {
            beatsWithoutCovers.push({
                id: beat.id,
                title: beat.title,
                cover_path: beat.cover_path,
            });
        }
    }
    
    if (beatsWithoutCovers.length === 0) {
        console.log('✅ All beats have cover images!');
    } else {
        console.log(`❌ ${beatsWithoutCovers.length} beats are missing cover images:\n`);
        for (const beat of beatsWithoutCovers) {
            console.log(`   - ${beat.title} (${beat.id})`);
            console.log(`     Current cover_path: ${beat.cover_path || 'NULL'}`);
        }
        
        console.log(`\n💡 To fix: Set cover_path to NULL for these beats:`);
        console.log(`   UPDATE beats SET cover_path = NULL WHERE id IN (`);
        console.log(`     ${beatsWithoutCovers.map(b => `'${b.id}'`).join(',\n     ')}`);
        console.log(`   );`);
    }
    
}

findMissingCovers().catch(console.error);

