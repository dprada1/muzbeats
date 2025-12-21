/**
 * Import beats into Postgres by scanning local MP3 filenames.
 *
 * Source of truth for metadata is the filename convention:
 *   artist__beat_slug_Key_BPM.mp3
 * e.g. pierre_bourne__uncommon_Dmin_152.mp3
 *
 * This script will:
 * - parse filenames
 * - format a human title (no collabs; uses the artist slug)
 * - format a display key using ♯ / ♭ symbols (e.g. "D♯ min")
 * - insert missing beats into the `beats` table (by audio_path)
 *
 * Usage:
 *   npx tsx src/db/import-beats-from-filenames.ts --apply
 *   npx tsx src/db/import-beats-from-filenames.ts --dry-run
 *
 * Options:
 *   --dir <path>          Directory containing mp3s (default: public/assets/beats/mp3)
 *   --price <number>      Default price (default: 19.99)
 *   --cover <path>        Default cover_path (default: /assets/images/skimask.png)
 *   --apply               Perform DB inserts (default: dry-run)
 *   --limit <n>           Limit number of files processed
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdir } from 'fs/promises';
import pool from '../config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Parsed = {
    filename: string;
    artistSlug: string;
    beatSlug: string;
    keySlug: string; // e.g. Dsmin, Csmaj, Abmin, Amin
    bpm: number;
};

function parseArgs(argv: string[]) {
    const out: {
        dir: string;
        price: number;
        cover: string;
        apply: boolean;
        limit: number;
        sample: number;
        printAll: boolean;
    } = {
        dir: path.join(__dirname, '../../public/assets/beats/mp3'),
        price: 19.99,
        cover: '/assets/images/skimask.png',
        apply: false,
        limit: 0,
        sample: 12,
        printAll: false,
    };

    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--apply') out.apply = true;
        else if (a === '--dry-run') out.apply = false;
        else if (a === '--dir') out.dir = argv[++i];
        else if (a === '--price') out.price = Number(argv[++i]);
        else if (a === '--cover') out.cover = argv[++i];
        else if (a === '--limit') out.limit = Number(argv[++i]);
        else if (a === '--sample') out.sample = Number(argv[++i]);
        else if (a === '--print-all') out.printAll = true;
    }
    if (!Number.isFinite(out.price)) throw new Error('Invalid --price');
    if (!Number.isFinite(out.limit)) out.limit = 0;
    if (!Number.isFinite(out.sample)) out.sample = 12;
    return out;
}

function parseFilename(filename: string): Parsed | null {
    if (!filename.toLowerCase().endsWith('.mp3')) return null;
    const stem = filename.slice(0, -4);
    const idx = stem.indexOf('__');
    if (idx <= 0) return null;
    const artistSlug = stem.slice(0, idx);
    const rest = stem.slice(idx + 2);
    const parts = rest.split('_');
    if (parts.length < 3) return null;
    const bpm = Number(parts[parts.length - 1]);
    const keySlug = parts[parts.length - 2];
    const beatSlug = parts.slice(0, -2).join('_');
    if (!Number.isFinite(bpm) || bpm <= 0 || bpm >= 300) return null;
    if (!/^[A-G](?:s|b)?(?:maj|min)$/.test(keySlug)) return null;
    return { filename, artistSlug, beatSlug, keySlug, bpm };
}

function titleCaseWord(w: string): string {
    if (!w) return w;
    // Keep numeric words and abbreviations like "9"
    if (/^\d+$/.test(w)) return w;
    // Handle "no." and "t." style
    if (w.endsWith('.')) {
        const base = w.slice(0, -1);
        return `${base.charAt(0).toUpperCase()}${base.slice(1).toLowerCase()}.`;
    }
    return `${w.charAt(0).toUpperCase()}${w.slice(1).toLowerCase()}`;
}

function beatSlugToDisplay(beatSlug: string): string {
    // special-case A&B
    if (beatSlug === 'aandb') return 'A&B';
    const words = beatSlug.split('_').filter(Boolean);
    // Preserve tokens like "no." from "no._9" where split gives ["no.", "9"]
    return words.map(titleCaseWord).join(' ');
}

function artistSlugToDisplay(artistSlug: string): string {
    const map: Record<string, string> = {
        'pierre_bourne': 'Pierre Bourne',
        'internet_money': 'Internet Money',
        'shoreline_mafia': 'Shoreline Mafia',
        'thouxanbanfauni': 'Thouxanbanfauni',
        'playboi_carti': 'Playboi Carti',
        'tay-k': 'Tay-K',
        'mike_sherm': 'Mike Sherm',
        'gunna': 'Gunna',
        'yeat': 'Yeat',
        'cochise': 'Cochise',
        'ken_carson': 'Ken Carson',
        'lil_tecca': 'Lil Tecca',
        'lazer_dim_700': 'Lazer Dim 700',
        'hoodtrap': 'Hoodtrap',
    };
    if (map[artistSlug]) return map[artistSlug];
    // fallback: split underscores and title case
    return artistSlug.split('_').map(titleCaseWord).join(' ');
}

function keySlugToDisplay(keySlug: string): string {
    // Example keySlug: Dsmin, Csmaj, Abmin, Amin
    const m = keySlug.match(/^([A-G])(?:(s|b))?(maj|min)$/);
    if (!m) return 'Unknown';
    const root = m[1];
    const accidental = m[2]; // s or b
    const quality = m[3]; // maj|min
    const acc = accidental === 's' ? '♯' : accidental === 'b' ? '♭' : '';
    return `${root}${acc} ${quality}`;
}

function buildTitle(artistSlug: string, beatSlug: string): string {
    // No collabs by design. Always "Artist Type Beat - \"Beat Name\""
    const artist = artistSlugToDisplay(artistSlug);
    const beatName = beatSlugToDisplay(beatSlug);
    return `${artist} Type Beat - \"${beatName}\"`;
}

async function main() {
    const args = parseArgs(process.argv);
    const files = (await readdir(args.dir)).filter((f) => f.toLowerCase().endsWith('.mp3'));
    const parsed: Parsed[] = [];
    for (const f of files) {
        const p = parseFilename(f);
        if (p) parsed.push(p);
    }
    parsed.sort((a, b) => a.filename.localeCompare(b.filename));

    const limited = args.limit && args.limit > 0 ? parsed.slice(0, args.limit) : parsed;
    console.log(`Found mp3 files: ${files.length}`);
    console.log(`Parsed candidates: ${parsed.length}`);
    console.log(`Processing: ${limited.length}`);

    const rows = limited.map((p) => {
        const audioPath = `/assets/beats/mp3/${p.filename}`;
        const title = buildTitle(p.artistSlug, p.beatSlug);
        const key = keySlugToDisplay(p.keySlug);
        return {
            title,
            key,
            bpm: p.bpm,
            price: args.price,
            audio_path: audioPath,
            cover_path: args.cover,
        };
    });

    // Dry-run output
    if (!args.apply) {
        console.log('\nDRY RUN (no DB writes). Sample rows:');
        const toPrint = args.printAll ? rows : rows.slice(0, Math.max(0, args.sample));
        for (const r of toPrint) {
            console.log(`- ${r.title} | ${r.key} | ${r.bpm} | ${r.audio_path} | ${r.cover_path}`);
        }
        if (!args.printAll && rows.length > Math.max(0, args.sample)) {
            console.log(`... (${rows.length - Math.max(0, args.sample)} more not shown; use --print-all to show all)`);
        }
        console.log('\nRe-run with --apply to insert missing beats into Postgres.');
        return;
    }

    console.log('\nApplying inserts...');
    let inserted = 0;
    let skipped = 0;

    for (const r of rows) {
        // Skip if audio_path already exists
        const exists = await pool.query('SELECT id FROM beats WHERE audio_path = $1 LIMIT 1', [r.audio_path]);
        if (exists.rows.length > 0) {
            skipped++;
            continue;
        }

        await pool.query(
            `INSERT INTO beats (title, key, bpm, price, audio_path, cover_path)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [r.title, r.key, r.bpm, r.price, r.audio_path, r.cover_path]
        );
        inserted++;
    }

    console.log(`✅ Done. Inserted: ${inserted}, skipped(existing): ${skipped}`);
    await pool.end();
}

main().catch(async (err) => {
    console.error('❌ import-beats-from-filenames failed:', err);
    try {
        await pool.end();
    } catch {}
    process.exit(1);
});


