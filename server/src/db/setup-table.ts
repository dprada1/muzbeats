import dotenv from 'dotenv';
import pool from '../config/database.js';

dotenv.config();

async function setupTable() {
    try {
        console.log('🔄 Setting up database tables...\n');

        // Drop existing tables if they exist (to start fresh in dev)
        console.log('🗑️  Dropping existing tables if they exist...');
        await pool.query('DROP TABLE IF EXISTS downloads CASCADE;');
        await pool.query('DROP TABLE IF EXISTS order_items CASCADE;');
        await pool.query('DROP TABLE IF EXISTS orders CASCADE;');
        await pool.query('DROP TABLE IF EXISTS beats CASCADE;');
        console.log('✅ Dropped existing tables\n');

        // Create beats table
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

        // Create indexes for beats
        console.log('📇 Creating indexes on beats...');
        await pool.query('CREATE INDEX idx_beats_bpm ON beats(bpm);');
        await pool.query('CREATE INDEX idx_beats_key ON beats(key);');
        await pool.query('CREATE INDEX idx_beats_price ON beats(price);');
        console.log('✅ Beats indexes created\n');

        // Create orders table
        console.log('📊 Creating orders table...');
        await pool.query(`
            CREATE TABLE orders (
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
            CREATE TABLE order_items (
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
            CREATE TABLE downloads (
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

        // Verify beats table structure
        console.log('🔍 Verifying beats table structure...');
        const columns = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'beats'
            ORDER BY ordinal_position;
        `);

        console.log('📊 Beats table columns:');
        columns.rows.forEach((col: any) => {
            console.log(`   - ${col.column_name} (${col.data_type})`);
        });

        // Test insert into beats
        console.log('\n🧪 Testing beats insert...');
        const testResult = await pool.query(`
            INSERT INTO beats (title, key, bpm, price, audio_path, cover_path)
            VALUES ('Test Beat', 'C maj', 120, 4.99, '/test/audio.mp3', '/test/cover.webp')
            RETURNING id, title;
        `);
        console.log('✅ Beats test insert successful:', testResult.rows[0]);

        // Clean up test data
        await pool.query('DELETE FROM beats WHERE title = $1', ['Test Beat']);
        console.log('🧹 Beats test data cleaned up\n');

        console.log('✅ All table setup complete!');
        await pool.end();
    } catch (error: any) {
        console.error('❌ Setup failed:', error.message);
        if (error.detail) {
            console.error('   Detail:', error.detail);
        }
        await pool.end();
        process.exit(1);
    }
}

setupTable();
