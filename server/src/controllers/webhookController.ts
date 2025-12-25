import type { Request, Response } from 'express';
import { stripe } from '@/config/stripe.js';
import { createOrderFromPaymentIntent } from '@/services/orderService.js';
import { sendDownloadEmail } from '@/services/emailService.js';

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler.
 *
 * NOTE: For local development we are not yet verifying signatures.
 * In production, you must use the raw body and verify using STRIPE_WEBHOOK_SECRET.
 */
export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
    try {
        // For now, parse the raw body as JSON (development mode)
        // In production, you MUST verify the signature using STRIPE_WEBHOOK_SECRET
        // req.body will be a Buffer when using express.raw()
        let event: any;
        if (Buffer.isBuffer(req.body)) {
            event = JSON.parse(req.body.toString());
        } else if (typeof req.body === 'string') {
            event = JSON.parse(req.body);
        } else {
            event = req.body;
        }

        // Basic event logging for debugging
        console.log('Stripe webhook received:', {
            id: event.id,
            type: event.type,
        });

        switch (event.type) {
            case 'payment_intent.succeeded': {
                // Webhook event payload may omit billing email unless we expand the charge.
                // Re-fetch with expand so order creation + email delivery is reliable.
                if (!stripe) {
                    throw new Error('Stripe is not enabled on this server');
                }
                
                const paymentIntentId = (event.data.object as any)?.id as string | undefined;
                const paymentIntent = paymentIntentId
                    ? await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] })
                    : (event.data.object as any);

                try {
                    const orderResult = await createOrderFromPaymentIntent(paymentIntent);
                    console.log(
                        'stripeWebhookHandler: Order created for payment_intent',
                        paymentIntent.id
                    );

                    // Send download email to customer
                    if (orderResult.customerEmail && orderResult.beatIds.length > 0) {
                        const emailSent = await sendDownloadEmail(
                            orderResult.customerEmail,
                            orderResult.orderId,
                            orderResult.totalAmount
                        );
                        if (!emailSent) {
                            console.warn(
                                'stripeWebhookHandler: Download email was not sent (see logs above)'
                            );
                        }
                    }
                } catch (err) {
                    console.error(
                        'stripeWebhookHandler: Failed to create order from payment intent:',
                        err
                    );
                    // We still return 200 so Stripe doesn't retry endlessly for now.
                }
                break;
            }
            default: {
                // For now, just log unhandled event types
                console.log(`Unhandled Stripe event type: ${event.type}`);
            }
        }

        res.json({ received: true });
    } catch (error: any) {
        console.error('stripeWebhookHandler error:', error);
        res.status(400).json({ error: error.message || 'Webhook handler error' });
    }
}


