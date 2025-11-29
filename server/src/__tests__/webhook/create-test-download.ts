/**
 * Create a test download token for manual testing
 *
 * This script creates a test order with a download token so you can test
 * the download endpoint in your browser.
 *
 * Run with: npx tsx src/__tests__/webhook/create-test-download.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import pool from '@/config/database.js';
import { randomBytes } from 'crypto';

async function createTestDownload() {
    try {
        console.log('🧪 Creating test download token...\n');

        // Check if we have any beats
        const beatsResult = await pool.query('SELECT id, title, audio_path FROM beats LIMIT 1');

        if (beatsResult.rows.length === 0) {
            console.log('❌ No beats found in database.');
            console.log('   Please run the migration script first: npx tsx src/db/migrate-json-to-db.ts');
            process.exit(1);
        }

        const beat = beatsResult.rows[0];
        console.log(`✅ Found beat: ${beat.title} (${beat.id})`);

        // Create a test order
        const orderResult = await pool.query(
            `
            INSERT INTO orders (customer_email, total_amount, status, stripe_payment_intent_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `,
            ['test@example.com', 20.00, 'completed', 'pi_test_manual_' + Date.now()]
        );

        const orderId = orderResult.rows[0].id;
        console.log(`✅ Created test order: ${orderId}`);

        // Create order item
        await pool.query(
            `
            INSERT INTO order_items (order_id, beat_id, price_at_purchase, quantity)
            VALUES ($1, $2, $3, $4)
        `,
            [orderId, beat.id, 20.00, 1]
        );
        console.log(`✅ Created order item`);

        // Generate download token
        const tokenBytes = randomBytes(32);
        const downloadToken = tokenBytes.toString('base64url');

        // Set expiration to 30 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Create download token
        await pool.query(
            `
            INSERT INTO downloads (order_id, beat_id, download_token, expires_at, max_downloads)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `,
            [orderId, beat.id, downloadToken, expiresAt, 5]
        );

        console.log(`✅ Created download token\n`);

        // Display the download URL
        const PORT = process.env.PORT || 3000;
        const downloadUrl = `http://localhost:${PORT}/api/downloads/${downloadToken}`;

        console.log('📥 Test Download URL:');
        console.log(`   ${downloadUrl}\n`);
        console.log('💡 To test:');
        console.log('   1. Make sure your server is running (npm run dev)');
        console.log('   2. Open the URL above in your browser');
        console.log('   3. The file should download automatically\n');

        console.log('🔑 Token details:');
        console.log(`   Token: ${downloadToken.substring(0, 20)}...`);
        console.log(`   Expires: ${expiresAt.toISOString().split('T')[0]}`);
        console.log(`   Max downloads: 5`);
        console.log(`   Beat: ${beat.title}`);
        console.log(`   Audio path: ${beat.audio_path}\n`);

        await pool.end();
    } catch (error) {
        console.error('❌ Error creating test download:', error);
        await pool.end();
        process.exit(1);
    }
}

createTestDownload();

