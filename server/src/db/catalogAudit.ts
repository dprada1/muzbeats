/**
 * Shared catalog consistency checks: DB rows vs local disk and/or R2.
 *
 * Used by:
 * - CLI (`audit-catalog.ts`) — full audit for CI / manual runs
 * - Server boot (`assertCatalogReady.ts`) — fatal subset (skimask, MP3, WAV, BPM)
 */

import path from 'path';
import {
    fileURLToPath
} from 'url';
import {
    access
} from 'fs/promises';
import pool from '@/config/database.js';
import {
    getEnv
} from '@/config/env.js';
import {
    getWavPath,
    getPrivateWavR2Key,
    listR2ObjectKeys,
    probePrivateR2Wav,
    type R2WavProbe,
} from '@/services/downloadService.js';
import {
    isR2PublicURLConfigured,
    isR2PublicBucketNameConfigured,
    isR2PrivateConfigured,
} from '@/utils/r2.js';
import {
    readdir
} from 'fs/promises';

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

/** Absolute path to `server/public` (URL paths under `/assets/...`). */
const PUBLIC_ROOT: string = path.join(__dirname, '../../public');

/**
 * Absolute path to `server/private`.
 * Local WAV masters live at `private/beats/wav/<file>.wav`
 * (DB logical path is `/assets/beats/wav/...` via {@link getWavPath}).
 */
const PRIVATE_ROOT: string = path.join(__dirname, '../../private');

/** Local public MP3 directory (`server/public/assets/beats/mp3`). */
const LOCAL_MP3_DIR: string = path.join(PUBLIC_ROOT, 'assets/beats/mp3');

/** Local private WAV directory (`server/private/beats/wav`). */
const LOCAL_WAV_DIR: string = path.join(PRIVATE_ROOT, 'beats/wav');

/** Soft fallback cover used when `cover_path` is null/empty in the DB. */
const DEFAULT_COVER = '/assets/images/skimask.png';

/** Same bounds as `beats.bpm` CHECK in `schema.sql` (and filename audit). */
const BPM_MIN_EXCLUSIVE = 0;
const BPM_MAX_EXCLUSIVE = 300;

/**
 * Columns we SELECT for the catalog audit.
 * Kept local (SQL schema has no shared TS model); only the fields this script needs.
 */
type BeatRow = {
    id: string;
    title: string;
    key: string;
    bpm: number;
    audio_path: string;
    cover_path: string | null;
};

/**
 * One catalog inconsistency found during the audit.
 *
 * @property beatId - Beat UUID
 * @property title - Beat title (for grepping / human-readable logs)
 * @property code - Stable machine-readable issue class (e.g. `MP3_MISSING_LOCAL`)
 * @property detail - Extra context (paths, expected vs actual values)
 */
export type CatalogIssue = {
    beatId: string;
    /** Beat title (or a synthetic label like "Default cover" / "Catalog inventory"). */
    title: string;
    /** Stable machine-readable issue class (e.g. `MP3_MISSING_LOCAL`). */
    code: string;
    /** Extra context (paths, expected vs actual values). */
    detail: string;
};

/** Which object stores to probe for MP3 / cover / WAV files. */
export type StorageMode = 'local' | 'r2' | 'both';

/**
 * How much to check:
 * - `full` — CLI / CI: BPM + cover identity + custom covers + audio
 * - `boot` — startup gate: skimask + MP3 + WAV + BPM consistency
 *   (skips custom-cover existence and cover UUID mismatches — skimask covers those)
 */
export type CatalogAuditProfile = 'full' | 'boot';

/** Existence probe that distinguishes missing from config/API failures. */
type ObjectProbe = 'exists' | 'missing' | 'unconfigured' | 'error';

export type CatalogInventoryCounts = {
    mp3Count: number;
    wavCount: number;
};

export type CatalogInventory = {
    /** Number of rows returned from `beats` for this audit. */
    dbRows: number;
    /** Present when storage mode includes local disk. */
    local?: CatalogInventoryCounts;
    /** Present when storage mode includes R2. */
    r2?: CatalogInventoryCounts;
};

export type CatalogAuditResult = {
    storageMode: StorageMode;
    profile: CatalogAuditProfile;
    issues: CatalogIssue[];
    /** Absolute local path to `server/public`. */
    publicRoot: string;
    /** Absolute local path to `server/private`. */
    privateRoot: string;
    /** Always present: at least `dbRows`; local/r2 counts filled for the stores that were checked. */
    inventory: CatalogInventory;
};

/**
 * Codes that must stop the server from accepting traffic.
 * Custom-cover gaps / UUID mismatches are not in this set (CLI/CI only — skimask fallback).
 * Empty catalog is warn-only (see assertCatalogReady / CLI) — not listed here.
 */
export const BOOT_FATAL_ISSUE_CODES: ReadonlySet<string> = new Set([
    'DEFAULT_COVER_MISSING_LOCAL',
    'DEFAULT_COVER_MISSING_R2',
    'DEFAULT_COVER_R2_ERROR',
    'DEFAULT_COVER_R2_UNCONFIGURED',
    'MP3_MISSING_LOCAL',
    'MP3_MISSING_R2',
    'MP3_R2_ERROR',
    'MP3_R2_UNCONFIGURED',
    'WAV_MISSING_LOCAL',
    'WAV_MISSING_R2',
    'WAV_R2_ERROR',
    'WAV_R2_UNCONFIGURED',
    'AUDIO_FILENAME_UNPARSEABLE',
    'AUDIO_FILENAME_BPM_OUT_OF_BOUNDS',
    'BPM_MISMATCH',
    'INVENTORY_MISMATCH_LOCAL',
    'INVENTORY_MISMATCH_R2',
    'INVENTORY_LIST_ERROR_LOCAL',
    'INVENTORY_LIST_ERROR_R2',
]);

/**
 * Parse `--local-only` / `--r2` / `--both` from argv.
 * Exactly one storage intent is required (no silent default).
 * `--both` alone is OK; combining `--both` with another flag still means `both`.
 * `--local-only` together with `--r2` (without `--both`) is an error.
 */
export function parseStorageMode(argv: string[]): StorageMode {
    const hasBoth = argv.includes('--both');
    const hasR2 = argv.includes('--r2');
    const hasLocal = argv.includes('--local-only');

    if (!hasBoth && !hasR2 && !hasLocal) {
        throw new Error(
            'parseStorageMode: pass exactly one of --local-only, --r2, or --both (no default).\n' +
                '  Examples: npm run audit-catalog:local | audit-catalog:r2 | audit-catalog:both\n' +
                '  Or: npx tsx src/db/audit-catalog.ts --local-only [--json]'
        );
    }

    if (hasLocal && hasR2 && !hasBoth) {
        throw new Error(
            'parseStorageMode: pass --both to check local and R2 together; do not combine --local-only with --r2'
        );
    }

    if (hasBoth) return 'both';
    if (hasR2) return 'r2';
    return 'local';
}

function stripLeadingSlash(p: string): string {
    return p.startsWith('/') ? p.slice(1) : p;
}

/**
 * Parse BPM from an mp3 basename using `artist__title_key_bpm.mp3`
 * (BPM is the segment after the last `_` in the stem).
 */
function parseBPMFromAudioFilename(filename: string): number | null {
    if (!filename.toLowerCase().endsWith('.mp3')) return null;
    const stem: string = filename.slice(0, -4);
    if (!stem.includes('__')) return null;

    const lastUnderscore: number = stem.lastIndexOf('_');
    if (lastUnderscore <= 0 || lastUnderscore === stem.length - 1) return null;

    const bpm: number = Number(stem.slice(lastUnderscore + 1));
    if (!Number.isFinite(bpm)) return null;
    return bpm;
}

/** Whether a BPM value is inside the catalog / DB allowed range (exclusive bounds). */
function isBPMInBounds(bpm: number): boolean {
    return bpm > BPM_MIN_EXCLUSIVE && bpm < BPM_MAX_EXCLUSIVE;
}

/**
 * Relative path under {@link PRIVATE_ROOT} for a local WAV master.
 * `/assets/beats/wav/foo.wav` → `beats/wav/foo.wav`
 * (joined later as `PRIVATE_ROOT + '/' + relative` → `…/private/beats/wav/foo.wav`).
 */
function localPrivateWavRelativePath(audioPath: string): string {
    const logicalWav: string = getWavPath(audioPath);
    const withoutAssetsPrefix: string = logicalWav.replace(/^\/?assets/, '');
    return stripLeadingSlash(withoutAssetsPrefix);
}

/**
 * Check whether a file exists under a filesystem root.
 */
async function localFileExists(root: string, urlStylePath: string): Promise<boolean> {
    const fullPath: string = path.join(root, stripLeadingSlash(urlStylePath));
    try {
        await access(fullPath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Map a DB `/assets/...` path to the public R2 object key / URL path.
 * `/assets/beats/mp3/foo.mp3` → `beats/mp3/foo.mp3`
 */
function toPublicR2ObjectPath(assetPath: string): string {
    const clean: string = stripLeadingSlash(assetPath);
    return clean.startsWith('assets/') ? clean.slice('assets/'.length) : clean;
}

/**
 * Probe a public R2 object via HTTP HEAD on `R2_PUBLIC_URL`
 * (no public bucket name required in env).
 */
async function probePublicR2Object(assetPath: string): Promise<ObjectProbe> {
    const base: string | undefined = getEnv('R2_PUBLIC_URL')?.replace(/\/$/, '');
    if (!base) return 'unconfigured';

    const url = `${base}/${toPublicR2ObjectPath(assetPath)}`;
    try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) return 'exists';
        if (res.status === 404) return 'missing';
        return 'error';
    } catch {
        return 'error';
    }
}

/**
 * True when `coverPath` is under `/assets/images/covers/` but the filename UUID
 * (basename without extension) does not equal `beatId`.
 */
function hasCoverIDMismatch(beatId: string, coverPath: string): boolean {
    if (!coverPath.includes('/assets/images/covers/')) {
        return false;
    }
    const base: string = path.basename(coverPath);
    const dotIndex: number = base.lastIndexOf('.');
    const idPart: string = dotIndex > 0 ? base.slice(0, dotIndex) : base;
    return idPart !== beatId;
}

function pushIssue(
    issues: CatalogIssue[],
    row: BeatRow,
    code: string,
    detail: string
): void {
    issues.push({ beatId: row.id, title: row.title, code, detail });
}

/** Run async work over items with a fixed concurrency limit. */
async function mapPool<T>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<void>
): Promise<void> {
    let next: number = 0;
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (next < items.length) {
            const i = next++;
            await fn(items[i]);
        }
    });
    await Promise.all(workers);
}

/** True when the env var exists as a non-empty string (value is not validated further). */
function isEnvVarSet(name: string): boolean {
    const value = process.env[name];
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Fail fast when the chosen mode needs R2 but env is incomplete.
 * Reports each required var as set / unset so you can see exactly what is missing.
 *
 * @returns Error message, or `null` if OK to proceed
 */
function r2ConfigError(mode: StorageMode): string | null {
    if (mode === 'local') return null;

    const privateVars: readonly string[] = [
        'R2_PRIVATE_BUCKET_NAME',
        'R2_ENDPOINT',
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY',
    ];
    const publicVars: readonly string[] = ['R2_PUBLIC_URL', 'R2_PUBLIC_BUCKET_NAME'];

    const privateStatus: string[] = privateVars.map(
        (name) => `${name}=${isEnvVarSet(name) ? 'set' : 'UNSET'}`
    );
    const publicStatus: string[] = publicVars.map(
        (name) => `${name}=${isEnvVarSet(name) ? 'set' : 'UNSET'}`
    );

    const isPrivateOk: boolean = isR2PrivateConfigured();
    const isPublicUrlOk: boolean = isR2PublicURLConfigured();
    const isPublicBucketOk: boolean = isR2PublicBucketNameConfigured();
    if (isPrivateOk && isPublicUrlOk && isPublicBucketOk) return null;

    return (
        `Storage mode "${mode}" requires complete R2 configuration.\n` +
        `  private: ${privateStatus.join(', ')}\n` +
        `  public:  ${publicStatus.join(', ')}`
    );
}

/** Strip `.mp3` / `.wav` (case-insensitive) for inventory set comparison. */
function audioStem(filename: string): string {
    return filename.replace(/\.(mp3|wav)$/i, '');
}

/**
 * Stable, full listing of stems for issue `detail` strings.
 *
 * Copies `items` into an array, sorts A→Z (`localeCompare`), and joins with `", "`.
 * We list every stem: this audit exists so you can fix the catalog, and n stays
 * in the hundreds-to-low-thousands — truncation would hide names you need.
 *
 * Example:
 *   ["zeta", "alpha", "beta"] → "alpha, beta, zeta"
 */
function formatSortedStems(items: Iterable<string>): string {
    return [...items].sort((a, b) => a.localeCompare(b)).join(', ');
}

/**
 * Unique audio stems (filename without `.mp3` / `.wav`) from path-like strings.
 *
 * `path.basename` is applied so both local `readdir` names (`foo.mp3`) and R2
 * object keys (`beats/mp3/foo.mp3`) work. Entries that do not end with
 * `extension` (case-insensitive) are skipped.
 *
 * Example (`extension` `.mp3`):
 *   ["gunna__versace_Cmin_130.mp3", "beats/mp3/pierre_bourne__aandb_Dmin_160.mp3", "readme.txt"]
 *   → Set { "gunna__versace_Cmin_130", "pierre_bourne__aandb_Dmin_160" }
 */
function stemsFromAudioPaths(
    audioPaths: string[],
    extension: '.mp3' | '.wav'
): Set<string> {
    const stems: Set<string> = new Set<string>();
    const extensionLower: string = extension.toLowerCase();
    for (const audioPath of audioPaths) {
        const filename: string = path.basename(audioPath);
        if (!filename.toLowerCase().endsWith(extensionLower)) continue;
        stems.add(audioStem(filename));
    }
    return stems;
}

/**
 * Enforce |mp3| = |wav| = |DB rows| and stem-set equality (catches orphans and swaps).
 *
 * Set differences use {@link Set.has} (O(1) average), so this is O(n) in the number of
 * stems — not O(n²). Fine at 95 beats and still fine at a few thousand.
 */
function pushInventorySetIssues(
    issues: CatalogIssue[],
    storeLabel: 'LOCAL' | 'R2',
    dbRowCount: number,
    dbStems: Set<string>,
    mp3Stems: Set<string>,
    wavStems: Set<string>
): void {
    // Invariant: dbStems is derived from the same rows as dbRowCount, so unique
    // stems cannot exceed row count. If this fires, the caller passed mismatched args
    // (programmer error) — not a catalog data issue.
    if (dbStems.size > dbRowCount) {
        throw new Error(
            `pushInventorySetIssues: dbStems.size (${dbStems.size}) > dbRowCount (${dbRowCount}). ` +
                `The stem set must be built from those rows; this is an internal invariant, not an inventory mismatch.`
        );
    }

    const mp3Count: number = mp3Stems.size;
    const wavCount: number = wavStems.size;
    const hasDuplicateDbAudioStems: boolean = dbStems.size < dbRowCount;

    // Storage has the file; DB has no matching audio_path stem.
    const mp3StemsNotInDb: string[] = [...mp3Stems].filter((s) => !dbStems.has(s));
    const wavStemsNotInDb: string[] = [...wavStems].filter((s) => !dbStems.has(s));
    // DB has a row; storage has no matching mp3/wav file.
    const dbStemsWithoutMp3: string[] = [...dbStems].filter((s) => !mp3Stems.has(s));
    const dbStemsWithoutWav: string[] = [...dbStems].filter((s) => !wavStems.has(s));
    const mp3WithoutWav: string[] = [...mp3Stems].filter((s) => !wavStems.has(s));
    const wavWithoutMp3: string[] = [...wavStems].filter((s) => !mp3Stems.has(s));

    const setsEqual: boolean =
        mp3StemsNotInDb.length === 0 &&
        wavStemsNotInDb.length === 0 &&
        dbStemsWithoutMp3.length === 0 &&
        dbStemsWithoutWav.length === 0 &&
        mp3WithoutWav.length === 0 &&
        wavWithoutMp3.length === 0;

    if (setsEqual && !hasDuplicateDbAudioStems) return;

    const issueDetailSegments: string[] = [
        `counts dbRows=${dbRowCount} dbUniqueStems=${dbStems.size} mp3=${mp3Count} wav=${wavCount}`,
    ];
    if (hasDuplicateDbAudioStems) {
        issueDetailSegments.push('duplicate audio_path basenames in beats table');
    }
    if (mp3StemsNotInDb.length) {
        issueDetailSegments.push(
            `orphan mp3 stems (${mp3StemsNotInDb.length}): ${formatSortedStems(mp3StemsNotInDb)}`
        );
    }
    if (wavStemsNotInDb.length) {
        issueDetailSegments.push(
            `orphan wav stems (${wavStemsNotInDb.length}): ${formatSortedStems(wavStemsNotInDb)}`
        );
    }
    if (dbStemsWithoutMp3.length) {
        issueDetailSegments.push(
            `db missing mp3 (${dbStemsWithoutMp3.length}): ${formatSortedStems(dbStemsWithoutMp3)}`
        );
    }
    if (dbStemsWithoutWav.length) {
        issueDetailSegments.push(
            `db missing wav (${dbStemsWithoutWav.length}): ${formatSortedStems(dbStemsWithoutWav)}`
        );
    }
    if (mp3WithoutWav.length) {
        issueDetailSegments.push(
            `mp3 without wav (${mp3WithoutWav.length}): ${formatSortedStems(mp3WithoutWav)}`
        );
    }
    if (wavWithoutMp3.length) {
        issueDetailSegments.push(
            `wav without mp3 (${wavWithoutMp3.length}): ${formatSortedStems(wavWithoutMp3)}`
        );
    }

    issues.push({
        beatId: 'n/a',
        title: 'Catalog inventory',
        code: storeLabel === 'LOCAL' ? 'INVENTORY_MISMATCH_LOCAL' : 'INVENTORY_MISMATCH_R2',
        detail: issueDetailSegments.join('; '),
    });
}

export type RunCatalogAuditOptions = {
    storageMode: StorageMode;
    /** `full` for CLI/CI; `boot` for server startup (skips custom-cover checks). */
    profile: CatalogAuditProfile;
};

/**
 * Run a catalog consistency audit: DB beat rows vs local disk and/or R2.
 *
 * Steps:
 * 1. Fail fast if `storageMode` needs R2 but env is incomplete
 * 2. Load all `beats` rows
 * 3. Verify default skimask cover (once)
 * 4. Per beat (pooled): cover UUID / BPM / MP3 / WAV / custom cover existence
 * 5. Inventory set equality: |mp3 stems| = |wav stems| = |db stems| (catches orphans)
 *
 * Does not call `pool.end()` — CLI owns process lifetime; the server keeps the pool open.
 *
 * @param options - Required `storageMode` + `profile` (no silent defaults)
 * @returns Issues found, inventory counts, and the roots used for local paths
 */
export async function runCatalogAudit(
    options: RunCatalogAuditOptions
): Promise<CatalogAuditResult> {
    const storageMode: StorageMode = options.storageMode;
    const profile: CatalogAuditProfile = options.profile;
    const checkLocal: boolean = storageMode === 'local' || storageMode === 'both';
    const checkR2: boolean = storageMode === 'r2' || storageMode === 'both';
    // Cover UUID drift / missing custom art: full CLI only (skimask is the boot fallback).
    // BPM checks always run — boot treats them as fatal via BOOT_FATAL_ISSUE_CODES.
    const checkCoverIdentity: boolean = profile === 'full';
    const checkCustomCovers: boolean = profile === 'full';

    const configErr: string | null = r2ConfigError(storageMode);
    if (configErr) {
        throw new Error(configErr);
    }

    const { rows } = await pool.query<BeatRow>(
        'SELECT id, title, key, bpm, audio_path, cover_path FROM beats ORDER BY title'
    );

    const issues: CatalogIssue[] = [];

    // Soft-fallback cover must exist (once per run — not per beat).
    if (checkLocal && !(await localFileExists(PUBLIC_ROOT, DEFAULT_COVER))) {
        issues.push({
            beatId: 'n/a',
            title: 'Default cover',
            code: 'DEFAULT_COVER_MISSING_LOCAL',
            detail: `skimask not found under public/: ${DEFAULT_COVER}`,
        });
    }
    if (checkR2) {
        const skimaskProbe: ObjectProbe = await probePublicR2Object(DEFAULT_COVER);
        if (skimaskProbe === 'missing') {
            issues.push({
                beatId: 'n/a',
                title: 'Default cover',
                code: 'DEFAULT_COVER_MISSING_R2',
                detail: `skimask not found on public R2: ${toPublicR2ObjectPath(DEFAULT_COVER)}`,
            });
        } else if (skimaskProbe === 'error') {
            issues.push({
                beatId: 'n/a',
                title: 'Default cover',
                code: 'DEFAULT_COVER_R2_ERROR',
                detail: `Public R2 HEAD failed for skimask: ${toPublicR2ObjectPath(DEFAULT_COVER)}`,
            });
        } else if (skimaskProbe === 'unconfigured') {
            issues.push({
                beatId: 'n/a',
                title: 'Default cover',
                code: 'DEFAULT_COVER_R2_UNCONFIGURED',
                detail: 'R2_PUBLIC_URL is not configured',
            });
        }
    }

    // Local fs checks are fast — no need to parallelize. R2 HEADs benefit from a small pool.
    const concurrency = checkR2 ? 8 : 1;

    await mapPool(rows, concurrency, async (row: BeatRow) => {
        const coverPath: string = row.cover_path || DEFAULT_COVER;
        const isCustomCover: boolean = coverPath !== DEFAULT_COVER;

        // Is the cover_path's uuid equal to the beat's uuid?
        if (checkCoverIdentity && isCustomCover && hasCoverIDMismatch(row.id, coverPath)) {
            pushIssue(
                issues,
                row,
                'COVER_ID_MISMATCH',
                `cover_path does not use beat id: ${coverPath}`
            );
        }

        // Is the filename's BPM:
        // - Parseable? (i.e. it exists?)
        // - In bounds? (1 < parsed_bpm < 300)
        // - Matches the bpm claimed in DB?
        const filename: string = path.basename(row.audio_path);
        const filenameBPM: number | null = parseBPMFromAudioFilename(filename);
        if (filenameBPM === null) {
            pushIssue(
                issues,
                row,
                'AUDIO_FILENAME_UNPARSEABLE',
                `Cannot parse BPM from filename: ${filename}`
            );
        } else if (!isBPMInBounds(filenameBPM)) {
            pushIssue(
                issues,
                row,
                'AUDIO_FILENAME_BPM_OUT_OF_BOUNDS',
                `Filename BPM ${filenameBPM} outside (${BPM_MIN_EXCLUSIVE}, ${BPM_MAX_EXCLUSIVE}): ${filename}`
            );
        } else if (filenameBPM !== row.bpm) {
            pushIssue(
                issues,
                row,
                'BPM_MISMATCH',
                `DB bpm=${row.bpm} but filename implies ${filenameBPM} (${filename})`
            );
        }

        // Do the MP3 and WAV files in local disk/R2 storage bucket exist?
        const logicalWavPath: string = getWavPath(row.audio_path);
        const privateWavRel: string = localPrivateWavRelativePath(row.audio_path);

        if (checkLocal) {
            if (!(await localFileExists(PUBLIC_ROOT, row.audio_path))) {
                pushIssue(
                    issues,
                    row,
                    'MP3_MISSING_LOCAL',
                    `MP3 not found under public/: ${row.audio_path}`
                );
            }

            if (
                checkCustomCovers &&
                isCustomCover &&
                !(await localFileExists(PUBLIC_ROOT, coverPath))
            ) {
                pushIssue(
                    issues,
                    row,
                    'COVER_MISSING_LOCAL',
                    `Cover not found under public/: ${coverPath}`
                );
            }

            if (!(await localFileExists(PRIVATE_ROOT, privateWavRel))) {
                pushIssue(
                    issues,
                    row,
                    'WAV_MISSING_LOCAL',
                    `WAV not found under private/: ${privateWavRel} (from ${row.audio_path})`
                );
            }
        }

        if (checkR2) {
            const mp3Probe: ObjectProbe = await probePublicR2Object(row.audio_path);
            if (mp3Probe === 'missing') {
                pushIssue(
                    issues,
                    row,
                    'MP3_MISSING_R2',
                    `MP3 not found on public R2: ${toPublicR2ObjectPath(row.audio_path)}`
                );
            } else if (mp3Probe === 'error') {
                pushIssue(
                    issues,
                    row,
                    'MP3_R2_ERROR',
                    `Public R2 HEAD failed for MP3: ${toPublicR2ObjectPath(row.audio_path)}`
                );
            } else if (mp3Probe === 'unconfigured') {
                pushIssue(
                    issues,
                    row,
                    'MP3_R2_UNCONFIGURED',
                    `R2_PUBLIC_URL unconfigured while probing ${toPublicR2ObjectPath(row.audio_path)}`
                );
            }

            if (checkCustomCovers && isCustomCover) {
                const coverProbe: ObjectProbe = await probePublicR2Object(coverPath);
                if (coverProbe === 'missing') {
                    pushIssue(
                        issues,
                        row,
                        'COVER_MISSING_R2',
                        `Cover not found on public R2: ${toPublicR2ObjectPath(coverPath)}`
                    );
                } else if (coverProbe === 'error') {
                    pushIssue(
                        issues,
                        row,
                        'COVER_R2_ERROR',
                        `Public R2 HEAD failed for cover: ${toPublicR2ObjectPath(coverPath)}`
                    );
                } else if (coverProbe === 'unconfigured') {
                    pushIssue(
                        issues,
                        row,
                        'COVER_R2_UNCONFIGURED',
                        `R2_PUBLIC_URL unconfigured while probing ${toPublicR2ObjectPath(coverPath)}`
                    );
                }
            }

            const wavKey: string = getPrivateWavR2Key(row.audio_path);
            const wavProbe: R2WavProbe = await probePrivateR2Wav(row.audio_path);
            if (wavProbe === 'missing') {
                pushIssue(
                    issues,
                    row,
                    'WAV_MISSING_R2',
                    `WAV not found in private R2: ${wavKey} (logical ${logicalWavPath})`
                );
            } else if (wavProbe === 'error') {
                pushIssue(
                    issues,
                    row,
                    'WAV_R2_ERROR',
                    `Private R2 HEAD failed for WAV: ${wavKey}`
                );
            } else if (wavProbe === 'unconfigured') {
                pushIssue(
                    issues,
                    row,
                    'WAV_R2_UNCONFIGURED',
                    'Private R2 is not configured'
                );
            }
        }
    });

    // Do we have the same exact MP3's and WAV's both in local/r2 storage and DB?
    // That is, |mp3| = |wav| = |dbRowCount| ?
    // {mp3_1, mp3_2, ..., mp3_n} = {wav_1, wav_2, ..., wav_n} = {dbRow_1, dbRow_2, ..., dbRow_n}?
    const inventory: CatalogInventory = { dbRows: rows.length };
    const dbStems: Set<string> = new Set(rows.map((row) => audioStem(path.basename(row.audio_path))));

    if (checkLocal) {
        try {
            const mp3DirectoryEntries: string[] = await readdir(LOCAL_MP3_DIR);
            const wavDirectoryEntries: string[] = await readdir(LOCAL_WAV_DIR);
            const mp3Stems: Set<string> = stemsFromAudioPaths(mp3DirectoryEntries, '.mp3');
            const wavStems: Set<string> = stemsFromAudioPaths(wavDirectoryEntries, '.wav');
            inventory.local = { mp3Count: mp3Stems.size, wavCount: wavStems.size };
            pushInventorySetIssues(issues, 'LOCAL', rows.length, dbStems, mp3Stems, wavStems);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            issues.push({
                beatId: 'n/a',
                title: 'Catalog inventory',
                code: 'INVENTORY_LIST_ERROR_LOCAL',
                detail: `Failed to list local mp3/wav directories (${LOCAL_MP3_DIR}, ${LOCAL_WAV_DIR}): ${message}`,
            });
        }
    }

    // r2ConfigError already required R2_PUBLIC_BUCKET_NAME + private creds when checkR2.
    if (checkR2) {
        try {
            const publicBucket: string | undefined = getEnv('R2_PUBLIC_BUCKET_NAME');
            const privateBucket: string | undefined = getEnv('R2_PRIVATE_BUCKET_NAME');
            if (!publicBucket || !privateBucket) {
                issues.push({
                    beatId: 'n/a',
                    title: 'Catalog inventory',
                    code: 'INVENTORY_LIST_ERROR_R2',
                    detail: 'R2 S3 client unconfigured while listing inventory prefixes',
                });
            } else {
                const mp3Keys: string[] | null = await listR2ObjectKeys(publicBucket, 'beats/mp3/');
                const wavKeys: string[] | null = await listR2ObjectKeys(privateBucket, 'wav/');
                if (mp3Keys === null || wavKeys === null) {
                    issues.push({
                        beatId: 'n/a',
                        title: 'Catalog inventory',
                        code: 'INVENTORY_LIST_ERROR_R2',
                        detail: 'R2 S3 client unconfigured while listing inventory prefixes',
                    });
                } else {
                    const mp3Stems: Set<string> = stemsFromAudioPaths(mp3Keys, '.mp3');
                    const wavStems: Set<string> = stemsFromAudioPaths(wavKeys, '.wav');
                    inventory.r2 = {
                        mp3Count: mp3Stems.size,
                        wavCount: wavStems.size
                    };
                    pushInventorySetIssues(
                        issues,
                        'R2',
                        rows.length,
                        dbStems,
                        mp3Stems,
                        wavStems
                    );
                }
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            issues.push({
                beatId: 'n/a',
                title: 'Catalog inventory',
                code: 'INVENTORY_LIST_ERROR_R2',
                detail: `Failed to list R2 inventory prefixes beats/mp3/ and wav/: ${message}`,
            });
        }
    }

    issues.sort((a, b) => a.title.localeCompare(b.title) || a.code.localeCompare(b.code));

    return {
        storageMode: storageMode,
        profile,
        issues,
        publicRoot: PUBLIC_ROOT,
        privateRoot: PRIVATE_ROOT,
        inventory,
    };
}

/** Issues that should refuse server boot. */
export function filterBootFatalIssues(issues: CatalogIssue[]): CatalogIssue[] {
    return issues.filter((issue) => BOOT_FATAL_ISSUE_CODES.has(issue.code));
}
