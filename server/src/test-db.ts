import dotenv from 'dotenv';
import pool from './config/database';

dotenv.config();

async function testConnection() {
    try {
        // Test basic connection
        const result = await pool.query('SELECT NOW()');
        console.log('Database connection successful!');
        console.log('Current time:', result.rows[0].now);

        // Test querying beats table
        const beats = await pool.query('SELECT * FROM beats LIMIT 5');
        console.log(`Found ${beats.rows.length} beats in the table`);
        if (beats.rows.length > 0) {
            console.log('Sample beat:', {
                id: beats.rows[0].id,
                title: beats.rows[0].title,
                bpm: beats.rows[0].bpm
            });
        }

        // Close the pool
        await pool.end();
        console.log('Connection closed');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}

testConnection();
