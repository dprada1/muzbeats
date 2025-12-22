# Covers workflow (unique cover art per beat)

## Goal
- Every beat has a **unique** cover image.
- Covers are **public** (safe) and should visually match your YouTube thumbnails.
- Covers should be **stable** even if titles/keys/BPM change.

## Recommended naming (stable + scalable)
Use the beat UUID (database `beats.id`) as the canonical cover filename:

- **DB**: `cover_path = /assets/images/covers/<beat_id>.webp`
- **Public R2 bucket** (`muzbeats-media-public`):
  - object key: `images/covers/<beat_id>.webp`

Why UUID?
- Stable over time (renaming a beat doesn’t force image renames).
- No special characters, no OS quirks.
- Avoids coupling to title/key/bpm changes.

## Step 1 — Prepare images locally
Create a local folder (NOT committed) with final webp covers named by beat UUID:

```
covers/
  <beat_id_1>.webp
  <beat_id_2>.webp
  ...
```

Tip: standardize size (e.g. 512×512 or 1024×1024) and keep file sizes reasonable.

## Step 2 — Upload covers to public R2
Use AWS CLI sync (exclude macOS `.DS_Store`):

```bash
ENDPOINT="https://<your-account-id>.r2.cloudflarestorage.com"

aws s3 sync "./covers" "s3://muzbeats-media-public/images/covers" \
  --endpoint-url "$ENDPOINT" \
  --exclude ".DS_Store" --exclude "*/.DS_Store"
```

## Step 3 — Update DB cover_path values
Run the DB updater (dry-run first):

```bash
cd server
DATABASE_URL="postgresql://..." npm run update-covers
```

Apply:

```bash
cd server
DATABASE_URL="postgresql://..." npm run update-covers -- --apply
```

This sets:
`cover_path = /assets/images/covers/<beat_id>.webp`

## Step 4 — Verify in staging
- Open `staging.prodmuz.com`
- Hard refresh
- Confirm covers load for a handful of beats (and in the player bar)


