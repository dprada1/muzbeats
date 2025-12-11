/**
 * Manual email test script
 *
 * This script manually sends a download email for a specific order.
 * Useful for testing the email service or resending emails.
 *
 * Usage:
 *   npx tsx src/__tests__/webhook/send-email-test.ts [order-id]
 *
 * If no order-id is provided, it will use the most recent order.
 */

import dotenv from 'dotenv';
dotenv.config();

import pool from '@/config/database.js';
import { sendDownloadEmail } from '@/services/emailService.js';

async function sendEmailForOrder(orderId?: string) {
    try {
        let targetOrderId: string;

        if (orderId) {
            targetOrderId = orderId;
        } else {
            // Get the most recent order
            const result = await pool.query(
                'SELECT id, customer_email, total_amount FROM orders ORDER BY created_at DESC LIMIT 1'
            );

            if (result.rows.length === 0) {
                console.error('❌ No orders found in database.');
                return;
            }

            targetOrderId = result.rows[0].id;
            console.log('📦 Using most recent order:', targetOrderId);
        }

        // Get order details
        const orderResult = await pool.query(
            'SELECT id, customer_email, total_amount FROM orders WHERE id = $1',
            [targetOrderId]
        );

        if (orderResult.rows.length === 0) {
            console.error(`❌ Order ${targetOrderId} not found.`);
            return;
        }

        const order = orderResult.rows[0];
        console.log('\n📧 Sending download email...');
        console.log('   Order ID:', order.id);
        console.log('   Email:', order.customer_email);
        console.log('   Total:', `$${order.total_amount}`);

        // Check if download tokens exist
        const downloadsResult = await pool.query(
            'SELECT COUNT(*) as count FROM downloads WHERE order_id = $1',
            [targetOrderId]
        );

        const downloadCount = parseInt(downloadsResult.rows[0].count);
        console.log('   Download tokens:', downloadCount);

        if (downloadCount === 0) {
            console.warn('⚠️  No download tokens found for this order.');
        }

        // Send the email
        await sendDownloadEmail(order.customer_email, order.id, parseFloat(order.total_amount));

        console.log('\n✅ Email sent successfully!');
        console.log('   Check your inbox (and spam folder) for the email.');
    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Main execution
const orderId = process.argv[2];
sendEmailForOrder(orderId);

