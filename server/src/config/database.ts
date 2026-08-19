import pg from 'pg';
import dotenv from 'dotenv';
import {
    ENV_LOG_DEFAULT,
    ENV_LOG_UNSET,
    getEnv,
    type EnvLogMarker
} from '@/config/env.js';
import {
    logError,
    logInfo
} from '@/utils/logger.js';

dotenv.config({ quiet: true });

const { Pool } = pg;

/** Hostnames that typically require SSL (Railway public proxy). */
const RAILWAY_HOST_REGEX: RegExp = /rlwy\.net|railway\.app|up\.railway\.app/i;

/** Safe-to-log Postgres identity fields (no password). */
type LoggedPostgresConfig = {
    host: string;
    port: number;
    database: string | EnvLogMarker;
    user: string | EnvLogMarker;
};

function getDefaultDatabaseName(): string {
    // In local development we want a stable default that won't collide with production-ish names.
    // This also matches how we've been using Postgres locally (e.g., `muzbeats_dev`).
    return process.env.NODE_ENV === 'production' ? 'muzbeats' : 'muzbeats_dev';
}

const DATABASE_URL: string | undefined = getEnv('DATABASE_URL');

// Create connection pool
// Prefer DATABASE_URL (Railway provides this automatically)
// Fall back to individual DB_* variables for local development
const pool: pg.Pool = new Pool(
    DATABASE_URL
        ? {
              connectionString: DATABASE_URL,
              // Railway "Public Networking" / proxy connections typically require SSL.
              // This is safe for local tooling (migrations/import scripts) and works with most managed PG providers.
              // For local Postgres, DATABASE_URL is usually not set; we fall back to DB_* vars.
              ssl:
                  getEnv('DB_SSL') === 'false'
                      ? undefined
                      : RAILWAY_HOST_REGEX.test(DATABASE_URL)
                        ? { rejectUnauthorized: false }
                        : undefined,
              max: 20,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 2000,
          }
        : {
              host: getEnv('DB_HOST') || 'localhost',
              port: parseInt(getEnv('DB_PORT') || '5432', 10),
              database: getEnv('DB_NAME') || getDefaultDatabaseName(),
              user: getEnv('DB_USER') || 'postgres',
              password: getEnv('DB_PASSWORD') || '',
              max: 20,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 2000,
          }
);

// Idle clients reconnecting used to spam "Connected to PostgreSQL" on every request
// that needed a fresh pool slot — keep errors only; boot already logs DB config via init.
pool.on('error', (err) => {
    logError('database.onError', 'PostgreSQL pool error', err);
});

function postgresConfigFromDatabaseURL(databaseURL: string): LoggedPostgresConfig {
    const url: URL = new URL(databaseURL.replace(/^postgres(ql)?:/i, 'http:'));
    const port: number = url.port ? Number(url.port) : 5432;
    return {
        host: url.hostname,
        port: Number.isFinite(port) ? port : 5432,
        database: decodeURIComponent(url.pathname.replace(/^\//, '')) || ENV_LOG_DEFAULT,
        user: decodeURIComponent(url.username) || ENV_LOG_UNSET,
    };
}

/**
 * Assert DATABASE_URL is parseable when set, then log host/port/database/user
 * without passwords. Unset DATABASE_URL in local dev still falls back to DB_*.
 */
export function assertDatabaseConfigAtBoot(): void {
    if (DATABASE_URL) {
        let loggedPostgresConfig: LoggedPostgresConfig;
        try {
            loggedPostgresConfig = postgresConfigFromDatabaseURL(DATABASE_URL);
        } catch {
            throw new Error(
                'DATABASE_URL is set but is not a valid postgres URL. Refusing to continue...'
            );
        }
        logInfo(
            'database.init',
            'Using DATABASE_URL for PostgreSQL config',
            loggedPostgresConfig
        );
        return;
    }

    logInfo('database.init', 'Using local PostgreSQL config', {
        host: getEnv('DB_HOST') || 'localhost',
        port: parseInt(getEnv('DB_PORT') || '5432', 10),
        database: getEnv('DB_NAME') || getDefaultDatabaseName(),
        user: getEnv('DB_USER') || 'postgres',
    });
}

export default pool;
