/**
 * Script to update all prices in data.json to 19.99
 *
 * Usage:
 * npx tsx src/db/update-json-prices.ts
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE_PATH = path.join(__dirname, '../../public/assets/data.json');

async function updateJsonPrices() {
    try {
        console.log('📖 Reading data.json...');
        const fileContent = await readFile(DATA_FILE_PATH, 'utf-8');
        const beats: any[] = JSON.parse(fileContent);
        
        console.log(`✅ Found ${beats.length} beats`);
        
        let updated = 0;
        for (const beat of beats) {
            if (beat.price !== 19.99) {
                beat.price = 19.99;
                updated++;
            }
        }
        
        console.log(`🔄 Updating ${updated} beats to $19.99...`);
        
        await writeFile(DATA_FILE_PATH, JSON.stringify(beats, null, 2) + '\n', 'utf-8');
        
        console.log(`✅ Successfully updated data.json`);
        console.log(`   Total beats: ${beats.length}`);
        console.log(`   Updated: ${updated}`);
        console.log(`   Already correct: ${beats.length - updated}`);
        
        // Verify
        const verifyContent = await readFile(DATA_FILE_PATH, 'utf-8');
        const verifyBeats: any[] = JSON.parse(verifyContent);
        const allCorrect = verifyBeats.every(beat => beat.price === 19.99);
        
        if (allCorrect) {
            console.log(`\n✅ Verification passed: All beats are now $19.99`);
        } else {
            console.error(`\n❌ Verification failed: Some beats still have incorrect prices`);
        }
    } catch (error: any) {
        console.error('❌ Error updating data.json:', error.message);
        process.exit(1);
    }
}

updateJsonPrices();

