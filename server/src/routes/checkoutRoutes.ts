import { Router } from 'express';
import {
    createPayPalOrderHandler,
    capturePayPalOrderHandler,
    getPayPalOrderHandler,
} from '@/controllers/paypalController.js';
import { PAYPAL_CLIENT_ID } from '@/config/paypal.js';

const router = Router();

// GET /api/checkout/config
// Returns PayPal client ID for frontend
router.get('/config', (_req, res) => {
    res.json({
        paypal: {
            enabled: !!PAYPAL_CLIENT_ID,
            clientId: PAYPAL_CLIENT_ID || null,
        },
    });
});

// PayPal routes
router.post('/paypal/create-order', createPayPalOrderHandler);
router.post('/paypal/capture-order', capturePayPalOrderHandler);
router.get('/paypal/order/:id', getPayPalOrderHandler);

export default router;
