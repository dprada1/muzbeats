import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import beatsRoutes from '@/routes/beatsRoutes.js';
import checkoutRoutes from '@/routes/checkoutRoutes.js';
import webhookRoutes from '@/routes/webhookRoutes.js';
import downloadRoutes from '@/routes/downloadRoutes.js';
import pool from '@/config/database.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Initialize database tables if they don't exist
 * This runs once on server startup
 */
async function initializeDatabase() {
    try {
        // Check if beats table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'beats'
            );
        `);

        if (tableCheck.rows[0].exists) {
            console.log('✅ Database tables already exist');
            return;
        }

        console.log('🔄 Initializing database tables...');

        // Create beats table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS beats (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                key VARCHAR(50) NOT NULL,
                bpm INTEGER NOT NULL CHECK (bpm > 0 AND bpm < 300),
                price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
                audio_path VARCHAR(500) NOT NULL,
                cover_path VARCHAR(500) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_beats_bpm ON beats(bpm);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_beats_key ON beats(key);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_beats_price ON beats(price);');

        // Create orders table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                customer_email VARCHAR(255) NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
                stripe_payment_intent_id VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create order_items table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                beat_id UUID NOT NULL REFERENCES beats(id) ON DELETE RESTRICT,
                price_at_purchase DECIMAL(10, 2) NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create downloads table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS downloads (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                beat_id UUID NOT NULL REFERENCES beats(id) ON DELETE RESTRICT,
                download_token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                download_count INTEGER DEFAULT 0,
                max_downloads INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Database tables initialized successfully');
    } catch (error: any) {
        console.error('❌ Failed to initialize database:', error.message);
        // Don't exit - let the server start anyway
        // Tables might already exist or will be created manually
    }
}

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

// Stripe webhook needs raw body for signature verification
// Register webhook route BEFORE express.json() so it gets raw body
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

// Initialize database and start server
initializeDatabase().then(() => {
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, '../public/assets')}`);
  });
});
