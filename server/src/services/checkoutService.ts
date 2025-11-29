import { stripe } from '@/config/stripe.js';
import { getBeatById } from './beatsService.js';
import type { Beat } from '@/types/Beat.js';

/**
 * Cart item from client (just beat IDs)
 */
export interface CartItem {
    beatId: string;
    quantity?: number; // Defaults to 1
}

/**
 * Create a Stripe Payment Intent for the cart
 *
 * @param items - Array of cart items (beat IDs)
 * @param customerEmail - Optional customer email for guest checkout
 * @returns Payment Intent with client secret
 */
export async function createPaymentIntent(
    items: CartItem[],
    customerEmail?: string
) {
    try {
        // Fetch all beats from database to get prices
        const beatPromises = items.map(item => getBeatById(item.beatId));
        const beats = await Promise.all(beatPromises);

        // Filter out any null beats (invalid IDs)
        const validBeats = beats.filter((beat): beat is Beat => beat !== null);

        if (validBeats.length === 0) {
            throw new Error('No valid beats found in cart');
        }

        // Calculate total amount in cents (Stripe uses cents)
        let totalAmount = 0;
        const lineItems: Array<{ beat: Beat; quantity: number }> = [];

        items.forEach((item) => {
            const beat = validBeats.find(b => b.id === item.beatId);
            if (beat) {
                const quantity = item.quantity || 1;
                const amount = Math.round(beat.price * 100 * quantity); // Convert to cents
                totalAmount += amount;
                lineItems.push({ beat, quantity });
            }
        });

        if (totalAmount === 0) {
            throw new Error('Total amount cannot be zero');
        }

        // Create metadata for the payment intent
        const metadata: Record<string, string> = {
            beatIds: JSON.stringify(lineItems.map(item => item.beat.id)),
            beatCount: lineItems.length.toString(),
            ...(customerEmail && { customerEmail }), // Include email in metadata for webhook
        };

        // Create Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency: 'usd',
            metadata,
            ...(customerEmail && { receipt_email: customerEmail }),
            // Only allow card payments (exclude buy-now-pay-later options like Affirm)
            payment_method_types: ['card'],
        });

        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: totalAmount,
            currency: paymentIntent.currency,
        };
    } catch (error) {
        console.error('Error creating payment intent:', error);
        throw error;
    }
}

/**
 * Retrieve a payment intent by ID
 */
export async function getPaymentIntent(paymentIntentId: string) {
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        return paymentIntent;
    } catch (error) {
        console.error('Error retrieving payment intent:', error);
        throw error;
    }
}
