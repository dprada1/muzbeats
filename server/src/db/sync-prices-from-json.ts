/**
 * Script to sync prices from data.json to the database
 *
 * This script reads prices from data.json and updates the database
 * to match. Useful when data.json is the source of truth.
 *
 * Usage:
 * npx tsx src/db/sync-prices-from-json.ts
 *
 * This will:
 * 1. Read all beats from data.json
 * 2. Update database prices to match data.json prices
 * 3. Report any beats that don't exist in the database
 */

import dotenv from 'dotenv';
import pool from '../config/database.js';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Beat } from '../types/Beat.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE_PATH = path.join(__dirname, '../../public/assets/data.json');

async function syncPricesFromJson() {
    try {
        console.log('📖 Reading beats from data.json...');
        const fileContent = await readFile(DATA_FILE_PATH, 'utf-8');
        const beats: Beat[] = JSON.parse(fileContent);
        console.log(`✅ Found ${beats.length} beats in data.json\n`);

        let updated = 0;
        let notFound = 0;
        const notFoundBeats: string[] = [];

        for (const beat of beats) {
            try {
                const result = await pool.query(
                    'UPDATE beats SET price = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
                    [beat.price, beat.id]
                );

                if (result.rowCount === 0) {
                    notFound++;
                    notFoundBeats.push(`${beat.title} (${beat.id})`);
                } else {
                    updated++;
                }
            } catch (error: any) {
                console.error(`❌ Error updating beat "${beat.title}":`, error.message);
            }
        }

        console.log(`\n📊 Sync Results:`);
        console.log(`   ✅ Updated: ${updated} beats`);
        if (notFound > 0) {
            console.log(`   ⚠️  Not found in database: ${notFound} beats`);
            console.log(`\n   Beats not found:`);
            notFoundBeats.forEach((beat) => console.log(`      - ${beat}`));
        }

        // Verify final prices
        console.log(`\n🔍 Verifying prices...`);
        const verifyStats = await pool.query(`
            SELECT 
                MIN(price) as min_price,
                MAX(price) as max_price,
                AVG(price) as avg_price,
                COUNT(*) as total_beats
            FROM beats
        `);
        const stats = verifyStats.rows[0];
        console.log(`   Min: $${stats.min_price}`);
        console.log(`   Max: $${stats.max_price}`);
        console.log(`   Avg: $${parseFloat(stats.avg_price).toFixed(2)}`);
        console.log(`   Total beats: ${stats.total_beats}`);

        console.log(`\n✅ Price sync complete!`);
        await pool.end();
    } catch (error: any) {
        console.error('❌ Error syncing prices:', error.message);
        if (error.detail) {
            console.error('   Detail:', error.detail);
        }
        await pool.end();
        process.exit(1);
    }
}

syncPricesFromJson();

