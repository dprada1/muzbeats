# Staging Setup (`staging.prodmuz.com`)

Goal: a **production-like** environment for testing without affecting real customers.

## What staging includes
- **Frontend**: `https://staging.prodmuz.com`
- **Backend API**: `https://api-staging.prodmuz.com`
- **Database**: separate Postgres (no shared data with production)
- **Stripe**: **test mode** keys
- **Email**: real sending domain, but restricted with `EMAIL_ALLOWLIST` (recommended)

---

## 1) Git branch
Staging deploys from the `staging` branch.

---

## 2) Cloudflare Pages (frontend)
Create a second Pages project (recommended):

1. Cloudflare → **Workers & Pages** → **Create application** → **Pages**
2. Connect repo: `dprada1/muzbeats`
3. **Project name**: `muzbeats-staging`
4. **Production branch**: `staging`
5. **Build settings** (same as prod):
   - Root directory: `client`
   - Build command: `npm run build`
   - Output directory: `dist`

### Pages environment variables (Production)
- `VITE_API_URL=https://api-staging.prodmuz.com`
- `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`

### Custom domain
Add custom domain in the Pages project:
- `staging.prodmuz.com`

Cloudflare will create the DNS record automatically, or you can add:
- `CNAME staging` → `<your-pages-staging>.pages.dev` (Proxied)

---

## 3) Railway (backend)
Create a second Railway service (recommended) for staging:

1. Railway → Project → **New Service** → from GitHub repo
2. Use the same repo, but set **branch** to `staging`
3. Add a new **PostgreSQL** instance for staging (separate from prod)

### Backend service environment variables (staging)
Required:
- `DATABASE_URL` (from the staging Postgres service)
- `PORT` (Railway provides; if you set it, match Railway port)
- `BACKEND_URL=https://api-staging.prodmuz.com`
- `FRONTEND_URL=https://staging.prodmuz.com`
- `CORS_ALLOWED_ORIGINS=https://staging.prodmuz.com`

Stripe (test mode):
- `STRIPE_SECRET_KEY=sk_test_...`

Resend (verified domain):
- `RESEND_API_KEY=re_...`
- `RESEND_FROM_EMAIL=MuzBeats <noreply@prodmuz.com>`
- `RESEND_REPLY_TO_EMAIL=support@prodmuz.com` (optional)

Strongly recommended safety:
- `EMAIL_ALLOWLIST=your_email@gmail.com`
  - Prevents staging from emailing random addresses during tests.

Assets:
- `R2_PUBLIC_URL=https://pub-...r2.dev`

Private WAV bucket (if using protected WAV downloads in staging too):
- `R2_PRIVATE_BUCKET_NAME=...`
- `R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com`
- `R2_ACCESS_KEY_ID=...`
- `R2_SECRET_ACCESS_KEY=...`

### Custom domain for staging API
In Railway, add custom domain:
- `api-staging.prodmuz.com`

In Cloudflare DNS (if Railway doesn’t auto-create it):
- `CNAME api-staging` → `<your-railway-service>.up.railway.app` (Proxied)

---

## 4) Verification checklist
After both deploy:
- `https://staging.prodmuz.com` loads
- `https://api-staging.prodmuz.com/health` returns OK
- Store loads beats
- Checkout works with **test cards**
- Email arrives only to the allowlisted address
- Download links successfully download (token exists in staging DB)


