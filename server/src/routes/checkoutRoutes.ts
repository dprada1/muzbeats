import { Router } from 'express';
import {
    createPaymentIntentHandler,
    getPaymentIntentHandler,
} from '@/controllers/checkoutController.js';

const router = Router();

// POST /api/checkout/create-payment-intent
router.post('/create-payment-intent', createPaymentIntentHandler);

// GET /api/checkout/payment-intent/:id
router.get('/payment-intent/:id', getPaymentIntentHandler);

export default router;
