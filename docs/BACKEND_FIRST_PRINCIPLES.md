# Backend First Principles: Walking Through `server/src/index.ts`

This document walks through the backend entry point **in execution order**—the order in which code actually runs when you start the server.

---

## How Node runs this file

1. Node loads `index.ts` (or `dist/index.js` in production).
2. **Imports** run first (top to bottom). Each imported module runs its own code; that can trigger more imports (e.g. `@/config/database.js` creates the PostgreSQL pool when first imported).
3. **Top-level code** runs next (e.g. `dotenv.config()`, `const app = express()`, `getAllowedOrigins()`).
4. **`initializeDatabase().then(...).catch(...)`** runs last. The server only calls `app.listen()` after DB init succeeds. On failure, the process exits.

So the real execution order is: **imports → env + app setup → middleware + routes → DB init → listen (or exit)**.

---

## 1. Imports (lines 1–10)

```ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import beatsRoutes from '@/routes/beatsRoutes.js';
import checkoutRoutes from '@/routes/checkoutRoutes.js';
import webhookRoutes from '@/routes/webhookRoutes.js';
import downloadRoutes from '@/routes/downloadRoutes.js';
import { initializeDatabase } from '@/db/initializeDatabase.js';
```

- **express** – Web framework: routing, middleware, `req`/`res`, `listen()`.
- **cors** – Middleware that sets CORS headers so the browser allows the frontend (different origin) to call this API.
- **dotenv** – Used on line 13; loads `.env` into `process.env`.
- **path**, **fileURLToPath** – For building file paths. ESM has no `__dirname`, so we derive it from `import.meta.url`.
- **beatsRoutes, checkoutRoutes, webhookRoutes, downloadRoutes** – Routers that define sub-routes (e.g. `/api/beats`, `/api/checkout`). Importing them doesn’t handle requests yet; that happens when we call `app.use(...)`.
- **initializeDatabase** – Shared schema bootstrap from `@/db/initializeDatabase.js` (also used by `npm run init-db`). Importing this module does **not** run init yet; it only loads the function.

The `.js` in import paths is intentional: TypeScript compiles to `.js`, and ESM resolves by the emitted file name.

---

## 2. Load environment variables (lines 12–13)

```ts
dotenv.config();
```

- Reads `.env` in the current working directory and assigns variables to `process.env`.
- No `.env` or missing file is not an error; it just means only already-set env vars (e.g. from the shell or Railway) are used.
- **Security:** Secrets (DB URL, PayPal keys, etc.) should live in env, not in code. `.env` is gitignored.

---

## 3. `__dirname` for ESM (lines 15–16)

```ts
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

- In CommonJS you’d have `__dirname` automatically. In ESM you don’t, so we get the current file path from `import.meta.url` (a URL) and convert it to a file path, then take its directory.
- Used later to build paths like `path.join(__dirname, '../public/assets')` for static files.

---

## 4. Create the app and PORT (lines 18–19)

```ts
const app = express();
const PORT = process.env.PORT || 3000;
```

- **app** – The Express application. All middleware and routes are attached to it; `app.listen(PORT)` starts the HTTP server.
- **PORT** – Port the server will listen on. Railway/cloud set `process.env.PORT`; locally it defaults to 3000.

---

## 5. Database initialization (`@/db/initializeDatabase.ts`)

`index.ts` does **not** define schema logic inline. It imports `initializeDatabase` from `@/db/initializeDatabase.js`. That module is called at the bottom of `index.ts` (see section 11).

What `initializeDatabase()` does when called:

1. **Check all four required tables** — `beats`, `orders`, `order_items`, `downloads` (not just `beats`).
2. **If any are missing**, run `CREATE TABLE IF NOT EXISTS` for the full schema plus indexes on `beats(bpm)`, `beats(key)`, `beats(price)`.
3. **Re-check** that all four tables exist after creation (`assertSchemaComplete`).
4. **On error** it **throws**. `index.ts` catches that, logs, and calls **`process.exit(1)`** — the server does **not** start with a broken or partial schema.

So: **first time against an empty DB, this creates the schema. After that, it logs “schema ready” and returns.** Same function powers `npm run init-db`.

---

## 6. CORS configuration (lines 21–59)

```ts
function getAllowedOrigins(): string[] { ... }
const allowedOrigins = getAllowedOrigins();
app.use(cors({ origin: function (origin, callback) { ... }, methods: [...], allowedHeaders: [...] }));
```

### Design: env override, hardcoded fallback

`getAllowedOrigins()` uses a **two-tier** pattern (this is intentional):

1. **If `CORS_ALLOWED_ORIGINS` is set and non-empty** — split by comma, trim, use that list. Typical on **Railway** (staging/production env vars), not necessarily in local `.env`.
2. **Otherwise** — use the hardcoded default list (localhost dev ports + deployed frontend URLs).

If your local `server/.env` does **not** define `CORS_ALLOWED_ORIGINS`, the `if` branch is skipped and the **defaults are used**. That is correct for local dev: you get working CORS without extra config. You do **not** need to duplicate the default list in `.env` unless you want to override it (e.g. test a new preview URL).

To override locally or on Railway:

```env
CORS_ALLOWED_ORIGINS=https://www.prodmuz.com,https://staging.prodmuz.com
```

See also `docs/STAGING_SETUP.md` for staging values.

### What the cors middleware does

- **origin:** For each request, checks the `Origin` header. No origin (curl, server-to-server) → allowed. Origin in `allowedOrigins` → allowed. Otherwise → CORS error in the browser.
- **methods:** GET, POST, PUT, DELETE, OPTIONS.
- **allowedHeaders:** `Content-Type`, `Authorization`.

So: **only frontends from allowed origins can call this API from the browser.**

---

## 7. Body parsing and URL normalization (lines 60–69)

```ts
app.use(express.urlencoded({ extended: true }));
// ...
app.use((req, _res, next) => {
    if (req.url.includes('//')) {
        req.url = req.url.replace(/\/{2,}/g, '/');
    }
    next();
});
```

- **express.urlencoded** – Parses `application/x-www-form-urlencoded` bodies into `req.body`.
- **Double-slash fix** – Normalizes `//api/beats` → `/api/beats` so routing still works.

---

## 8. Webhook route before JSON parser (lines 71–75)

```ts
app.use('/api/webhooks', webhookRoutes);
// ...
app.use(express.json());
```

- Webhooks are registered **before** `express.json()` so future handlers can verify signatures against the **raw body**.
- **express.json()** parses JSON into `req.body` for routes registered after it.

Middleware order: CORS → urlencoded → double-slash → webhooks (or skip) → JSON → static / health / API routers.

---

## 9. Static files and health check (lines 77–84)

```ts
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});
```

- **/assets** – Serves files from `server/public/assets/` (local dev; production often uses R2/CDN).
- **/health** – Liveness check for load balancers.

---

## 10. Mount API routes (lines 86–90)

```ts
app.use('/api/beats', beatsRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/downloads', downloadRoutes);
```

- **app.use(path, router)** – Requests starting with the path are delegated to that router with the **remaining** path segment.
  - `GET /api/beats/abc-123` → `beatsRoutes` matches `/:id` with `id === 'abc-123'`.
  - `GET /api/beats` → `beatsRoutes` matches `/`.

(`webhookRoutes` is mounted earlier, before JSON parsing.)

Nothing is listening yet; routes are only wired.

---

## 11. Start the server (lines 92–104)

```ts
initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📁 Serving static files from: ${path.join(__dirname, '../public/assets')}`);
        });
    })
    .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error('❌ Failed to initialize database:', message);
        process.exit(1);
    });
```

- **initializeDatabase()** — async schema check/create (see section 5).
- **On success** — `app.listen(PORT)` binds the port and accepts HTTP requests.
- **On failure** — logs the error and **`process.exit(1)`**. **`app.listen()` is never called.**

Runtime order: **DB init → listen (or exit).** After listen, each request: CORS → urlencoded → double-slash → webhooks → JSON → static/health or API router.

---

## Summary: execution order

| Step | What runs |
|------|-----------|
| 1 | Imports (routes, `initializeDatabase`; pool created when DB module is first used) |
| 2 | `dotenv.config()` |
| 3 | `__dirname`, `app`, `PORT`, `getAllowedOrigins()`, middleware, routes |
| 4 | `initializeDatabase()` (create/verify all four tables) |
| 5 | `app.listen(PORT)` on success, or `process.exit(1)` on failure |

Next: follow [BACKEND_REVIEW_ROADMAP.md](./BACKEND_REVIEW_ROADMAP.md) — Phase 1 starts with the beats route stack.
