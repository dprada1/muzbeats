import dotenv from 'dotenv';
import pool from '../config/database.js';

dotenv.config();

async function setupTable() {
	try {
		console.log('🔄 Setting up beats table...\n');

		// Drop table if it exists (to start fresh)
		console.log('🗑️  Dropping existing beats table if it exists...');
		await pool.query('DROP TABLE IF EXISTS beats CASCADE;');
		console.log('✅ Dropped existing table\n');

		// Create the table
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

		// Create indexes
		console.log('📇 Creating indexes...');
		await pool.query('CREATE INDEX idx_beats_bpm ON beats(bpm);');
		await pool.query('CREATE INDEX idx_beats_key ON beats(key);');
		await pool.query('CREATE INDEX idx_beats_price ON beats(price);');
		console.log('✅ Indexes created\n');

		// Verify table structure
		console.log('🔍 Verifying table structure...');
		const columns = await pool.query(`
			SELECT column_name, data_type
			FROM information_schema.columns
			WHERE table_schema = 'public' 
			AND table_name = 'beats'
			ORDER BY ordinal_position;
		`);

		console.log('📊 Table columns:');
		columns.rows.forEach((col: any) => {
			console.log(`   - ${col.column_name} (${col.data_type})`);
		});

		// Test insert
		console.log('\n🧪 Testing insert...');
		const testResult = await pool.query(`
			INSERT INTO beats (title, key, bpm, price, audio_path, cover_path)
			VALUES ('Test Beat', 'C maj', 120, 4.99, '/test/audio.mp3', '/test/cover.webp')
			RETURNING id, title;
		`);
		console.log('✅ Test insert successful:', testResult.rows[0]);

		// Clean up test data
		await pool.query('DELETE FROM beats WHERE title = $1', ['Test Beat']);
		console.log('🧹 Test data cleaned up\n');

		console.log('✅ Table setup complete!');
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

