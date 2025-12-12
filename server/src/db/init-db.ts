/**
 * Database initialization script
 * This can be run manually or as part of deployment
 * Creates all necessary tables if they don't exist
 */
import dotenv from 'dotenv';
import pool from '../config/database.js';

dotenv.config();

async function initDatabase() {
    try {
        console.log('🔄 Initializing database...\n');

        // Create beats table
        console.log('📊 Creating beats table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS beats (
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

        // Create indexes for beats
        console.log('📇 Creating indexes on beats...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_beats_bpm ON beats(bpm);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_beats_key ON beats(key);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_beats_price ON beats(price);');
        console.log('✅ Beats indexes created\n');

        // Create orders table
        console.log('📊 Creating orders table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                customer_email VARCHAR(255) NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
                stripe_payment_intent_id VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Orders table created\n');

        // Create order_items table
        console.log('📊 Creating order_items table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                beat_id UUID NOT NULL REFERENCES beats(id) ON DELETE RESTRICT,
                price_at_purchase DECIMAL(10, 2) NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ order_items table created\n');

        // Create downloads table
        console.log('📊 Creating downloads table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS downloads (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                beat_id UUID NOT NULL REFERENCES beats(id) ON DELETE RESTRICT,
                download_token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                download_count INTEGER DEFAULT 0,
                max_downloads INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Downloads table created\n');

        // Verify tables
        console.log('🔍 Verifying tables...');
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('beats', 'orders', 'order_items', 'downloads')
            ORDER BY table_name;
        `);
        
        console.log('📊 Created tables:');
        tables.rows.forEach((row: any) => {
            console.log(`   ✅ ${row.table_name}`);
        });

        console.log('\n✅ Database initialization complete!');
        await pool.end();
    } catch (error: any) {
        console.error('❌ Initialization failed:', error.message);
        if (error.detail) {
            console.error('   Detail:', error.detail);
        }
        await pool.end();
        process.exit(1);
    }
}

initDatabase();

