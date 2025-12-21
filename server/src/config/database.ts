import pg from 'pg';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const { Pool } = pg;

function getDefaultDatabaseName(): string {
    // In local development we want a stable default that won't collide with production-ish names.
    // This also matches how we've been using Postgres locally (e.g., `muzbeats_dev`).
    return process.env.NODE_ENV === 'production' ? 'muzbeats' : 'muzbeats_dev';
}

// Create connection pool
// Prefer DATABASE_URL (Railway provides this automatically)
// Fall back to individual DB_* variables for local development
const pool = new Pool(
    process.env.DATABASE_URL
        ? {
              connectionString: process.env.DATABASE_URL,
              // Railway "Public Networking" / proxy connections typically require SSL.
              // This is safe for local tooling (migrations/import scripts) and works with most managed PG providers.
              // For local Postgres, DATABASE_URL is usually not set; we fall back to DB_* vars.
              ssl:
                  process.env.DB_SSL === 'false'
                      ? undefined
                      : /rlwy\.net|railway\.app|up\.railway\.app/i.test(process.env.DATABASE_URL)
                        ? { rejectUnauthorized: false }
                        : undefined,
              max: 20,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 2000,
          }
        : {
              host: process.env.DB_HOST || 'localhost',
              port: parseInt(process.env.DB_PORT || '5432'),
              database: process.env.DB_NAME || getDefaultDatabaseName(),
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

// Log which DB we intend to use (without leaking secrets)
if (!process.env.DATABASE_URL) {
    console.log('PostgreSQL (local) config:', {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || getDefaultDatabaseName(),
        user: process.env.DB_USER || 'postgres',
    });
} else {
    console.log('PostgreSQL config: Using DATABASE_URL');
}

export default pool;
