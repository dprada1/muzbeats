/**
 * Manual webhook trigger script
 *
 * This script retrieves a payment intent from Stripe and manually triggers
 * the webhook handler to create an order and send the email.
 *
 * Usage:
 *   npx tsx src/__tests__/webhook/trigger-webhook.ts <payment-intent-id>
 *
 * To find your payment intent ID:
 *   1. Check the Stripe dashboard: https://dashboard.stripe.com/test/payments
 *   2. Or check the browser console/network tab after payment
 *   3. Or check the checkout success page URL (payment_intent parameter)
 */

import dotenv from 'dotenv';
dotenv.config();

import { stripe } from '@/config/stripe.js';
import { createOrderFromPaymentIntent } from '@/services/orderService.js';
import { sendDownloadEmail } from '@/services/emailService.js';

async function triggerWebhook(paymentIntentId: string) {
    try {
        if (!stripe) {
            throw new Error('Stripe is not enabled. Set ENABLE_STRIPE=true in .env');
        }

        console.log(`\n🔍 Retrieving payment intent: ${paymentIntentId}...\n`);

        // Retrieve the payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        console.log('✅ Payment intent retrieved:');
        console.log(`   Status: ${paymentIntent.status}`);
        console.log(`   Amount: $${(paymentIntent.amount / 100).toFixed(2)}`);
        console.log(`   Email: ${paymentIntent.receipt_email || paymentIntent.metadata?.customerEmail || 'N/A'}`);

        if (paymentIntent.status !== 'succeeded') {
            console.error(`\n❌ Payment intent status is "${paymentIntent.status}", not "succeeded".`);
            console.error('   Only succeeded payments can create orders.');
            process.exit(1);
        }

        console.log('\n📦 Creating order from payment intent...');
        const orderResult = await createOrderFromPaymentIntent(paymentIntent as any);
        console.log('✅ Order created successfully!');
        console.log(`   Order ID: ${orderResult.orderId}`);
        console.log(`   Customer Email: ${orderResult.customerEmail}`);
        console.log(`   Total: $${orderResult.totalAmount.toFixed(2)}`);
        console.log(`   Beats: ${orderResult.beatIds.length}`);

        // Send download email
        if (orderResult.customerEmail && orderResult.beatIds.length > 0) {
            console.log('\n📧 Sending download email...');
            try {
                await sendDownloadEmail(
                    orderResult.customerEmail,
                    orderResult.orderId,
                    orderResult.totalAmount
                );
                console.log('✅ Email sent successfully!');
            } catch (emailError: any) {
                console.error('❌ Failed to send email:', emailError.message);
                if (emailError.statusCode === 403) {
                    console.error('\n💡 Tip: Resend test domain only allows sending to your account email.');
                    console.error('   Use your actual Resend account email address for testing.');
                }
            }
        } else {
            console.warn('\n⚠️  Skipping email: Missing customer email or beats');
        }

        console.log('\n✅ Webhook processing complete!');
    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        if (error.type === 'StripeInvalidRequestError') {
            console.error('   Payment intent not found. Check the ID and try again.');
        }
        process.exit(1);
    }
}

// Get payment intent ID from command line
const paymentIntentId = process.argv[2];

if (!paymentIntentId) {
    console.error('❌ Error: Payment intent ID required');
    console.error('\nUsage:');
    console.error('  npx tsx src/__tests__/webhook/trigger-webhook.ts <payment-intent-id>');
    console.error('\nExample:');
    console.error('  npx tsx src/__tests__/webhook/trigger-webhook.ts pi_1234567890');
    console.error('\n💡 To find your payment intent ID:');
    console.error('   1. Check Stripe dashboard: https://dashboard.stripe.com/test/payments');
    console.error('   2. Check browser console/network tab after payment');
    console.error('   3. Check checkout success page URL (payment_intent parameter)');
    process.exit(1);
}

triggerWebhook(paymentIntentId);

