import { Router } from 'express';
import {
    createPaymentIntentHandler,
    getPaymentIntentHandler,
    processPaymentHandler,
} from '@/controllers/checkoutController.js';
import {
    createPayPalOrderHandler,
    capturePayPalOrderHandler,
    getPayPalOrderHandler,
} from '@/controllers/paypalController.js';
import { STRIPE_ENABLED, STRIPE_PUBLISHABLE_KEY } from '@/config/stripe.js';
import { PAYPAL_CLIENT_ID } from '@/config/paypal.js';

const router = Router();

// GET /api/checkout/config
// Returns which payment providers are enabled and their public keys
router.get('/config', (_req, res) => {
    res.json({
        stripe: {
            enabled: STRIPE_ENABLED,
            publishableKey: STRIPE_ENABLED ? STRIPE_PUBLISHABLE_KEY : null,
        },
        paypal: {
            enabled: !!PAYPAL_CLIENT_ID,
            clientId: PAYPAL_CLIENT_ID || null,
        },
    });
});

// ===== Stripe Routes =====
// POST /api/checkout/create-payment-intent
router.post('/create-payment-intent', createPaymentIntentHandler);

// GET /api/checkout/payment-intent/:id
router.get('/payment-intent/:id', getPaymentIntentHandler);

// POST /api/checkout/process-payment
router.post('/process-payment', processPaymentHandler);

// ===== PayPal Routes =====
// POST /api/checkout/paypal/create-order
router.post('/paypal/create-order', createPayPalOrderHandler);

// POST /api/checkout/paypal/capture-order
router.post('/paypal/capture-order', capturePayPalOrderHandler);

// GET /api/checkout/paypal/order/:id
router.get('/paypal/order/:id', getPayPalOrderHandler);

export default router;
