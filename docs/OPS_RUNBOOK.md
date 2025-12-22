# Ops Runbook (MuzBeats)

This doc captures the “mundane but critical” operational details that make the app work in production/staging.
It avoids secrets—only names and expected values/behaviors.

## Environments

- **Production**
  - **Frontend**: `prodmuz.com` / `www.prodmuz.com`
  - **Backend**: `api.prodmuz.com`
- **Staging**
  - **Frontend**: `staging.prodmuz.com`
  - **Backend**: `api-staging.prodmuz.com`

## Storage (Cloudflare R2)

### Buckets
- **Public bucket**: `muzbeats-media-public`
  - `beats/mp3/*.mp3` (public previews)
  - `images/**` (public images/covers/logo/etc.)
- **Private bucket**: `muzbeats-wav-private`
  - `wav/*.wav` (private masters)

### Why two buckets?
- MP3 previews + images are intentionally public for the store UI.
- WAV masters must remain private and only be served through the token-protected download endpoint.

### URL mapping behavior
- **Backend API returns MP3 and images as public R2 URLs** (via `R2_PUBLIC_URL`)
- **WAV paths are never public URLs**; WAV is streamed from the private bucket by the backend when a valid token is used.

## Purchases & Downloads (Stripe + token downloads)

### High-level flow
- Client creates a Stripe PaymentIntent: `POST /api/checkout/create-payment-intent`
- When payment succeeds:
  - Server creates `orders`, `order_items`, and `downloads` rows
  - Server sends a Resend email with token links
- Customer downloads via: `GET /api/downloads/:token`

### Critical security rule
**Paid downloads must serve WAV masters** (not the public MP3 preview).  
If a WAV is not available in a production-like environment, the API returns an error rather than silently falling back to MP3.

### Double-slash safety
The server normalizes accidental double slashes in incoming URLs (e.g. `//api/downloads/...`) to avoid “Cannot GET //api/...”.

## Email (Resend)

### Required production variables
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` must be a **verified domain** sender (e.g. `MuzBeats <noreply@prodmuz.com>`)
- `BACKEND_URL` should be set (e.g. `https://api.prodmuz.com`) so email links aren’t `localhost`

### Email link base override (useful in local dev)
Emails can’t reliably target `localhost`. For local testing, tunnel the backend and set:
- `EMAIL_LINK_BASE_URL=https://<public-tunnel-host>`

This forces email links to point at your tunneled local server (so download tokens exist in your local DB).

## Backend environment variables (Railway)

### Public media (MP3/images)
- `R2_PUBLIC_URL` = Cloudflare “Public bucket dev URL” for `muzbeats-media-public`
  - Used to serve MP3 previews + images

### Private WAVs (masters)
Set all four or WAV downloads won’t work:
- `R2_PRIVATE_BUCKET_NAME=muzbeats-wav-private`
- `R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com`
- `R2_ACCESS_KEY_ID=...`
- `R2_SECRET_ACCESS_KEY=...`

## Database

### Source of truth
PostgreSQL is the source of truth for beats and purchase state.

### Import beats from filenames
Server script:
- `npm run import-beats -- --dry-run` (default)
- `npm run import-beats -- --apply`

The importer parses filenames like:
`artist__beat_key_bpm.mp3`

## Covers
See `COVERS_WORKFLOW.md` for the current plan:
- Upload public covers to `muzbeats-media-public/images/covers/<beatId>.webp`
- Update DB `cover_path` to `/assets/images/covers/<beatId>.webp`


