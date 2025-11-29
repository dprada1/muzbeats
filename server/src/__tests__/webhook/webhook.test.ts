/**
 * Manual webhook test script
 *
 * This script simulates a Stripe webhook event to test the order creation flow.
 * Run with: npx tsx src/__tests__/webhook/webhook.test.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import pool from '@/config/database.js';

/**
 * Mock Stripe PaymentIntent object for testing
 */
function createMockPaymentIntent(overrides: Partial<any> = {}) {
    return {
        id: 'pi_test_' + Math.random().toString(36).substring(7),
        object: 'payment_intent',
        amount: 2000, // $20.00 in cents
        amount_received: 2000,
        currency: 'usd',
        status: 'succeeded',
        receipt_email: 'test@example.com',
        metadata: {
            beatIds: JSON.stringify(['550e8400-e29b-41d4-a716-446655440000']), // Mock UUID
            beatCount: '1',
            customerEmail: 'test@example.com',
        },
        ...overrides,
    };
}

/**
 * Test webhook handler by calling orderService directly
 */
async function testWebhook() {
    const { createOrderFromPaymentIntent } = await import('@/services/orderService.js');

    console.log('🧪 Testing webhook order creation...\n');

    // First, let's check if we have any beats in the database
    const beatsResult = await pool.query('SELECT id FROM beats LIMIT 1');
    let beatId: string;

    if (beatsResult.rows.length > 0) {
        beatId = beatsResult.rows[0].id;
        console.log(`✅ Found beat in database: ${beatId}`);
    } else {
        console.log('⚠️  No beats found in database. Using mock UUID.');
        console.log('   (This will cause the order to be created without order_items)');
        beatId = '550e8400-e29b-41d4-a716-446655440000';
    }

    const mockPaymentIntent = createMockPaymentIntent({
        metadata: {
            beatIds: JSON.stringify([beatId]),
            beatCount: '1',
            customerEmail: 'test@example.com',
        },
    });

    console.log('\n📦 Mock PaymentIntent:');
    console.log(JSON.stringify(mockPaymentIntent, null, 2));

    try {
        console.log('\n🔄 Creating order...');
        const result = await createOrderFromPaymentIntent(mockPaymentIntent as any);
        console.log('✅ Order created successfully!');
        console.log(`   Order ID: ${result.orderId}`);

        // Verify the order was created
        const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [result.orderId]);
        if (orderResult.rows.length > 0) {
            console.log('\n📋 Order details:');
            console.log(JSON.stringify(orderResult.rows[0], null, 2));

            // Check order items
            const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [
                result.orderId,
            ]);
            console.log(`\n📦 Order items: ${itemsResult.rows.length}`);
            if (itemsResult.rows.length > 0) {
                itemsResult.rows.forEach((item, idx) => {
                    console.log(`   ${idx + 1}. Beat ID: ${item.beat_id}, Price: $${item.price_at_purchase}`);
                });
            }

            // Check download tokens
            const tokensResult = await pool.query('SELECT * FROM downloads WHERE order_id = $1', [
                result.orderId,
            ]);
            console.log(`\n🔑 Download tokens: ${tokensResult.rows.length}`);
            if (tokensResult.rows.length > 0) {
                tokensResult.rows.forEach((token, idx) => {
                    const expiresAt = new Date(token.expires_at);
                    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    console.log(`   ${idx + 1}. Beat ID: ${token.beat_id}`);
                    console.log(`      Token: ${token.download_token.substring(0, 20)}...`);
                    console.log(`      Expires: ${expiresAt.toISOString().split('T')[0]} (${daysUntilExpiry} days)`);
                    console.log(`      Downloads: ${token.download_count}/${token.max_downloads}`);
                });
            }
        }
    } catch (error) {
        console.error('❌ Error creating order:', error);
        throw error;
    }
}

/**
 * Test via HTTP endpoint (requires server to be running)
 */
async function testWebhookViaHTTP() {
    const PORT = process.env.PORT || 3000;
    const url = `http://localhost:${PORT}/api/webhooks/stripe`;

    const mockEvent = {
        id: 'evt_test_' + Math.random().toString(36).substring(7),
        type: 'payment_intent.succeeded',
        data: {
            object: createMockPaymentIntent(),
        },
    };

    console.log('🧪 Testing webhook via HTTP endpoint...\n');
    console.log('📤 Sending POST to:', url);
    console.log('📦 Event payload:');
    console.log(JSON.stringify(mockEvent, null, 2));

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mockEvent),
        });

        const responseText = await response.text();
        console.log(`\n📥 Response status: ${response.status}`);
        console.log(`📥 Response body: ${responseText}`);

        if (response.ok) {
            console.log('✅ Webhook handled successfully!');
        } else {
            console.error('❌ Webhook failed');
        }
    } catch (error) {
        console.error('❌ Error calling webhook:', error);
        throw error;
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || 'direct';

    try {
        if (mode === 'http') {
            await testWebhookViaHTTP();
        } else {
            await testWebhook();
        }
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();

