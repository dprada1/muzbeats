import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '@/config/database.js';
import { QueryResult } from 'pg';
import { logError, logInfo } from '@/utils/logger.js';

const REQUIRED_TABLES = ['beats', 'orders', 'order_items', 'downloads'] as const;

async function getMissingTables(): Promise<string[]> {
    const result: QueryResult<any> = await pool.query<{ table_name: string }>(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
        `,
        [REQUIRED_TABLES]
    );

    const existing = new Set(result.rows.map((row) => row.table_name));
    return REQUIRED_TABLES.filter((name) => !existing.has(name));
}

async function createDatabaseSchema(): Promise<void> {
    logInfo('initializeDatabase.createDatabaseSchema', 'Creating missing schema tables');

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

    await pool.query('CREATE INDEX IF NOT EXISTS idx_beats_bpm ON beats(bpm);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_beats_key ON beats(key);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_beats_price ON beats(price);');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            customer_email VARCHAR(255) NOT NULL,
            total_amount DECIMAL(10, 2) NOT NULL,
            status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
            paypal_order_id VARCHAR(255) UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

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

    logInfo('initializeDatabase.createDatabaseSchema', 'Schema tables created');
}

function assertSchemaComplete(missing: string[]): void {
    if (missing.length > 0) {
        throw new Error(
            `Schema initialization incomplete. Still missing: ${missing.join(', ')}`
        );
    }
}

/**
 * Ensure required tables exist; create any that are missing.
 * Throws if the schema cannot be verified (server startup should exit on failure).
 */
export async function initializeDatabase(): Promise<void> {
    const missingTables = await getMissingTables();

    if (missingTables.length === 0) {
        logInfo('initializeDatabase.initializeDatabase', 'Database schema ready', {
            tables: [...REQUIRED_TABLES],
        });
        return;
    }

    logInfo('initializeDatabase.initializeDatabase', 'Missing tables', {
        missingTables,
    });

    await createDatabaseSchema();

    assertSchemaComplete(await getMissingTables());

    logInfo('initializeDatabase.initializeDatabase', 'Database schema ready', {
        tables: [...REQUIRED_TABLES],
    });
}

function isExecutedDirectly(): boolean {
    const entry = process.argv[1];
    if (!entry) {
        return false;
    }
    const modulePath = fileURLToPath(import.meta.url);
    return path.resolve(modulePath) === path.resolve(entry);
}

/** CLI entry: `npm run init-db` — loads .env, runs init, closes the pool, exits. */
if (isExecutedDirectly()) {
    dotenv.config();

    initializeDatabase()
        .then(async () => {
            await pool.end();
        })
        .catch(async (error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            const detail =
                error && typeof error === 'object' && 'detail' in error
                    ? (error as { detail: unknown }).detail
                    : undefined;
            logError('initializeDatabase.cli', 'Initialization failed', { message, detail });
            await pool.end();
            process.exit(1);
        });
}
