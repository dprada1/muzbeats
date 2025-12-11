import { Resend } from 'resend';
import dotenv from 'dotenv';
import pool from '@/config/database.js';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Get download links for an order
 */
async function getDownloadLinks(orderId: string) {
    const result = await pool.query(
        `
        SELECT
            d.download_token,
            b.title,
            b.id as beat_id
        FROM downloads d
        JOIN beats b ON d.beat_id = b.id
        WHERE d.order_id = $1
        ORDER BY b.title
    `,
        [orderId]
    );

    return result.rows.map((row) => ({
        token: row.download_token,
        title: row.title,
        beatId: row.beat_id,
    }));
}

/**
 * Generate download URL from token
 */
function getDownloadUrl(token: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/api/downloads/${token}`;
}

/**
 * Send download email to customer after successful purchase
 *
 * @param email - Customer email address
 * @param orderId - Order ID
 * @param orderTotal - Total amount paid
 */
export async function sendDownloadEmail(
    email: string,
    orderId: string,
    orderTotal: number
): Promise<void> {
    try {
        // Check if Resend API key is configured
        if (!process.env.RESEND_API_KEY) {
            console.warn(
                'emailService: RESEND_API_KEY not configured. Skipping email send.'
            );
            console.log('📧 Would send download email to:', email);
            console.log('   Order ID:', orderId);
            return;
        }

        // Get download links for this order
        const downloadLinks = await getDownloadLinks(orderId);

        if (downloadLinks.length === 0) {
            console.warn(
                `emailService: No download links found for order ${orderId}. Skipping email.`
            );
            return;
        }

        // Format download links HTML
        const downloadLinksHtml = downloadLinks
            .map(
                (link, index) => `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">
                ${index + 1}. ${link.title}
            </h3>
            <a 
                href="${getDownloadUrl(link.token)}" 
                style="display: inline-block; padding: 12px 24px; background-color: #f3c000; color: #000; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;"
            >
                Download WAV/MP3
            </a>
        </div>
    `
            )
            .join('');

        // Email HTML template
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your MuzBeats Purchase</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #000; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #f3c000; margin: 0; font-size: 32px;">MuzBeats</h1>
    </div>
    
    <div style="background-color: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Thank you for your purchase!</h2>
        
        <p style="color: #666; font-size: 16px;">
            Your order has been confirmed. You can download your beats using the links below.
        </p>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
            <p style="margin: 0; color: #666; font-size: 14px;">
                <strong>Order ID:</strong> ${orderId.substring(0, 8)}...<br>
                <strong>Total:</strong> $${orderTotal.toFixed(2)}
            </p>
        </div>
        
        <h3 style="color: #333; margin-top: 30px; margin-bottom: 20px;">Your Downloads</h3>
        
        ${downloadLinksHtml}
        
        <div style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border-left: 4px solid #f3c000; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>Important:</strong> Download links expire in 30 days and can be used up to 5 times each. 
                Please save your files to a secure location.
            </p>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            If you have any questions or need assistance, please contact us.
        </p>
    </div>
    
    <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} MuzBeats. All rights reserved.</p>
    </div>
</body>
</html>
    `;

        // Plain text version
        const downloadLinksText = downloadLinks
            .map(
                (link, index) =>
                    `${index + 1}. ${link.title}\n   ${getDownloadUrl(link.token)}`
            )
            .join('\n\n');

        const text = `
Thank you for your purchase!

Your order has been confirmed. Order ID: ${orderId.substring(0, 8)}...
Total: $${orderTotal.toFixed(2)}

Your Downloads:
${downloadLinksText}

Important: Download links expire in 30 days and can be used up to 5 times each. 
Please save your files to a secure location.

If you have any questions or need assistance, please contact us.

© ${new Date().getFullYear()} MuzBeats. All rights reserved.
    `;

        // Send email
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'MuzBeats <noreply@muzbeats.com>',
            to: email,
            subject: 'Your MuzBeats Purchase - Download Links',
            html,
            text,
        });

        if (error) {
            console.error('emailService: Failed to send email:', error);
            throw error;
        }

        console.log('emailService: Download email sent successfully to', email);
        console.log('   Email ID:', data?.id);
    } catch (error) {
        console.error('emailService.sendDownloadEmail error:', error);
        // Don't throw - we don't want email failures to break the webhook
        // Just log the error
    }
}

