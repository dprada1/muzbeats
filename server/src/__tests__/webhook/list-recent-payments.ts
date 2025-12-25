/**
 * List recent payments from Stripe
 *
 * This script lists the most recent payment intents from Stripe
 * so you can find the payment intent ID to manually trigger the webhook.
 *
 * Usage:
 *   npx tsx src/__tests__/webhook/list-recent-payments.ts [limit]
 */

import dotenv from 'dotenv';
dotenv.config();

import { stripe } from '@/config/stripe.js';

async function listRecentPayments(limit: number = 10) {
    try {
        if (!stripe) {
            throw new Error('Stripe is not enabled. Set ENABLE_STRIPE=true in .env');
        }

        console.log(`\n🔍 Fetching last ${limit} payment intents from Stripe...\n`);

        const paymentIntents = await stripe.paymentIntents.list({
            limit,
            expand: ['data.customer'],
        });

        if (paymentIntents.data.length === 0) {
            console.log('❌ No payment intents found.');
            return;
        }

        console.log(`✅ Found ${paymentIntents.data.length} payment intent(s):\n`);

        paymentIntents.data.forEach((pi, index) => {
            const amount = (pi.amount / 100).toFixed(2);
            const email = pi.receipt_email || pi.metadata?.customerEmail || 'N/A';
            const beatIds = pi.metadata?.beatIds ? JSON.parse(pi.metadata.beatIds) : [];
            const beatCount = Array.isArray(beatIds) ? beatIds.length : 0;

            console.log(`${index + 1}. Payment Intent: ${pi.id}`);
            console.log(`   Status: ${pi.status}`);
            console.log(`   Amount: $${amount}`);
            console.log(`   Email: ${email}`);
            console.log(`   Beats: ${beatCount}`);
            console.log(`   Created: ${new Date(pi.created * 1000).toLocaleString()}`);
            console.log('');

            if (pi.status === 'succeeded') {
                console.log(`   💡 To trigger webhook: npx tsx src/__tests__/webhook/trigger-webhook.ts ${pi.id}`);
                console.log('');
            }
        });
    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

const limit = parseInt(process.argv[2]) || 10;
listRecentPayments(limit);

