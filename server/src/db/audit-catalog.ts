/**
 * CLI entry for catalog consistency: DB rows vs local disk and/or R2.
 *
 * Always checks (no storage I/O beyond DB):
 * - `cover_path` UUID matches beat id when under `/assets/images/covers/`
 * - `bpm` column matches BPM parsed from mp3 filename (parse / bounds / mismatch)
 *
 * Storage checks (gated by mode) — intended pairings:
 * - `--local-only`: local disk + local DB (`DB_HOST` / `DB_NAME` / …, no `DATABASE_URL`)
 * - `--r2`: R2 objects + deployed DB (`DATABASE_URL` = staging/prod public proxy from laptop,
 *   or Railway's URL when the job runs in that environment). Requires `R2_PUBLIC_BUCKET_NAME`
 *   (S3 ListObjects for MP3 inventory) in addition to `R2_PUBLIC_URL` / private R2 creds.
 * - `--both`: same DB connection vs local disk AND R2 (useful as a cross-check; expect
 *   noise if local disk is incomplete while R2 is the source of truth)
 *
 * Also enforces inventory: |mp3| = |wav| = |DB rows| with matching filename stems (orphans fail).
 * Empty catalog (0 rows) warns but is not an exit-1 by itself if inventory is also empty.
 *
 * Usage (storage flag is required — no silent default):
 *   npm run audit-catalog:local
 *   npm run audit-catalog:r2
 *   npm run audit-catalog:both
 *   npm run audit-catalog:local -- --json
 *   npx tsx src/db/audit-catalog.ts --local-only --json
 *
 * Bare `npm run audit-catalog` (no storage flag) throws.
 * Named scripts bake in the storage mode so you usually avoid typing flags.
 * The `--` after an npm script name is npm's separator (see comment in package.json / docs below);
 * extra flags like `--json` go after it. Or call `tsx` directly and skip npm's `--`.
 *
 * Exit code 1 when any issue is found (for CI).
 *
 * Server boot uses the same core via `assertCatalogReady` with profile `boot`
 * (skimask + MP3 + WAV + BPM + inventory — skips custom covers / cover UUID drift).
 */

import dotenv from 'dotenv';
import pool from '@/config/database.js';
import {
    getEnv
} from '@/config/env.js';
import {
    type CatalogAuditResult,
    type StorageMode,
    parseStorageMode,
    runCatalogAudit,
} from '@/db/catalogAudit.js';

dotenv.config();

/** True when the env var exists as a non-empty string (value is not validated further). */
function isEnvVarSet(name: string): boolean {
    const value = process.env[name];
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * R2 audits should compare object storage to the deployed catalog, not a laptop-only DB.
 * Warn (do not exit) so local experimentation still works, but the footgun is loud.
 */
function warnIfR2WithoutDeployedDb(storageMode: StorageMode): void {
    if (storageMode === 'local') return;
    if (isEnvVarSet('DATABASE_URL')) return;

    console.warn(
        `[audit-catalog] WARNING: storage mode "${storageMode}" without DATABASE_URL.\n` +
            `  Beat rows will come from local DB (laptop Postgres via DB_HOST/DB_NAME/…),\n` +
            `  while files are probed on R2.\n` +
            `  That pairing is usually wrong — set DATABASE_URL to the staging/prod public proxy URL\n` +
            `  so R2 is checked against the same catalog Railway serves.`
    );
}

/**
 * Local-disk audits expect laptop Postgres. `database.ts` prefers DATABASE_URL
 * whenever it is set, so --local-only + DATABASE_URL quietly compares remote rows to local files.
 */
function warnIfLocalWithDatabaseUrl(storageMode: StorageMode): void {
    if (storageMode !== 'local') return;
    if (!isEnvVarSet('DATABASE_URL')) return;

    console.warn(
        `[audit-catalog] WARNING: --local-only with DATABASE_URL set.\n` +
            `  Beat rows will come from DATABASE_URL, not local DB — while files are probed on disk.\n` +
            `  Unset DATABASE_URL for a true local audit, or use --r2 if you meant to check the deployed catalog.`
    );
}

function warnIfBothMode(storageMode: StorageMode): void {
    if (storageMode !== 'both') return;
    console.warn(
        `[audit-catalog] NOTE: --both uses one DB connection for both stores.\n` +
            `  Local disk and R2 are each compared to the same beat rows.\n` +
            `  Prefer --local-only (laptop DB + disk) and --r2 (DATABASE_URL + R2) as separate runs\n` +
            `  unless you intentionally want that cross-check.`
    );
}

async function closePool(): Promise<void> {
    try {
        await pool.end();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[audit-catalog] Failed to close database pool: ${message}`);
    }
}

async function main(): Promise<void> {
    // process.argv: [nodeBinary, scriptPath, ...user flags] — same idea as C++ argv.
    const argv: string[] = process.argv;
    const shouldOutputAsJson: boolean = argv.includes('--json');
    const storageMode: StorageMode = parseStorageMode(argv);
    const checkLocal: boolean = storageMode === 'local' || storageMode === 'both';
    const checkR2: boolean = storageMode === 'r2' || storageMode === 'both';

    warnIfR2WithoutDeployedDb(storageMode);
    warnIfLocalWithDatabaseUrl(storageMode);
    warnIfBothMode(storageMode);

    // profile `full`: covers + BPM + audio (CLI). Boot uses `boot` (skips custom covers).
    const catalogAuditResult: CatalogAuditResult = await runCatalogAudit({
        storageMode,
        profile: 'full',
    });
    const { issues, publicRoot, privateRoot, inventory } = catalogAuditResult;
    const dbRows = inventory.dbRows;

    if (dbRows === 0) {
        console.warn(
            '[audit-catalog] WARNING: catalog has 0 beats — nothing to sell until DB rows exist'
        );
    }

    if (shouldOutputAsJson) {
        // null = no replacer; 2 = indent spaces (pretty-print)
        console.log(
            JSON.stringify(
                {
                    storageMode,
                    issueCount: issues.length,
                    publicRoot,
                    privateRoot,
                    databaseSource: isEnvVarSet('DATABASE_URL') ? 'DATABASE_URL' : 'local DB',
                    inventory,
                    issues,
                },
                null,
                2
            )
        );
    } else {
        console.log(`Audited ${dbRows} beats (storage mode: ${storageMode})`);
        console.log(
            `  database: ${isEnvVarSet('DATABASE_URL') ? 'DATABASE_URL' : 'local DB'}`
        );
        if (inventory.local) {
            console.log(
                `  inventory local: mp3=${inventory.local.mp3Count} wav=${inventory.local.wavCount} dbRows=${inventory.dbRows}`
            );
        }
        if (inventory.r2) {
            console.log(
                `  inventory r2:    mp3=${inventory.r2.mp3Count} wav=${inventory.r2.wavCount} dbRows=${inventory.dbRows}`
            );
        }
        // publicRoot / privateRoot are always local filesystem paths (useful for --local-only / --both).
        // R2 mode does not rewrite them into bucket URLs — R2 paths are logged separately below.
        if (checkLocal) {
            console.log(`  local public:  ${publicRoot}`);
            console.log(`  local private: ${privateRoot}`);
        }
        if (checkR2) {
            console.log(`  public R2:  ${getEnv('R2_PUBLIC_URL') ?? '(unset)'}`);
            console.log(
                `  public R2 bucket: ${getEnv('R2_PUBLIC_BUCKET_NAME') ?? '(unset)'}`
            );
            console.log(`  private R2: ${getEnv('R2_PRIVATE_BUCKET_NAME') ?? '(unset)'}`);
        }
        if (issues.length === 0) {
            console.log('No catalog issues found.');
        } else {
            console.log(`Found ${issues.length} issue(s):\n`);
            for (const issue of issues) {
                console.log(`[${issue.code}] ${issue.title}`);
                console.log(`  id: ${issue.beatId}`);
                console.log(`  ${issue.detail}\n`);
            }
        }
    }

    await closePool();

    if (issues.length > 0) {
        process.exit(1);
    }
}

// Rejected promises from main() land here (async errors = failures inside awaits, not sync throws).
main().catch(async (err: unknown) => {
    console.error(err);
    await closePool();
    process.exit(1);
});
