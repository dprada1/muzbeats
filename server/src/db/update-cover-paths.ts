import dotenv from 'dotenv';
import pool from '@/config/database.js';

dotenv.config();

type Args = {
    apply: boolean;
    prefix: string; // e.g. "/assets/images/covers"
    ext: string; // e.g. "webp"
    onlyMissing: boolean;
};

function parseArgs(argv: string[]): Args {
    const out: Args = {
        apply: false,
        prefix: '/assets/images/covers',
        ext: 'webp',
        onlyMissing: false,
    };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--apply') out.apply = true;
        else if (a === '--dry-run') out.apply = false;
        else if (a === '--prefix') out.prefix = argv[++i] || out.prefix;
        else if (a === '--ext') out.ext = (argv[++i] || out.ext).replace(/^\./, '');
        else if (a === '--only-missing') out.onlyMissing = true;
        else if (a === '--help' || a === '-h') {
            console.log(`
Update cover_path for beats (recommended unique-cover naming by beat UUID)

Usage:
  tsx src/db/update-cover-paths.ts [--dry-run|--apply] [--prefix <path>] [--ext webp] [--only-missing]

Defaults:
  --dry-run
  --prefix /assets/images/covers
  --ext webp

What it does:
  Sets cover_path = "<prefix>/<beat_id>.<ext>" (e.g. /assets/images/covers/3b3f...-....webp)

Notes:
  - This only updates the database. You must upload the corresponding images to the public R2 bucket:
      images/covers/<beat_id>.<ext>
`);
            process.exit(0);
        }
    }

    // normalize prefix
    out.prefix = out.prefix.startsWith('/') ? out.prefix : `/${out.prefix}`;
    out.prefix = out.prefix.endsWith('/') ? out.prefix.slice(0, -1) : out.prefix;
    return out;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const where = args.onlyMissing ? "WHERE cover_path IS NULL OR cover_path = ''" : '';
    const beats = await pool.query(`SELECT id, cover_path FROM beats ${where} ORDER BY created_at DESC`);

    const updates = beats.rows.map((b: any) => {
        const id = String(b.id);
        const coverPath = `${args.prefix}/${id}.${args.ext}`;
        return { id, coverPath, prev: b.cover_path as string };
    });

    console.log(`Found beats to update: ${updates.length}`);
    console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY RUN'}`);
    console.log(`Example cover_path: ${updates[0]?.coverPath ?? '(none)'}`);

    if (!args.apply) {
        // Print a small sample
        for (const u of updates.slice(0, 10)) {
            console.log(`- ${u.id}: ${u.prev} -> ${u.coverPath}`);
        }
        if (updates.length > 10) console.log(`... (${updates.length - 10} more)`);
        process.exit(0);
    }

    let updated = 0;
    for (const u of updates) {
        await pool.query('UPDATE beats SET cover_path = $1, updated_at = NOW() WHERE id = $2', [
            u.coverPath,
            u.id,
        ]);
        updated++;
    }

    console.log(`✅ Done. Updated cover_path for ${updated} beats.`);
    process.exit(0);
}

main().catch((err) => {
    console.error('update-cover-paths error:', err);
    process.exit(1);
});


