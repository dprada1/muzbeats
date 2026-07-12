/**
 * Migration: overwrite beats.key with the canonical normalized form.
 *
 * Converts the stored display keys ("C♯ min") into the compact canonical
 * form ("c#min") so the search layer can match against a single source of
 * truth. Display formatting is reapplied at read time via
 * denormalizeKeyNotation (see beatsService.mapDbRowToBeat).
 *
 * Idempotent: normalizeKeyNotation is a no-op on already-normalized values,
 * so re-running this script changes nothing.
 *
 * Run: node --import tsx src/db/normalize-keys.ts
 */
import dotenv from 'dotenv';
import pool from '@/config/database.js';
import { normalizeKeyNotation } from '@/utils/keyUtils.js';

dotenv.config();

async function main() {
    const client = await pool.connect();
    try {
        console.log(`DB: ${process.env.DB_NAME ?? '(from DATABASE_URL)'}`);
        const { rows } = await client.query<{ id: string; key: string }>(
            'SELECT id, key FROM beats'
        );

        const updates = rows
            .map((row) => ({ id: row.id, from: row.key, to: normalizeKeyNotation(row.key) }))
            .filter((u) => u.from !== u.to);

        if (updates.length === 0) {
            console.log(`No changes needed — all ${rows.length} keys already normalized.`);
            return;
        }

        await client.query('BEGIN');
        for (const u of updates) {
            await client.query('UPDATE beats SET key = $1 WHERE id = $2', [u.to, u.id]);
        }
        await client.query('COMMIT');

        console.log(`Normalized ${updates.length} of ${rows.length} beat keys:`);
        for (const u of updates) {
            console.log(`  "${u.from}" -> "${u.to}"`);
        }
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
