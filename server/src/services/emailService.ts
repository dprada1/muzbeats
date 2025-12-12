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
 * Get base URL for download links
 * Downloads are served from the backend API, so we use BACKEND_URL
 * Falls back to FRONTEND_URL if BACKEND_URL is not set (for same-domain setups)
 */
function getBaseUrl(): string {
    // Prefer BACKEND_URL since downloads are served from backend
    const backendUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL;
    
    if (backendUrl) {
        // Ensure HTTPS in production (unless explicitly HTTP)
        if (backendUrl.startsWith('http://') && process.env.NODE_ENV === 'production') {
            console.warn('emailService: Using HTTP in production. Consider using HTTPS for security.');
        }
        return backendUrl;
    }
    
    // Development fallback - but warn that this won't work in emails
    console.warn(
        'emailService: No BACKEND_URL or FRONTEND_URL set. Using localhost (will not work in emails).'
    );
    return 'http://localhost:3000';
}

/**
 * Generate download URL from token
 * Downloads are served from the backend at /api/downloads/:token
 */
function getDownloadUrl(token: string): string {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/downloads/${token}`;
}

/**
 * Get logo URL for email (absolute URL)
 * Assets are served from the backend server at /assets
 */
function getLogoUrl(): string {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/assets/images/skimask.png`;
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

        // Log generated URLs for debugging
        const baseUrl = getBaseUrl();
        console.log('emailService: Generated URLs:');
        console.log('   Base URL:', baseUrl);
        console.log('   Logo URL:', getLogoUrl());
        downloadLinks.forEach((link, idx) => {
            console.log(`   Download ${idx + 1}: ${getDownloadUrl(link.token)}`);
        });

        // Format download links HTML
        // Escape HTML in titles and encode URLs properly
        const downloadLinksHtml = downloadLinks
            .map((link, index) => {
                const downloadUrl = getDownloadUrl(link.token);
                const escapedTitle = link.title
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
                
                return `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">
                ${index + 1}. ${escapedTitle}
            </h3>
            <a 
                href="${downloadUrl}" 
                style="display: inline-block; padding: 12px 24px; background-color: #f3c000; color: #000; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;"
            >
                Download WAV/MP3
            </a>
        </div>
    `;
            })
            .join('');

        // Email HTML template
        const logoUrl = getLogoUrl();
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your MuzBeats Purchase</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
    <div style="background-color: #1a1a1a; padding: 20px 30px; text-align: left; border-radius: 8px 8px 0 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${logoUrl}" alt="Muz Beats Logo" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" />
            <span style="color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Muz Beats</span>
        </div>
    </div>
    
    <div style="background-color: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Thank you for your purchase!</h2>
        
        <p style="color: #666; font-size: 16px;">
            Your order has been confirmed. You can download your beats using the links below.
        </p>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
            <p style="margin: 0; color: #666; font-size: 14px;">
                <strong>Order ID:</strong> ${orderId}<br>
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

Your order has been confirmed. Order ID: ${orderId}
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

