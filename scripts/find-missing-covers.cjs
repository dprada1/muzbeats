#!/usr/bin/env node
/**
 * Find beats that don't have cover images locally
 * Usage: DATABASE_URL=<your_url> node scripts/find-missing-covers.cjs
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL environment variable not set');
        console.error('');
        console.error('Usage:');
        console.error('  DATABASE_URL=<your_url> node scripts/find-missing-covers.cjs');
        process.exit(1);
    }

    const pool = new Pool({ connectionString: databaseUrl });
    const coversDir = path.join(__dirname, '../server/public/assets/images/covers/used');

    // Get all local cover files
    const localFiles = new Set();
    try {
        const files = fs.readdirSync(coversDir);
        for (const file of files) {
            if (file.endsWith('.webp')) {
                localFiles.add(file.replace('.webp', ''));
            }
        }
    } catch (error) {
        console.error('❌ Error reading covers directory:', error.message);
        await pool.end();
        process.exit(1);
    }

    console.log(`📊 Local cover files: ${localFiles.size}`);
    console.log('');

    // Get all beats from database
    const result = await pool.query('SELECT id, title FROM beats ORDER BY created_at DESC');
    console.log(`📊 Database beats: ${result.rows.length}`);
    console.log('');

    // Find beats without covers
    const missingCovers = [];
    for (const beat of result.rows) {
        if (!localFiles.has(beat.id)) {
            missingCovers.push(beat);
        }
    }

    if (missingCovers.length === 0) {
        console.log('✅ All beats have cover images!');
    } else {
        console.log(`❌ ${missingCovers.length} beats are missing cover images:`);
        console.log('');
        for (const beat of missingCovers) {
            console.log(`   - ${beat.title}`);
            console.log(`     ID: ${beat.id}`);
        }

        console.log('');
        console.log('📝 To fix, set cover_path to NULL for these beats:');
        console.log('');
        console.log('UPDATE beats SET cover_path = NULL WHERE id IN (');
        console.log(missingCovers.map(b => `  '${b.id}'`).join(',\n'));
        console.log(');');
    }

    await pool.end();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});

