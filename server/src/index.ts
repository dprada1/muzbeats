import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import beatsRoutes from '@/routes/beatsRoutes.js';
import checkoutRoutes from '@/routes/checkoutRoutes.js';
import webhookRoutes from '@/routes/webhookRoutes.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
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
// Note: webhookRoutes is registered above, before express.json()

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, '../public/assets')}`);
});
