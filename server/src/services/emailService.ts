import { Resend } from 'resend';
import dotenv from 'dotenv';
import pool from '@/config/database.js';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

function normalizeBaseUrl(raw: string): string {
    const v = (raw || '').trim();
    if (!v) return v;

    // Support values like "//api-staging.prodmuz.com"
    if (v.startsWith('//')) {
        return `https:${v}`;
    }

    // If user forgot scheme, assume https in prod, http in dev.
    if (!/^https?:\/\//i.test(v)) {
        const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        return `${scheme}://${v}`;
    }

    return v;
}

/**
 * Get download links for an order
 */
async function getDownloadLinks(orderId: string) {
    const result = await pool.query(
        `
        SELECT
            d.download_token,
            b.title,
            b.key,
            b.bpm,
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
        key: row.key,
        bpm: row.bpm,
        beatId: row.beat_id,
    }));
}

/**
 * Get base URL for download links
 * Downloads are served from the backend API, so we use BACKEND_URL
 * Falls back to FRONTEND_URL if BACKEND_URL is not set (for same-domain setups)
 *
 * NOTE:
 * - In production, this should typically be your public API base (e.g. https://api.prodmuz.com)
 * - In local development, emails cannot use localhost. Use EMAIL_LINK_BASE_URL with a public tunnel
 *   (ngrok / cloudflared) if you want email links to work end-to-end while testing locally.
 */
function getBaseUrl(): string {
    // Highest priority: explicitly configured email link base URL
    // This lets local dev emails use a public tunnel URL while the backend runs on localhost.
    if (process.env.EMAIL_LINK_BASE_URL) {
        return normalizeBaseUrl(process.env.EMAIL_LINK_BASE_URL);
    }

    // Prefer BACKEND_URL since downloads are served from backend
    const backendUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL;
    
    if (backendUrl) {
        // Ensure HTTPS in production (unless explicitly HTTP)
        if (backendUrl.startsWith('http://') && process.env.NODE_ENV === 'production') {
            console.warn('emailService: Using HTTP in production. Consider using HTTPS for security.');
        }
        return normalizeBaseUrl(backendUrl);
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
    // Use URL join semantics to avoid double slashes and other malformed links.
    // Leading slash ensures we always land on the correct route even if baseUrl contains a path.
    return new URL(`/api/downloads/${encodeURIComponent(token)}`, baseUrl).toString();
}

/**
 * Get logo URL for email (absolute URL)
 * IMPORTANT: Email clients cannot load `localhost` URLs.
 *
 * Recommended:
 * - Set EMAIL_LOGO_URL to a public HTTPS URL (best)
 * - Or upload the logo to R2 and set R2_PUBLIC_URL
 */
function getLogoUrl(): string {
    // Best: explicit public logo URL (HTTPS)
    if (process.env.EMAIL_LOGO_URL) {
        return process.env.EMAIL_LOGO_URL;
    }

    // Next best: R2 public URL (HTTPS) – upload logo to `images/skimask.png`
    if (process.env.R2_PUBLIC_URL) {
        const r2Url = process.env.R2_PUBLIC_URL.endsWith('/')
            ? process.env.R2_PUBLIC_URL.slice(0, -1)
            : process.env.R2_PUBLIC_URL;
        return `${r2Url}/images/skimask.png`;
    }

    // Production backend static route (HTTPS)
    if (process.env.BACKEND_URL) {
        return `${process.env.BACKEND_URL}/assets/images/skimask.png`;
    }

    // Fallback: might be fine in prod if frontend serves assets, but usually not for this repo
    if (process.env.FRONTEND_URL) {
        return `${process.env.FRONTEND_URL}/assets/images/skimask.png`;
    }

    console.warn(
        'emailService: No EMAIL_LOGO_URL/R2_PUBLIC_URL/BACKEND_URL/FRONTEND_URL set. Logo will likely not render.'
    );
    return '';
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
): Promise<boolean> {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
        console.warn(
            'emailService: RESEND_API_KEY not configured. Skipping email send.'
        );
        console.log('📧 Would send download email to:', email);
        console.log('   Order ID:', orderId);
        return false;
    }

    // Optional safety: only allow emails to specific recipients (useful in staging)
    // Example:
    // EMAIL_ALLOWLIST=you@gmail.com,other@test.com
    if (process.env.EMAIL_ALLOWLIST) {
        const allowlist = process.env.EMAIL_ALLOWLIST
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
        const normalized = email.trim().toLowerCase();
        if (allowlist.length > 0 && !allowlist.includes(normalized)) {
            console.warn(
                'emailService: Recipient not in EMAIL_ALLOWLIST. Skipping email send.',
                { email }
            );
            return false;
        }
    }

    // Get download links for this order
    const downloadLinks = await getDownloadLinks(orderId);

    if (downloadLinks.length === 0) {
        console.warn(
            `emailService: No download links found for order ${orderId}. Skipping email.`
        );
        return false;
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
            const escapedKey = String(link.key ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            const bpmValue =
                typeof link.bpm === 'number' && Number.isFinite(link.bpm) ? Math.round(link.bpm) : null;

            return `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">
                ${index + 1}. ${escapedTitle}
            </h3>
            <div style="margin: 0 0 12px 0; color: #666; font-size: 14px;">
                Key: <strong>${escapedKey || 'Unknown'}</strong>
                &nbsp;•&nbsp;
                BPM: <strong>${bpmValue ?? 'Unknown'}</strong>
            </div>
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
    // Email template: table-based for maximum compatibility (Gmail/Outlook/etc.)
    // Avoid flex/grid — many email clients strip or break those styles.
    const safeLogoHtml = logoUrl
        ? `<img src="${logoUrl}" width="40" height="40" alt="MuzBeats" style="display:block;border:0;outline:none;text-decoration:none;" />`
        : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your MuzBeats Purchase</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background-color:#f4f4f4;">
        <tr>
            <td align="center" style="padding:24px 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="border-collapse:collapse;width:600px;max-width:600px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color:#1a1a1a;padding:18px 22px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                                <tr>
                                    <td width="44" valign="middle" style="width:44px;padding-right:12px;">
                                        ${safeLogoHtml}
                                    </td>
                                    <td valign="middle" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">
                                        MuzBeats
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:24px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
                            <h2 style="margin:0 0 10px 0;font-size:22px;line-height:1.3;color:#111827;">Thank you for your purchase!</h2>
                            <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#4b5563;">
                                Your order has been confirmed. You can download your beats using the links below.
                            </p>

                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background-color:#f3f4f6;border-radius:10px;">
                                <tr>
                                    <td style="padding:14px 14px;font-size:13px;line-height:1.5;color:#374151;">
                                        <strong>Order ID:</strong> ${orderId}<br />
                                        <strong>Total:</strong> $${orderTotal.toFixed(2)}
                                    </td>
                                </tr>
                            </table>

                            <h3 style="margin:20px 0 12px 0;font-size:16px;line-height:1.4;color:#111827;">Your Downloads</h3>
                            ${downloadLinksHtml}

                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-top:16px;background-color:#fff3cd;border-left:4px solid #f3c000;border-radius:8px;">
                                <tr>
                                    <td style="padding:12px 12px;font-size:13px;line-height:1.5;color:#856404;">
                                        <strong>Important:</strong> Download links expire in 30 days and can be used up to 5 times each.
                                        Please save your files to a secure location.
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:18px 0 0 0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;line-height:1.6;color:#6b7280;">
                                If you have any questions or need assistance, please contact us.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding:14px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:#9ca3af;">
                            © ${new Date().getFullYear()} MuzBeats. All rights reserved.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

    // Plain text version
    const downloadLinksText = downloadLinks
        .map(
            (link, index) => {
                const bpmValue =
                    typeof link.bpm === 'number' && Number.isFinite(link.bpm) ? Math.round(link.bpm) : null;
                return `${index + 1}. ${link.title}\n   Key: ${link.key || 'Unknown'} | BPM: ${
                    bpmValue ?? 'Unknown'
                }\n   ${getDownloadUrl(link.token)}`;
            }
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
        ...(process.env.RESEND_REPLY_TO_EMAIL ? { replyTo: process.env.RESEND_REPLY_TO_EMAIL } : {}),
        subject: 'Your MuzBeats Purchase - Download Links',
        html,
        text,
    });

    if (error) {
        console.error('emailService: Failed to send email:', error);
        return false;
    }

    console.log('emailService: Download email sent successfully to', email);
    console.log('   Email ID:', data?.id);
    return true;
}

