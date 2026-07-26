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
import { assertCheckoutLimitsValid } from './config/checkoutLimits.js';
import { assertRequiredEnv } from './config/env.js';
import { logError, logInfo } from './utils/logger.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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
    const raw = process.env.CORS_ALLOWED_ORIGINS;
    if (raw && raw.trim().length > 0) {
        return raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }

    return [
        'http://localhost:5173',
        'http://localhost:4173',
        'https://muzbeats.pages.dev',
        'https://prodmuz.com',
        'https://www.prodmuz.com',
        'https://staging.prodmuz.com',
    ];
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

// Register webhook route BEFORE express.json() so it gets raw body (for future webhook handlers)
app.use('/api/webhooks', webhookRoutes);

// JSON parsing for all other routes (after webhook)
app.use(express.json());

// Serve static files (images, audio files)
// This serves files from server/public/assets/
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// API routes
app.use('/api/beats', beatsRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/downloads', downloadRoutes);
// Note: webhookRoutes is registered above, before express.json()

// Validate environment variables first (cheap) before touching the database (expensive).
// Deployed environments fail fast here if required config is missing.
try {
    assertRequiredEnv();
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError('index.boot', 'Invalid environment configuration', { message });
    process.exit(1);
}

// Assert checkout price/quantity bounds before accepting traffic
try {
    assertCheckoutLimitsValid();
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError('index.boot', 'Invalid checkout configuration', { message });
    process.exit(1);
}

// Initialize database and start server (fail fast if schema cannot be verified)
initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            logInfo('index.listen', 'Server running', {
                url: `http://localhost:${PORT}`,
            });
            logInfo('index.listen', 'Serving static files', {
                path: path.join(__dirname, '../public/assets'),
            });
        });
    })
    .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logError('index.boot', 'Failed to initialize database', { message });
        process.exit(1);
    });
