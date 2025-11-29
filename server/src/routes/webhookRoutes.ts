import express, { Router } from 'express';
import { stripeWebhookHandler } from '@/controllers/webhookController.js';

const router = Router();

// Stripe webhook needs raw body for signature verification
// Use express.raw() middleware for this specific route
// POST /api/webhooks/stripe
router.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

export default router;
