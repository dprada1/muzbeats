/**
 * Audit catalog consistency: DB rows vs files on disk.
 *
 * Checks (local `public/` only — does not verify R2 copies yet):
 * - `audio_path` file exists
 * - `cover_path` file exists (skips default skimask placeholder)
 * - `cover_path` UUID matches beat id when under `/assets/images/covers/`
 * - `bpm` column matches BPM parsed from mp3 filename
 *
 * Usage:
 *   npm run audit-catalog
 *   npm run audit-catalog -- --json
 *
 * Exit code 1 when any issue is found (for CI / scripts that should fail the job).
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { access } from 'fs/promises';
import pool from '@/config/database.js';

dotenv.config();

/**
 * Absolute path of this file. Under ESM there is no `__filename`; we derive it
 * from `import.meta.url` so path math works on every OS.
 */
const __filename = fileURLToPath(import.meta.url);

/**
 * Directory containing this script (`server/src/db`), derived from `__filename`.
 */
const __dirname = path.dirname(__filename);

/**
 * Absolute path to `server/public` (two levels up from `src/db`).
 * All DB `audio_path` / `cover_path` values are URL-style paths under this root.
 */
const PUBLIC_ROOT = path.join(__dirname, '../../public');

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
 * @property code - Stable machine-readable issue class (e.g. `AUDIO_MISSING`)
 * @property detail - Extra context (paths, expected vs actual values)
 */
type Issue = {
    beatId: string;
    title: string;
    code: string;
    detail: string;
};

/**
 * Parse BPM from an mp3 basename using `artist__title_key_bpm.mp3`
 * (BPM is the segment after the last `_` in the stem).
 *
 * @param filename - Basename only (e.g. `artist__beat_Cmin_140.mp3`)
 * @returns Parsed BPM, or `null` if the name is not parseable
 */
function parseBpmFromAudioFilename(filename: string): number | null {
    if (!filename.toLowerCase().endsWith('.mp3')) return null;
    const stem = filename.slice(0, -4);
    if (!stem.includes('__')) return null;

    const lastUnderscore = stem.lastIndexOf('_');
    if (lastUnderscore <= 0 || lastUnderscore === stem.length - 1) return null;

    const bpm = Number(stem.slice(lastUnderscore + 1));
    if (!Number.isFinite(bpm)) return null;
    return bpm;
}

/**
 * Whether a BPM value is inside the catalog / DB allowed range (exclusive bounds).
 */
function isBpmInBounds(bpm: number): boolean {
    return bpm > BPM_MIN_EXCLUSIVE && bpm < BPM_MAX_EXCLUSIVE;
}

/**
 * Check whether a public URL-style path exists under `server/public`.
 *
 * `access` (from `fs/promises`) probes the filesystem; success ⇒ readable path.
 * This only checks local disk — not R2.
 *
 * @param publicRelativePath - e.g. `/assets/beats/mp3/foo.mp3`
 */
async function fileExists(publicRelativePath: string): Promise<boolean> {
    const relative = publicRelativePath.startsWith('/')
        ? publicRelativePath.slice(1)
        : publicRelativePath;
    const fullPath = path.join(PUBLIC_ROOT, relative);
    try {
        await access(fullPath);
        return true;
    } catch {
        return false;
    }
}

/**
 * True when `coverPath` is under `/assets/images/covers/` but the filename UUID
 * (basename without extension) does not equal `beatId`.
 *
 * @param beatId - Beat UUID from the DB
 * @param coverPath - Cover path from the DB (or resolved fallback)
 */
function coverIdMismatch(beatId: string, coverPath: string): boolean {
    if (!coverPath.includes('/assets/images/covers/')) {
        return false;
    }
    const base = path.basename(coverPath);
    const dot = base.lastIndexOf('.');
    const idPart = dot > 0 ? base.slice(0, dot) : base;
    return idPart !== beatId;
}

/**
 * Load all beats and report filesystem / naming inconsistencies.
 * Prints human text by default, or JSON with `--json`.
 * Ends the DB pool and exits `1` if any issues were found.
 */
async function main() {
    const jsonOutput: boolean = process.argv.includes('--json');

    const { rows } = await pool.query<BeatRow>(
        'SELECT id, title, key, bpm, audio_path, cover_path FROM beats ORDER BY title'
    );

    const issues: Issue[] = [];

    for (const row of rows) {
        const audioExists = await fileExists(row.audio_path);
        if (!audioExists) {
            issues.push({
                beatId: row.id,
                title: row.title,
                code: 'AUDIO_MISSING',
                detail: `File not found: ${row.audio_path}`,
            });
        }

        // Null/empty cover_path → treat as soft default; don't flag missing custom covers.
        const coverPath = row.cover_path || DEFAULT_COVER;
        if (coverPath !== DEFAULT_COVER) {
            const coverExists = await fileExists(coverPath);
            if (!coverExists) {
                issues.push({
                    beatId: row.id,
                    title: row.title,
                    code: 'COVER_MISSING',
                    detail: `File not found: ${coverPath}`,
                });
            }
            if (coverIdMismatch(row.id, coverPath)) {
                issues.push({
                    beatId: row.id,
                    title: row.title,
                    code: 'COVER_ID_MISMATCH',
                    detail: `cover_path does not use beat id: ${coverPath}`,
                });
            }
        }

        const filename = path.basename(row.audio_path);
        const filenameBpm = parseBpmFromAudioFilename(filename);
        if (filenameBpm === null) {
            issues.push({
                beatId: row.id,
                title: row.title,
                code: 'AUDIO_FILENAME_UNPARSEABLE',
                detail: `Cannot parse BPM from filename: ${filename}`,
            });
        } else if (!isBpmInBounds(filenameBpm)) {
            issues.push({
                beatId: row.id,
                title: row.title,
                code: 'AUDIO_FILENAME_BPM_OUT_OF_BOUNDS',
                detail: `Filename BPM ${filenameBpm} outside (${BPM_MIN_EXCLUSIVE}, ${BPM_MAX_EXCLUSIVE}): ${filename}`,
            });
        } else if (filenameBpm !== row.bpm) {
            issues.push({
                beatId: row.id,
                title: row.title,
                code: 'BPM_MISMATCH',
                detail: `DB bpm=${row.bpm} but filename implies ${filenameBpm} (${filename})`,
            });
        }
    }

    if (jsonOutput) {
        console.log(JSON.stringify({ beatCount: rows.length, issueCount: issues.length, issues }, null, 2));
    } else {
        console.log(`Audited ${rows.length} beats against ${PUBLIC_ROOT}`);
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

    // Close the pool so the process can exit (otherwise open sockets keep Node alive).
    await pool.end();

    // Non-zero exit = failure for CI / `npm run audit-catalog` callers.
    if (issues.length > 0) {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
