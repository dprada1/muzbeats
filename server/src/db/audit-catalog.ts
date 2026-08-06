/**
 * Audit catalog consistency: DB rows vs local disk and/or R2.
 *
 * Always checks (no storage I/O beyond DB):
 * - `cover_path` UUID matches beat id when under `/assets/images/covers/`
 * - `bpm` column matches BPM parsed from mp3 filename (parse / bounds / mismatch)
 *
 * Storage checks (gated by mode):
 * - local: MP3 + cover under `server/public/`; WAV under `server/private/beats/wav/`
 * - r2: public MP3/cover via HTTP HEAD on `R2_PUBLIC_URL`; private WAV via S3 HeadObject
 *
 * Usage:
 *   npm run audit-catalog
 *   npm run audit-catalog -- --json
 *   npm run audit-catalog -- --local-only
 *   npm run audit-catalog -- --r2
 *   npm run audit-catalog -- --both --json
 *
 * Default storage mode: `local` (safe for laptop without R2).
 * Exit code 1 when any issue is found (for CI).
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { access } from 'fs/promises';
import pool from '@/config/database.js';
import {
    getWavPath,
    getPrivateWavR2Key,
    isR2PrivateConfigured,
    probePrivateR2Wav,
    R2WavProbe,
} from '@/services/downloadService.js';
import { isR2PublicConfigured } from '@/utils/r2.js';

dotenv.config();

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
type Issue = {
    beatId: string;
    title: string;
    code: string;
    detail: string;
};

/** Which object stores to probe for MP3 / cover / WAV files. */
type StorageMode = 'local' | 'r2' | 'both';

/** Existence probe that distinguishes missing from config/API failures. */
type ObjectProbe = 'exists' | 'missing' | 'unconfigured' | 'error';

/**
 * Parse `--local-only` / `--r2` / `--both` from argv.
 * `--both` wins if combined with others. Default: `local`.
 */
function parseStorageMode(argv: string[]): StorageMode {
    if (argv.includes('--both')) return 'both';
    if (argv.includes('--r2')) return 'r2';
    if (argv.includes('--local-only')) return 'local';
    return 'local';
}

function stripLeadingSlash(p: string): string {
    return p.startsWith('/') ? p.slice(1) : p;
}

/**
 * Parse BPM from an mp3 basename using `artist__title_key_bpm.mp3`
 * (BPM is the segment after the last `_` in the stem).
 *
 * @param filename - Basename only (e.g. `artist__beat_Cmin_140.mp3`)
 * @returns Parsed BPM, or `null` if the name is not parseable
 */
function parseBpmFromAudioFilename(filename: string): number | null {
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
function isBpmInBounds(bpm: number): boolean {
    return bpm > BPM_MIN_EXCLUSIVE && bpm < BPM_MAX_EXCLUSIVE;
}

/**
 * Local path under `server/private` for a WAV master.
 * `/assets/beats/wav/foo.wav` → `private/beats/wav/foo.wav`
 */
function localPrivateWavRelativePath(audioPath: string): string {
    const logicalWav: string = getWavPath(audioPath); // /assets/beats/wav/foo.wav
    const withoutAssetsPrefix: string = logicalWav.replace(/^\/?assets/, '');
    return stripLeadingSlash(withoutAssetsPrefix); // beats/wav/foo.wav
}

/**
 * Check whether a file exists under a filesystem root.
 *
 * @param root - Absolute directory (e.g. PUBLIC_ROOT)
 * @param urlStylePath - Path with or without leading `/`
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
    const base: string | undefined = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
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
function coverIdMismatch(beatId: string, coverPath: string): boolean {
    if (!coverPath.includes('/assets/images/covers/')) {
        return false;
    }
    const base: string = path.basename(coverPath);
    const dot: number = base.lastIndexOf('.');
    const idPart: string = dot > 0 ? base.slice(0, dot) : base;
    return idPart !== beatId;
}

function pushIssue(
    issues: Issue[],
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

/**
 * Fail fast when the chosen mode needs R2 but env is incomplete.
 * @returns Error message, or `null` if OK to proceed
 */
function r2ConfigError(mode: StorageMode): string | null {
    if (mode === 'local') return null;

    const needPrivate: boolean = !isR2PrivateConfigured();
    const needPublic: boolean = !isR2PublicConfigured();
    if (!needPrivate && !needPublic) return null;

    const missing: string[] = [];
    if (needPrivate) {
        missing.push(
            'private R2 (R2_PRIVATE_BUCKET_NAME, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)'
        );
    }
    if (needPublic) {
        missing.push('public R2 (R2_PUBLIC_URL)');
    }
    return `Storage mode "${mode}" requires R2 configuration; missing: ${missing.join('; ')}`;
}

/**
 * Load all beats and report filesystem / R2 / naming inconsistencies.
 */
async function main() {
    const argv: string[] = process.argv;
    const jsonOutput: boolean = argv.includes('--json');
    const mode: StorageMode = parseStorageMode(argv);
    const checkLocal: boolean = mode === 'local' || mode === 'both';
    const checkR2: boolean = mode === 'r2' || mode === 'both';

    const configErr: string | null = r2ConfigError(mode);
    if (configErr) {
        console.error(configErr);
        await pool.end().catch(() => {});
        process.exit(1);
    }

    const { rows } = await pool.query<BeatRow>(
        'SELECT id, title, key, bpm, audio_path, cover_path FROM beats ORDER BY title'
    );

    const issues: Issue[] = [];

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
            // Defensive: r2ConfigError should have exited already.
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

        // --- Logical checks (always) ---
        if (isCustomCover && coverIdMismatch(row.id, coverPath)) {
            pushIssue(
                issues,
                row,
                'COVER_ID_MISMATCH',
                `cover_path does not use beat id: ${coverPath}`
            );
        }

        const filename: string = path.basename(row.audio_path);
        const filenameBpm: number | null = parseBpmFromAudioFilename(filename);
        if (filenameBpm === null) {
            pushIssue(
                issues,
                row,
                'AUDIO_FILENAME_UNPARSEABLE',
                `Cannot parse BPM from filename: ${filename}`
            );
        } else if (!isBpmInBounds(filenameBpm)) {
            pushIssue(
                issues,
                row,
                'AUDIO_FILENAME_BPM_OUT_OF_BOUNDS',
                `Filename BPM ${filenameBpm} outside (${BPM_MIN_EXCLUSIVE}, ${BPM_MAX_EXCLUSIVE}): ${filename}`
            );
        } else if (filenameBpm !== row.bpm) {
            pushIssue(
                issues,
                row,
                'BPM_MISMATCH',
                `DB bpm=${row.bpm} but filename implies ${filenameBpm} (${filename})`
            );
        }

        const logicalWavPath: string = getWavPath(row.audio_path);
        const privateWavRel: string = localPrivateWavRelativePath(row.audio_path);

        // --- Local disk ---
        if (checkLocal) {
            if (!(await localFileExists(PUBLIC_ROOT, row.audio_path))) {
                pushIssue(
                    issues,
                    row,
                    'MP3_MISSING_LOCAL',
                    `MP3 not found under public/: ${row.audio_path}`
                );
            }

            if (isCustomCover && !(await localFileExists(PUBLIC_ROOT, coverPath))) {
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

        // --- R2 ---
        // Note: mode that needs R2 already passed r2ConfigError; "unconfigured" below is a safety net only.
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

            if (isCustomCover) {
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

    // Concurrent workers push in nondeterministic order; sort for stable CLI/JSON output.
    issues.sort((a, b) => a.title.localeCompare(b.title) || a.code.localeCompare(b.code));

    if (jsonOutput) {
        console.log(
            JSON.stringify(
                {
                    storageMode: mode,
                    beatCount: rows.length,
                    issueCount: issues.length,
                    publicRoot: PUBLIC_ROOT,
                    privateRoot: PRIVATE_ROOT,
                    issues,
                },
                null,
                2
            )
        );
    } else {
        console.log(`Audited ${rows.length} beats (storage mode: ${mode})`);
        if (checkLocal) {
            console.log(`  local public:  ${PUBLIC_ROOT}`);
            console.log(`  local private: ${PRIVATE_ROOT}`);
        }
        if (checkR2) {
            console.log(`  public R2:  ${process.env.R2_PUBLIC_URL ?? '(unset)'}`);
            console.log(`  private R2: ${process.env.R2_PRIVATE_BUCKET_NAME ?? '(unset)'}`);
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

    await pool.end();

    if (issues.length > 0) {
        process.exit(1);
    }
}

main().catch(async (err) => {
    console.error(err);
    try {
        await pool.end();
    } catch {
        /* ignore */
    }
    process.exit(1);
});
