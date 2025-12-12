import pg from 'pg';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const { Pool } = pg;

// Create connection pool
// Prefer DATABASE_URL (Railway provides this automatically)
// Fall back to individual DB_* variables for local development
const pool = new Pool(
    process.env.DATABASE_URL
        ? {
              connectionString: process.env.DATABASE_URL,
              max: 20,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 2000,
          }
        : {
              host: process.env.DB_HOST || 'localhost',
              port: parseInt(process.env.DB_PORT || '5432'),
              database: process.env.DB_NAME || 'muzbeats',
              user: process.env.DB_USER || 'postgres',
              password: process.env.DB_PASSWORD || '',
              max: 20,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 2000,
          }
);

// Connection event handlers
pool.on('connect', () => {
    console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('PostgreSQL connection error:', err);
});

export default pool;
