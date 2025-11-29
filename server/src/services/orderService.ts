import pool from '@/config/database.js';
import type { OrderStatus } from '@/types/Order.js';
import type Stripe from 'stripe';
import { randomBytes } from 'crypto';

/**
 * Create an order and related order_items/downloads from a Stripe PaymentIntent.
 *
 * NOTE: This is a first pass and will be wired into the Stripe webhook handler.
 * For now, it focuses on inserting an order + order_items based on beatIds in metadata.
 */
export async function createOrderFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const stripePaymentIntentId = paymentIntent.id;

        // Stripe may not always have receipt_email; fall back to metadata or empty string
        const customerEmail =
            (paymentIntent.receipt_email as string | null) ||
            (paymentIntent.metadata?.customerEmail as string | undefined) ||
            '';

        // Amount from Stripe is in cents; convert to dollars for our DECIMAL(10,2)
        const totalAmount = (paymentIntent.amount_received ?? paymentIntent.amount) / 100;

        const status: OrderStatus =
            (paymentIntent.status === 'succeeded'
                ? 'completed'
                : paymentIntent.status === 'processing'
                ? 'pending'
                : paymentIntent.status === 'canceled'
                ? 'failed'
                : 'pending') as OrderStatus;

        // beatIds are stored in metadata as a JSON string array in checkoutService
        let beatIds: string[] = [];
        const rawBeatIds = paymentIntent.metadata?.beatIds;
        if (rawBeatIds) {
            try {
                const parsed = JSON.parse(rawBeatIds);
                if (Array.isArray(parsed)) {
                    beatIds = parsed as string[];
                }
            } catch {
                console.error('orderService.createOrderFromPaymentIntent: Failed to parse beatIds metadata');
            }
        }

        if (beatIds.length === 0) {
            console.warn(
                'orderService.createOrderFromPaymentIntent: No beatIds found in payment intent metadata. Creating order without items.'
            );
        }

        // Insert into orders table
        const orderResult = await client.query(
            `
            INSERT INTO orders (customer_email, total_amount, status, stripe_payment_intent_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `,
            [customerEmail, totalAmount, status, stripePaymentIntentId]
        );

        const orderId: string = orderResult.rows[0].id;

        // Fetch current beat prices for all beatIds and insert into order_items
        if (beatIds.length > 0) {
            const beatsResult = await client.query(
                `
                SELECT id, price
                FROM beats
                WHERE id = ANY($1::uuid[])
            `,
                [beatIds]
            );

            // Calculate expiration date (30 days from now)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            for (const row of beatsResult.rows) {
                // Insert order item
                await client.query(
                    `
                    INSERT INTO order_items (order_id, beat_id, price_at_purchase, quantity)
                    VALUES ($1, $2, $3, $4)
                `,
                    [orderId, row.id, row.price, 1]
                );

                // Generate secure download token
                // Using 32 bytes (256 bits) for security, base64 encoded = 44 characters
                const tokenBytes = randomBytes(32);
                const downloadToken = tokenBytes.toString('base64url'); // base64url is URL-safe

                // Insert download token
                await client.query(
                    `
                    INSERT INTO downloads (order_id, beat_id, download_token, expires_at, max_downloads)
                    VALUES ($1, $2, $3, $4, $5)
                `,
                    [orderId, row.id, downloadToken, expiresAt, 5] // Max 5 downloads per token
                );
            }
        }

        await client.query('COMMIT');

        return { orderId };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('orderService.createOrderFromPaymentIntent error:', error);
        throw error;
    } finally {
        client.release();
    }
}


