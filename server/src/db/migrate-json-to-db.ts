import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import type { Beat } from '../types/Beat.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to data.json
const DATA_FILE_PATH = path.join(__dirname, '../../public/assets/data.json');

async function migrateJsonToDatabase() {
  try {
    console.log('🔄 Starting migration from JSON to PostgreSQL...\n');

    // 1. Read JSON file
    console.log('📖 Reading data.json...');
    const fileContent = await readFile(DATA_FILE_PATH, 'utf-8');
    const beats: Beat[] = JSON.parse(fileContent);
    console.log(`✅ Found ${beats.length} beats in JSON file\n`);

    // 2. Check if table exists, create if not
    console.log('🔍 Checking if beats table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'beats'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('📊 Creating beats table...');
      await pool.query(`
        CREATE TABLE beats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          key VARCHAR(50) NOT NULL,
          bpm INTEGER NOT NULL CHECK (bpm > 0 AND bpm < 300),
          price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
          audio_path VARCHAR(500) NOT NULL,
          cover_path VARCHAR(500) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Beats table created\n');
    } else {
      console.log('✅ Beats table already exists\n');
    }

    // 3. Check if data already exists
    const countResult = await pool.query('SELECT COUNT(*) FROM beats');
    const existingCount = parseInt(countResult.rows[0].count);

    if (existingCount > 0) {
      console.log(`⚠️  Warning: Found ${existingCount} existing beats in database`);
      console.log('   Migration will skip beats that already exist (by ID)\n');
    }

    // 4. Insert beats into database
    console.log('💾 Inserting beats into database...');
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const beat of beats) {
      try {
        // Check if beat with this ID already exists
        const existing = await pool.query(
          'SELECT id FROM beats WHERE id = $1::uuid',
          [beat.id]
        );

        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        // Insert new beat
        // Map: audio -> audio_path, cover -> cover_path
        await pool.query(
          `INSERT INTO beats (id, title, key, bpm, price, audio_path, cover_path)
           VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)`,
          [beat.id, beat.title, beat.key, beat.bpm, beat.price, beat.audio, beat.cover]
        );
        inserted++;
        
        // Log progress every 10 beats
        if (inserted % 10 === 0) {
          console.log(`   Progress: ${inserted} beats inserted...`);
        }
      } catch (error: any) {
        errors++;
        console.error(`❌ Error inserting beat "${beat.title}" (ID: ${beat.id}):`, error.message);
        if (error.detail) {
          console.error(`   Detail: ${error.detail}`);
        }
        if (error.code) {
          console.error(`   Code: ${error.code}`);
        }
      }
    }
    
    if (errors > 0) {
      console.log(`\n⚠️  Encountered ${errors} errors during insertion`);
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Inserted: ${inserted} beats`);
    console.log(`   Skipped: ${skipped} beats (already exist)`);
    console.log(`   Errors: ${errors} beats failed`);
    console.log(`   Total in database: ${inserted + existingCount} beats\n`);

    // 5. Verify migration
    const finalCount = await pool.query('SELECT COUNT(*) FROM beats');
    console.log(`📊 Final count: ${finalCount.rows[0].count} beats in database`);

    // Don't close the pool - it's shared and other parts of the app need it
    // The pool will be reused by the service
    console.log('✅ Migration script finished (pool remains open for app use)');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

migrateJsonToDatabase();

