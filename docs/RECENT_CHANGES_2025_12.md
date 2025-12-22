# Recent Changes (Dec 2025)

This is a short “what changed” summary so you can re-orient quickly.

## Storage / R2
- Introduced **two-bucket strategy**:
  - Public: `muzbeats-media-public` (MP3 + images)
  - Private: `muzbeats-wav-private` (WAV masters)
- Standardized private WAV layout to `wav/<file>.wav` and added backwards-compatible support for legacy `beats/wav/<file>.wav`.

## Downloads
- Token-protected endpoint: `GET /api/downloads/:token`
- WAV masters are served through the protected endpoint (never publicly).
- Production-like envs refuse to fall back to MP3 for paid downloads if WAV is missing.
- Added URL normalization to handle accidental double slashes in email links.
- Downloaded filenames use canonical storage filenames (e.g. `artist__beat_key_bpm.wav`) to avoid quote/special-character issues.

## Email (Resend)
- Email links use a configurable base:
  - `EMAIL_LINK_BASE_URL` (highest priority; useful for local tunnels)
  - else `BACKEND_URL` / `FRONTEND_URL`
- Link building uses `new URL()` to avoid malformed paths.
- Receipts include Key + BPM per beat.
- Improved reliability of customer email extraction by expanding `latest_charge` (billing email fallback).

## Environments
- Staging and production are isolated by domains and DBs.
- Staging/prod downloads require private R2 env vars set.

## Beat imports
- Added CLI importer: `server/src/db/import-beats-from-filenames.ts`
  - `npm run import-beats -- --dry-run|--apply`

## Covers
- Added a deterministic cover plan and tooling:
  - `docs/COVERS_WORKFLOW.md`
  - `npm run update-covers` to set `cover_path` to `/assets/images/covers/<beatId>.webp`

## Frontend
- Added a dedicated `/store/license` page and a checkout disclosure linking to it.
- (Optional) Stripe Link can be disabled in Stripe Dashboard if you don’t want the “Save my info” UI.


