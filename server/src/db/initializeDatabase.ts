import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '@/config/database.js';
import { QueryResult } from 'pg';
import { logError, logInfo } from '@/utils/logger.js';

const REQUIRED_TABLES = ['beats', 'orders', 'order_items', 'downloads'] as const;
const REQUIRED_INDEXES = ['idx_beats_bpm', 'idx_beats_key', 'idx_beats_price'] as const;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_SQL_PATH = path.join(__dirname, 'schema.sql');

type SchemaDDLStatement =
    | { kind: 'table'; name: string; ddl: string }
    | { kind: 'index'; name: string; ddl: string };

/**
 * Strip blank lines and `--` comments from a DDL chunk.
 * Prevents parsers from matching prose like "Create index on …" inside comments.
 */
function ddlWithoutComments(ddl: string): string {
    return ddl
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('--'))
        .join('\n');
}

/**
 * Split `schema.sql` into executable statements.
 * Safe for this file only: no functions, dollar-quotes, or semicolons inside strings.
 */
function splitSchemaDDL(dbSchemaSql: string): string[] {
    return dbSchemaSql
        .split(';')
        .map((chunk) => ddlWithoutComments(chunk))
        .filter((chunk) => chunk.length > 0);
}

/**
 * Classify one `schema.sql` statement as CREATE TABLE or CREATE INDEX.
 * Capture group 1 is the identifier (table or index name).
 *
 * @throws If the statement is not CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS
 */
function parseSchemaDDL(ddl: string): SchemaDDLStatement {
    const tableMatch: RegExpMatchArray | null = ddl.match(
        /^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z_][\w]*)/i
    );
    if (tableMatch) {
        return { kind: 'table', name: tableMatch[1], ddl };
    }

    const indexMatch: RegExpMatchArray | null = ddl.match(
        /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z_][\w]*)/i
    );
    if (indexMatch) {
        return { kind: 'index', name: indexMatch[1], ddl };
    }

    throw new Error(
        `initializeDatabase: unrecognized schema.sql statement (expected CREATE TABLE or CREATE INDEX): ${ddl.slice(0, 80)}`
    );
}

/**
 * True when a table named `tableName` exists in schema `public`.
 * Uses SQL-standard `information_schema.tables` plus `EXISTS` (boolean, one row).
 */
async function publicTableExists(tableName: string): Promise<boolean> {
    const result: QueryResult<{ exists: boolean }> = await pool.query<{ exists: boolean }>(
        `
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = $1
        ) AS exists
        `,
        [tableName]
    );
    return result.rows[0].exists;
}

/**
 * True when an index named `indexName` exists in schema `public`.
 * PostgreSQL has no `information_schema.indexes`; use system view `pg_indexes`.
 * @see https://www.postgresql.org/docs/current/view-pg-indexes.html
 */
async function publicIndexExists(indexName: string): Promise<boolean> {
    const result: QueryResult<{ exists: boolean }> = await pool.query<{ exists: boolean }>(
        `
        SELECT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname = $1
        ) AS exists
        `,
        [indexName]
    );
    return result.rows[0].exists;
}

/**
 * Names in `REQUIRED_TABLES` that are not present in `public`.
 * One round-trip: `table_name = ANY($1::text[])` matches any element of the bound array.
 * @see https://www.postgresql.org/docs/current/functions-comparisons.html#FUNCTIONS-COMPARISONS-ANY-SOME
 */
async function getMissingTables(): Promise<string[]> {
    const result: QueryResult<{ table_name: string }> = await pool.query<{ table_name: string }>(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
        `,
        [REQUIRED_TABLES]
    );

    const existingTables = new Set(result.rows.map((row) => row.table_name));
    return REQUIRED_TABLES.filter((tableName) => !existingTables.has(tableName));
}

/**
 * Names in `REQUIRED_INDEXES` that are not present in `public`.
 * Same `ANY($1::text[])` pattern as {@link getMissingTables}; column is `indexname`.
 */
async function getMissingIndexes(): Promise<string[]> {
    const result: QueryResult<{ indexname: string }> = await pool.query<{ indexname: string }>(
        `
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = ANY($1::text[])
        `,
        [REQUIRED_INDEXES]
    );

    const existingIndexes = new Set(result.rows.map((row) => row.indexname));
    return REQUIRED_INDEXES.filter((indexName) => !existingIndexes.has(indexName));
}

/**
 * Ensure required tables (and schema.sql indexes) exist.
 * Throws if the schema cannot be verified (server startup should exit on failure).
 *
 * Does not DROP data. Does not run numbered migrations (001, 002, 003, …).
 * Safe on existing databases for *new* tables and indexes only — ALTER/CHECK
 * changes for live tables live in `src/db/migrations/`.
 *
 * Does not guarantee that `beats` (or any other table) has rows.
 */
export async function initializeDatabase(): Promise<void> {
    if (!existsSync(SCHEMA_SQL_PATH)) {
        throw new Error(
            `schema.sql not found at ${SCHEMA_SQL_PATH}. ` +
                `Dev uses src/db/schema.sql; production build must copy it to dist/db/schema.sql.`
        );
    }

    const dbSchemaSQL: string = await readFile(SCHEMA_SQL_PATH, 'utf8');
    const schemaDDLStatements: SchemaDDLStatement[] = splitSchemaDDL(dbSchemaSQL).map(parseSchemaDDL);

    const createdTables: string[] = [];
    const skippedTables: string[] = [];
    const createdIndexes: string[] = [];
    const skippedIndexes: string[] = [];

    for (const statement of schemaDDLStatements) {
        if (statement.kind === 'table') {
            if (await publicTableExists(statement.name)) {
                skippedTables.push(statement.name);
                continue;
            }
            await pool.query(statement.ddl);
            createdTables.push(statement.name);
            continue;
        }

        if (await publicIndexExists(statement.name)) {
            skippedIndexes.push(statement.name);
            continue;
        }
        await pool.query(statement.ddl);
        createdIndexes.push(statement.name);
    }

    const missingTables: string[] = await getMissingTables();
    if (missingTables.length > 0) {
        throw new Error(
            `Schema initialization incomplete. Still missing tables: ${missingTables.join(', ')}`
        );
    }

    const missingIndexes: string[] = await getMissingIndexes();
    if (missingIndexes.length > 0) {
        throw new Error(
            `Schema initialization incomplete. Still missing indexes: ${missingIndexes.join(', ')}`
        );
    }

    logInfo('initializeDatabase.initializeDatabase', 'Database schema ready', {
        path: SCHEMA_SQL_PATH,
        tables: {
            created: createdTables,
            skipped: skippedTables,
            ready: [...REQUIRED_TABLES],
        },
        indexes: {
            created: createdIndexes,
            skipped: skippedIndexes,
            ready: [...REQUIRED_INDEXES],
        },
    });
}

/** True when this module is the process entry (`npm run init-db` / `tsx src/db/initializeDatabase.ts`). */
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
