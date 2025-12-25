import { Request, Response } from 'express';
import { createPaymentIntent, getPaymentIntent } from '@/services/checkoutService.js';
import type { CartItem } from '@/services/checkoutService.js';
import { stripe, STRIPE_ENABLED } from '@/config/stripe.js';
import { createOrderFromPaymentIntent } from '@/services/orderService.js';
import { sendDownloadEmail } from '@/services/emailService.js';
import pool from '@/config/database.js';

/**
 * POST /api/checkout/create-payment-intent
 * Create a Stripe Payment Intent for the cart
 *
 * Request body:
 * {
 * items: [{ beatId: "uuid", quantity: 1 }],
 * customerEmail?: "email@example.com"
 * }
 */
export async function createPaymentIntentHandler(
    req: Request,
    res: Response
): Promise<void> {
    try {
        // Check if Stripe is enabled
        if (!STRIPE_ENABLED) {
            res.status(403).json({ 
                error: 'Stripe payments are not enabled on this server' 
            });
            return;
        }

        const { items, customerEmail } = req.body;

        // Validate request body
        if (!items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ 
                error: 'Items array is required and must not be empty' 
            });
            return;
        }

        // Validate each item has beatId
        const invalidItems = items.filter(
            (item: any) => !item.beatId || typeof item.beatId !== 'string'
        );

        if (invalidItems.length > 0) {
            res.status(400).json({ 
                error: 'Each item must have a valid beatId (string)' 
            });
            return;
        }

        // Validate email format if provided
        if (customerEmail && typeof customerEmail === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerEmail)) {
                res.status(400).json({ 
                    error: 'Invalid email format' 
                });
                return;
            }
        }

        const cartItems: CartItem[] = items.map((item: any) => ({
            beatId: item.beatId,
            quantity: item.quantity || 1,
        }));

        const paymentIntent = await createPaymentIntent(
            cartItems,
            customerEmail
        );

        res.status(200).json(paymentIntent);
    } catch (error: any) {
        console.error('Error in createPaymentIntentHandler:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to create payment intent' 
        });
    }
}

/**
 * GET /api/checkout/payment-intent/:id
 * Get payment intent status
 */
export async function getPaymentIntentHandler(
    req: Request,
    res: Response
): Promise<void> {
    try {
        // Check if Stripe is enabled
        if (!STRIPE_ENABLED) {
            res.status(403).json({ 
                error: 'Stripe payments are not enabled on this server' 
            });
            return;
        }

        const { id } = req.params;

        if (!id) {
            res.status(400).json({ error: 'Payment intent ID is required' });
            return;
        }

        const paymentIntent = await getPaymentIntent(id);
        res.status(200).json({
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            metadata: paymentIntent.metadata,
        });
    } catch (error: any) {
        console.error('Error in getPaymentIntentHandler:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to retrieve payment intent' 
        });
    }
}

/**
 * POST /api/checkout/process-payment
 * Process a successful payment: create order and send email
 * This is called automatically after payment succeeds in development.
 * In production, this is handled by the webhook.
 *
 * Request body:
 * {
 *   paymentIntentId: "pi_xxx"
 * }
 */
export async function processPaymentHandler(
    req: Request,
    res: Response
): Promise<void> {
    try {
        // Check if Stripe is enabled
        if (!STRIPE_ENABLED || !stripe) {
            res.status(403).json({ 
                error: 'Stripe payments are not enabled on this server' 
            });
            return;
        }

        const { paymentIntentId } = req.body;

        if (!paymentIntentId || typeof paymentIntentId !== 'string') {
            res.status(400).json({ 
                error: 'Payment intent ID is required' 
            });
            return;
        }

        // Retrieve the payment intent from Stripe (expand latest_charge so we always have billing_details.email)
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge'],
        });

        // Only process if payment succeeded
        if (paymentIntent.status !== 'succeeded') {
            res.status(400).json({ 
                error: `Payment intent status is "${paymentIntent.status}", not "succeeded"` 
            });
            return;
        }

        // Check if order already exists (idempotency)
        const existingOrderResult = await pool.query(
            'SELECT id FROM orders WHERE stripe_payment_intent_id = $1',
            [paymentIntentId]
        );

        if (existingOrderResult.rows.length > 0) {
            // Order already exists, return success
            res.status(200).json({
                success: true,
                message: 'Order already processed',
                orderId: existingOrderResult.rows[0].id,
            });
            return;
        }

        // Create order from payment intent
        const orderResult = await createOrderFromPaymentIntent(paymentIntent as any);
        console.log('processPaymentHandler: Order created for payment_intent', paymentIntentId);

        // Send download email to customer
        if (orderResult.customerEmail && orderResult.beatIds.length > 0) {
            const emailSent = await sendDownloadEmail(
                orderResult.customerEmail,
                orderResult.orderId,
                orderResult.totalAmount
            );
            if (emailSent) {
                console.log('processPaymentHandler: Download email sent successfully');
            } else {
                console.warn('processPaymentHandler: Download email was not sent (see logs above)');
            }
        }

        res.status(200).json({
            success: true,
            message: 'Payment processed successfully',
            orderId: orderResult.orderId,
            customerEmail: orderResult.customerEmail,
            totalAmount: orderResult.totalAmount,
        });
    } catch (error: any) {
        console.error('Error in processPaymentHandler:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to process payment' 
        });
    }
}
