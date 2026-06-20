# Backend Review & Hardening Roadmap

Master checklist for reviewing the MuzBeats server, then implementing security, validation, and live payments.

**How to use:** Work top to bottom. Review phases (1–6) are read-and-understand; implementation phases (7–8) are code changes. Check boxes as you go.

**Related docs:**
- [BACKEND_FIRST_PRINCIPLES.md](./BACKEND_FIRST_PRINCIPLES.md) — `index.ts` walkthrough
- [BACKEND_FLOW_EXPLANATION.md](./BACKEND_FLOW_EXPLANATION.md) — request flows (beats, checkout, download)
- [SERVER_SECURITY_REVIEW.md](../SERVER_SECURITY_REVIEW.md) — security audit checklist

---

## Phase 0 — Anchor (`index.ts` + skim docs)

- [x] Read `server/src/index.ts` — middleware order, CORS, static assets, route mounting
- [x] Understand `app` vs `Router` delegation
- [x] Skim [BACKEND_FIRST_PRINCIPLES.md](./BACKEND_FIRST_PRINCIPLES.md) (updated for fail-fast DB init + CORS design)
- [x] Skim [BACKEND_FLOW_EXPLANATION.md](./BACKEND_FLOW_EXPLANATION.md) — architecture + three main flows

---

## Phase 1 — Beats route (complete vertical slice)

### Route
- [x] `server/src/routes/beatsRoutes.ts` — route order (`/` before `/:id`)

### Controller (line-by-line)
- [x] `server/src/controllers/beatsController.ts`
  - [x] `getBeatsHandler` — `q` vs individual params; always builds a (possibly empty) `searchParams`
  - [x] `getBeatByIdHandler` — param validation, 400 / 404 / 500 paths

### Utils (search logic)
- [x] `server/src/types/SearchParams.ts`
- [x] `server/src/utils/searchParser.ts` — raw query → `SearchParams`
- [x] `server/src/utils/searchQueryBuilder.ts` — `SearchParams` → SQL `WHERE` (refactored: canonical keys via `ANY`, title via `LIKE ALL`)
- [x] `server/src/utils/keyUtils.ts` — key normalization, enharmonics (+ `denormalizeKeyNotation` round-trip)
- [ ] `server/src/__tests__/search/**` — treat 519 tests as the spec _(deferred: deeper pass + JSON→YAML eval later)_

### Service + types
- [x] `server/src/services/beatsService.ts` — `mapDbRowToBeat`, queries, R2 URLs
- [x] `server/src/types/Beat.ts` — API shape vs DB columns
- [x] `server/src/utils/r2.ts` — public MP3 URLs vs private WAV

### Frontend mirror (optional, quick)
- [ ] `client/src/pages/StorePage.tsx` — sends `?q=` only
- [ ] `client/src/pages/BeatDetail.tsx` — single beat by ID

**Phase 1 done when:** You can trace `GET /api/beats?q=...` from browser → SQL → JSON.

---

## Phase 2 — Download route (security-sensitive)

### Route
- [ ] `server/src/routes/downloadRoutes.ts`

### Controller
- [ ] `server/src/controllers/downloadController.ts` — token validation, WAV vs MP3, R2 stream vs local file

### Service + types
- [ ] `server/src/services/downloadService.ts` — token limits, private R2, `hasWavFile`
- [ ] `server/src/types/Order.ts` — `DownloadToken` shape

### Gaps to note while reviewing
- [ ] No server-side rate limiting on `GET /api/downloads/:token`
- [ ] Prod refuses MP3 fallback — confirm private R2 is configured on Railway

**Phase 2 done when:** You understand token → validate → stream/redirect end-to-end.

---

## Phase 3 — Checkout route (money path)

### Route
- [ ] `server/src/routes/checkoutRoutes.ts` — `/config`, create / capture / get order

### Controller
- [ ] `server/src/controllers/paypalController.ts` — create → capture → idempotency → email

### Services (read in order)
- [ ] `server/src/services/paypalService.ts` — **`orderDataStore` in-memory Map** (production risk)
- [ ] `server/src/services/orderService.ts` — DB transaction: orders, order_items, downloads
- [ ] `server/src/services/emailService.ts` — Resend, download links, `EMAIL_ALLOWLIST`

### Config + types
- [ ] `server/src/config/paypal.ts` — sandbox vs live (`PAYPAL_MODE`)
- [ ] `server/src/types/Order.ts`

### Frontend mirror (optional)
- [ ] `client/src/components/checkout/PayPalCheckoutButton.tsx`
- [ ] `client/src/pages/CartPage.tsx`, `CheckoutSuccessPage.tsx`

**Phase 3 done when:** You can trace cart → PayPal → capture → DB rows → email.

---

## Phase 4 — Webhook route (stub today)

- [ ] `server/src/routes/webhookRoutes.ts` — empty; registered before `express.json()` for raw body
- [ ] Decide: PayPal webhooks needed for live? (`PAYMENT.CAPTURE.COMPLETED`, disputes)
- [ ] Plan: signature verification, idempotent order creation
- [ ] `server/src/__tests__/webhook/*` — test helpers only

---

## Phase 5 — Shared server layers

### Config
- [ ] `server/src/config/database.ts` — pool, SSL, Railway vs local
- [ ] `server/src/config/paypal.ts`

### Sweep
- [ ] All controllers — consistent error shapes
- [ ] All services — return types, transactions, logging
- [ ] All types — align with `initializeDatabase.ts` / `schema.sql`
- [ ] All utils — `r2.ts`, search stack

---

## Phase 6 — Tests & DB (supporting layer)

### Tests
- [x] Search parser — 519 tests, strong coverage
- [ ] Integration tests: beats API, download token flow, checkout capture (mock PayPal)
- [ ] Webhook tests (after Phase 4 implementation)

### DB
- [ ] `server/src/db/initializeDatabase.ts` — runtime schema bootstrap
- [ ] `server/src/db/schema.sql` — reference schema
- [ ] Skim migration/import scripts only when needed for catalog ops

---

## Phase 7 — Security hardening (implement after review)

| Priority | Item | Status |
|----------|------|--------|
| High | Server rate limiting (`express-rate-limit`) | Missing |
| High | Input validation on API (Zod, mirror client) | Partial / manual |
| High | Replace in-memory `orderDataStore` with DB or Redis | In-memory |
| High | PayPal webhooks + signature verification | Not implemented |
| Medium | Security headers (`helmet`) | Missing |
| Medium | Sanitized error responses | Partial |
| Medium | `npm audit` (server + client) | Periodic |
| Medium | Download endpoint rate limit | Missing |
| Low | Startup env validation (`PAYPAL_*`, `R2_*`, DB) | Warn-only |
| Low | Request logging / monitoring | Minimal |

### Also easy to miss
- [ ] CORS allowlist for production domains (Railway env, not only local `.env`)
- [ ] `EMAIL_ALLOWLIST` behavior in staging
- [ ] Private R2 credentials never in client env
- [ ] Health endpoint DB check (optional)

See [SERVER_SECURITY_REVIEW.md](../SERVER_SECURITY_REVIEW.md) for detailed action items.

---

## Phase 8 — Live PayPal (after security basics)

- [ ] Live PayPal app credentials in Railway (separate from sandbox)
- [ ] `PAYPAL_MODE=live` in production only; staging stays sandbox
- [ ] Frontend PayPal client ID matches live app
- [ ] End-to-end: create → approve → capture → DB → email → download
- [ ] Webhook endpoint registered in PayPal dashboard
- [ ] Refund/dispute process documented (even if manual at first)

---

## Phase 9 — Docs & scripts

### Docs
- [ ] Keep [CODEBASE_OVERVIEW.md](./CODEBASE_OVERVIEW.md) in sync
- [ ] [BACKEND_FIRST_PRINCIPLES.md](./BACKEND_FIRST_PRINCIPLES.md)
- [ ] [BACKEND_FLOW_EXPLANATION.md](./BACKEND_FLOW_EXPLANATION.md)
- [ ] [api/BEATS_API.md](./api/BEATS_API.md)
- [ ] [SERVER_SECURITY_REVIEW.md](../SERVER_SECURITY_REVIEW.md) — check off as fixed

### Scripts
- [ ] `scripts/find-missing-covers.ts`, `check-cover-mismatch.ts` — `npx tsx --tsconfig scripts/tsconfig.json ...`
- [ ] Shell scripts in `scripts/` — R2 upload/sync (ops, not runtime)

---

## Suggested session order

| Session | Focus |
|---------|--------|
| ~~1~~ ✅ | Phase 0–1 complete (beats route reviewed + key search refactor) |
| **Now** | Phase 2: download route |
| **3** | Phase 3: checkout + PayPal |
| **4** | Phase 4–5: webhooks plan + config sweep |
| **5** | Phase 7: rate limiting + Zod on checkout/download |
| **6** | Phase 8: live PayPal on staging, then production |
