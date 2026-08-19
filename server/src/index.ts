import express from 'express';
import type {
    NextFunction,
    Request,
    Response
} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import {
    fileURLToPath
} from 'url';
import beatsRoutes from '@/routes/beatsRoutes.js';
import checkoutRoutes from '@/routes/checkoutRoutes.js';
import webhookRoutes from '@/routes/webhookRoutes.js';
import downloadRoutes from '@/routes/downloadRoutes.js';
import {
    initializeDatabase
} from '@/db/initializeDatabase.js';
import {
    assertCatalogReady
} from '@/db/assertCatalogReady.js';
import {
    isServerReady,
    markServerReady
} from '@/boot/serverReadiness.js';
import {
    assertCheckoutLimitsValidAtBoot
} from './config/checkoutLimits.js';
import {
    assertRequiredEnvAtBoot,
    getEnv,
    parseListenPort
} from './config/env.js';
import {
    assertPayPalModeAtBoot
} from './config/paypal.js';
import {
    assertDatabaseConfigAtBoot
} from './config/database.js';
import {
    logError,
    logInfo
} from './utils/logger.js';

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
/**
 * CORS configuration
 *
 * For production/staging, set CORS_ALLOWED_ORIGINS as a comma-separated list:
 *   CORS_ALLOWED_ORIGINS=https://www.prodmuz.com,https://staging.prodmuz.com
 *
 * If not set, we default to a safe list that covers local dev + deployed frontends.
 */
function getAllowedOrigins(): string[] {
    const raw = getEnv('CORS_ALLOWED_ORIGINS')
    if (!raw) {
        return [
            'http://localhost:5173',
            'http://localhost:4173',
            'https://muzbeats.pages.dev',
            'https://prodmuz.com',
            'https://www.prodmuz.com',
            'https://staging.prodmuz.com',
        ];
    }

    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

const allowedOrigins = getAllowedOrigins();
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (curl, server-to-server, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.urlencoded({ extended: true }));

// Normalize accidental double slashes in URLs (helps if an email link contains `//api/...`)
// This is safe for our API routes and prevents "Cannot GET //api/..." when proxies preserve double slashes.
app.use((req, _res, next) => {
    if (req.url.includes('//')) {
        req.url = req.url.replace(/\/{2,}/g, '/');
    }
    next();
});

/**
 * Readiness gate: listen early so deploy platforms can probe `/health` during boot,
 * but refuse storefront/checkout/download traffic until {@link markServerReady}.
 * `/health` is handled below (503 while starting).
 */
app.use((req, res, next) => {
    if (isServerReady()) {
        next();
        return;
    }
    if (req.path === '/health') {
        next();
        return;
    }
    res.status(503).json({
        error: 'Server is starting',
        message: 'Server boot in progress - Try again shortly',
    });
});

// Register webhook route BEFORE express.json() so it gets raw body (for future webhook handlers)
app.use('/api/webhooks', webhookRoutes);

// JSON parsing for all other routes (after webhook)
app.use(express.json());

// Serve static files (images, audio files)
// This serves files from server/public/assets/
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));

/**
 * Deploy health / readiness probe.
 * - 503 while DB init + catalog audit run (process is up; not ready for traffic)
 * - 200 after {@link markServerReady}
 */
app.get('/health', (_req, res) => {
    if (!isServerReady()) {
        res.status(503).json({
            status: 'starting',
            message: 'Server is starting',
        });
        return;
    }
    res.json({ status: 'ok', message: 'Server is running' });
});

// API routes
app.use('/api/beats', beatsRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/downloads', downloadRoutes);
// Note: webhookRoutes is registered above, before express.json()

/** body-parser / express.json malformed payloads — client error, not server noise. */
function isMalformedJsonBody(err: unknown): boolean {
    if (!(err instanceof SyntaxError)) {
        return false;
    }
    const parseError = err as SyntaxError & { status?: number; type?: string };
    return parseError.status === 400 || parseError.type === 'entity.parse.failed';
}

// Quiet 400 for bad JSON (same class as validation failures — no stack dump).
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        next(err);
        return;
    }
    if (isMalformedJsonBody(err)) {
        res.status(400).json({ error: 'Invalid JSON body' });
        return;
    }
    next(err);
});

// Fail closed on config before announcing identity / opening the port.
let listenPort: number;
try {
    assertRequiredEnvAtBoot();
    listenPort = parseListenPort();
    assertDatabaseConfigAtBoot();
    assertPayPalModeAtBoot();
    assertCheckoutLimitsValidAtBoot();
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError('index.boot', 'Invalid boot configuration', { message });
    process.exit(1);
}

/**
 * Listen first so Railway/etc. can hit `/health` during (possibly slow) R2 catalog audit.
 * Mark ready only after DB + catalog checks pass; otherwise exit so the deploy fails closed.
 */
app.listen(listenPort, () => {
    logInfo('index.listen', 'HTTP server listening (not ready for traffic yet)', {
        url: `http://localhost:${listenPort}`,
    });
});

initializeDatabase()
    .then(() => assertCatalogReady())
    .then(() => {
        markServerReady();
        logInfo('index.ready', 'Server ready', {
            url: `http://localhost:${listenPort}`,
            staticAssets: path.join(__dirname, '../public/assets'),
        });
    })
    .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logError('index.boot', 'Server failed to start', { message });
        process.exit(1);
    });
