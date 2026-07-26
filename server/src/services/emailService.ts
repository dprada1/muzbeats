import { Resend } from 'resend';
import dotenv from 'dotenv';
import pool from '@/config/database.js';
import type { QueryResult } from 'pg';
import { logError, logInfo, logWarn } from '@/utils/logger.js';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const HTTPS_OR_HTTP_SCHEME_REGEX: RegExp = /^https?:\/\//i;

/** One purchasable beat row joined with its download token and purchase line for an order. */
type OrderDownloadItem = {
    downloadToken: string;
    title: string;
    key: string;
    bpm: number;
    beatId: string;
    /** Unit price locked at purchase time (from order_items.price_at_purchase). */
    priceAtPurchase: number;
    /** Quantity purchased for this beat line (from order_items.quantity). */
    quantity: number;
};

/**
 * Normalize a base URL string so it is absolute with an `http://` or `https://` scheme.
 *
 * Trims whitespace. Empty (or whitespace-only) input returns `""`.
 * Protocol-relative values like `//api.example.com` become `https://…` (email-safe).
 * Bare hosts without a scheme get `https` in production and `http` otherwise.
 * Values that already start with `http://` or `https://` are returned trimmed as-is.
 *
 * @param raw - Candidate base URL from env (may omit scheme or use `//host`)
 * @returns Absolute base URL, or `""` if `raw` is empty after trim
 */
function normalizeBaseUrl(raw: string): string {
    const v = raw.trim();
    if (!v) return v;

    // Support values like "//api-staging.prodmuz.com"
    if (v.startsWith('//')) {
        return `https:${v}`;
    }

    // If user forgot scheme, assume https in prod, http in dev.
    if (!HTTPS_OR_HTTP_SCHEME_REGEX.test(v)) {
        const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        return `${scheme}://${v}`;
    }

    return v;
}

/**
 * Load download tokens, beat metadata, and purchase line data for an order.
 *
 * Runs a SQL join of `downloads` → `beats` → `order_items` filtered by `orderId`,
 * ordered by beat title, then maps each row into an {@link OrderDownloadItem}.
 *
 * Price/quantity come from `order_items` (what the buyer actually paid), not `beats.price`
 * (current catalog price, which may have changed since purchase).
 *
 * @param orderId - Order UUID whose download rows to fetch
 * @returns Promise of item objects (empty array if the order has no downloads)
 */
async function getOrderDownloadItems(orderId: string): Promise<OrderDownloadItem[]> {
    const result: QueryResult<any> = await pool.query(
        `
        SELECT
            d.download_token,
            b.title,
            b.key,
            b.bpm,
            b.id as beat_id,
            oi.price_at_purchase,
            oi.quantity
        FROM downloads d
        JOIN beats b ON d.beat_id = b.id
        JOIN order_items oi ON oi.order_id = d.order_id AND oi.beat_id = d.beat_id
        WHERE d.order_id = $1
        ORDER BY b.title
    `,
        [orderId]
    );

    return result.rows.map((row) => ({
        downloadToken: row.download_token,
        title: row.title,
        key: row.key,
        bpm: row.bpm,
        beatId: row.beat_id,
        // pg returns DECIMAL as string; coerce so templates can format safely.
        priceAtPurchase: Number(row.price_at_purchase),
        quantity: Number(row.quantity),
    }));
}

/**
 * Resolve the public base URL that download links must point at.
 *
 * The chosen host must be reachable from the buyer's mail client AND talk to the same
 * database that created the token:
 * - Local dev: EMAIL_LINK_BASE_URL (a public tunnel to localhost, e.g. cloudflared) wins.
 * - Production/staging: BACKEND_URL (e.g. https://api.prodmuz.com).
 *
 * There is intentionally no localhost fallback: a misconfigured environment must fail loudly
 * rather than send emails with unclickable links. Startup env validation should make these
 * throws effectively unreachable in deployed environments.
 *
 * @returns Absolute, scheme-normalized base URL
 * @throws If neither EMAIL_LINK_BASE_URL nor BACKEND_URL is configured, or if the resolved
 *   URL uses insecure http:// in production
 */
function getBaseURL(): string {
    // Local development uses EMAIL_LINK_BASE_URL (a public tunnel) with highest priority;
    // production/staging use BACKEND_URL. First non-empty wins.
    const rawBaseUrl =
        process.env.EMAIL_LINK_BASE_URL?.trim() ||
        process.env.BACKEND_URL?.trim();
    if (!rawBaseUrl) {
        throw new Error(
            'emailService.getBaseURL: Neither EMAIL_LINK_BASE_URL nor BACKEND_URL is configured; cannot build download links.'
        );
    }

    const baseUrl = normalizeBaseUrl(rawBaseUrl);

    // Refuse plaintext http:// in production: the download link (and therefore the streamed
    // WAV and its capability token) would travel unencrypted and be exposed to MITM.
    if (process.env.NODE_ENV === 'production' && baseUrl.startsWith('http://')) {
        throw new Error(
            `emailService.getBaseURL: Refusing insecure http:// base URL in production (${baseUrl}). Use https://.`
        );
    }

    return baseUrl;
}

/**
 * Generate an absolute download URL from a token.
 * Downloads are served from the backend at /api/downloads/:token
 *
 * @param baseUrl - Public base URL from {@link getBaseUrl}
 * @param token - Download token to embed in the path
 */
function getDownloadURL(baseUrl: string, token: string): string {
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
function getLogoURL(): string {
    // Best: explicit public logo URL (HTTPS)
    const emailLogoURL = process.env.EMAIL_LOGO_URL
    if (emailLogoURL) {
        return emailLogoURL;
    }

    // Next best: Build logo URL from known backend URL using production backend static route (HTTPS)
    const backendURL = process.env.BACKEND_URL
    if (backendURL) {
        return `${backendURL}/assets/images/skimask.png`;
    }

    // Next best: R2 public URL (HTTPS) – upload logo to `images/skimask.png`
    const R2PublicURL = process.env.R2_PUBLIC_URL;
    if (R2PublicURL) {
        const r2Url = R2PublicURL.endsWith('/')
            ? R2PublicURL.slice(0, -1)
            : R2PublicURL;
        return `${r2Url}/images/skimask.png`;
    }

    logWarn(
        'emailService.getLogoURL',
        'No EMAIL_LOGO_URL/R2_PUBLIC_URL/BACKEND_URL set — logo will likely not render'
    );
    return '';
}

/** Escape HTML special characters so DB values can't inject markup into the email. */
function escapeHTML(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Format a purchase line for the receipt.
 * qty 1 → `$19.99`
 * qty > 1 → `$19.99 × 2 = $39.98` (unit, multiplier, line total)
 */
function formatPurchasePrice(priceAtPurchase: number, quantity: number): string {
    if (typeof priceAtPurchase !== 'number' || !Number.isFinite(priceAtPurchase)) {
        return '—';
    }

    const unit = `$${priceAtPurchase.toFixed(2)}`;
    const qty =
        typeof quantity === 'number' && Number.isFinite(quantity) && quantity >= 1
            ? Math.trunc(quantity)
            : 1;

    if (qty <= 1) {
        return unit;
    }

    const lineTotal = `$${(priceAtPurchase * qty).toFixed(2)}`;
    return `${unit} × ${qty} = ${lineTotal}`;
}

/**
 * Send download email to customer after successful purchase
 *
 * @param emailAddress - Customer email address
 * @param orderId - Order ID
 * @param orderTotal - Total amount paid
 */
export async function sendDownloadEmail(
    emailAddress: string,
    orderId: string,
    orderTotal: number
): Promise<boolean> {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
        logWarn(
            'emailService.sendDownloadEmail',
            'RESEND_API_KEY not configured — skipping email send',
            { emailAddress, orderId }
        );
        return false;
    }

    // Optional safety: only allow emails to specific recipients (useful in staging)
    // Example:
    // EMAIL_ALLOWLIST=you@gmail.com,other@test.com
    const emailAllowlist = process.env.EMAIL_ALLOWLIST;
    if (emailAllowlist) {
        const allowlist = emailAllowlist
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
        const normalizedEmailAddress = emailAddress.trim().toLowerCase();
        if (allowlist.length > 0 && !allowlist.includes(normalizedEmailAddress)) {
            logWarn(
                'emailService.sendDownloadEmail',
                'Recipient not in EMAIL_ALLOWLIST — skipping email send',
                { emailAddress, orderId }
            );
            return false;
        }
    }

    // Get download links for this order
    const orderDownloadItems = await getOrderDownloadItems(orderId);

    if (orderDownloadItems.length === 0) {
        logWarn(
            'emailService.sendDownloadEmail',
            'No order download items found — skipping email',
            { orderId }
        );
        return false;
    }

    // Resolve the base URL up front. A misconfigured environment (no EMAIL_LINK_BASE_URL
    // or BACKEND_URL) throws here; treat it like any other pre-send failure and skip the
    // send so the caller reports emailSent=false instead of emailing unclickable links.
    let baseUrl: string;
    try {
        baseUrl = getBaseURL();
    } catch (error) {
        logError(
            'emailService.sendDownloadEmail',
            'Cannot resolve download base URL — skipping email',
            { orderId, error }
        );
        return false;
    }

    logInfo(
        'emailService.sendDownloadEmail',
        'Resolved email link URLs',
        {
            orderId,
            baseUrl,
            logoUrl: getLogoURL() || null,
            itemCount: orderDownloadItems.length,
        }
    );

    // Format download links HTML
    // Escape HTML in titles and encode URLs properly
    const downloadItemsHTML = orderDownloadItems
        .map((link, index) => {
            const downloadURL = getDownloadURL(baseUrl, link.downloadToken);
            const escapedTitle = escapeHTML(link.title);
            const escapedKey = escapeHTML(link.key);
            const bpmValue =
                typeof link.bpm === 'number' && Number.isFinite(link.bpm) ? Math.round(link.bpm) : null;
            const priceLabel = formatPurchasePrice(link.priceAtPurchase, link.quantity);

            return `
                <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
                    <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">
                        ${index + 1}. ${escapedTitle}
                    </h3>
                    <div style="margin: 0 0 12px 0; color: #666; font-size: 14px;">
                        Key: <strong>${escapedKey || 'Unknown'}</strong>
                        &nbsp;•&nbsp;
                        BPM: <strong>${bpmValue ?? 'Unknown'}</strong>
                        &nbsp;•&nbsp;
                        Price: <strong>${escapeHTML(priceLabel)}</strong>
                    </div>
                    <a 
                        href="${escapeHTML(downloadURL)}" 
                        style="display: inline-block; padding: 12px 24px; background-color: #f3c000; color: #000; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;"
                    >
                        Download WAV
                    </a>
                </div>
            `;
        })
        .join('');

    // Email HTML template
    const logoURL = getLogoURL();
    // Email template: table-based for maximum compatibility (Gmail/Outlook/etc.)
    // Avoid flex/grid — many email clients strip or break those styles.
    const safeLogoHTML = logoURL
        ? `<img src="${escapeHTML(logoURL)}" width="40" height="40" alt="MuzBeats" style="display:block;border:0;outline:none;text-decoration:none;" />`
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
                                                ${safeLogoHTML}
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
                                    ${downloadItemsHTML}

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
    const downloadItemsPlainText = orderDownloadItems
        .map(
            (link, index) => {
                const bpmValue =
                    typeof link.bpm === 'number' && Number.isFinite(link.bpm) ? Math.round(link.bpm) : null;
                const priceLabel = formatPurchasePrice(link.priceAtPurchase, link.quantity);
                return `${index + 1}. ${link.title}\n   Key: ${link.key || 'Unknown'} | BPM: ${
                    bpmValue ?? 'Unknown'
                } | Price: ${priceLabel}\n   ${getDownloadURL(baseUrl, link.downloadToken)}`;
            }
        )
        .join('\n\n');

    const text = `
        Thank you for your purchase!

        Your order has been confirmed. Order ID: ${orderId}
        Total: $${orderTotal.toFixed(2)}

        Your Downloads:
        ${downloadItemsPlainText}

        Important: Download links expire in 30 days and can be used up to 5 times each. 
        Please save your files to a secure location.

        If you have any questions or need assistance, please contact us.

        © ${new Date().getFullYear()} MuzBeats. All rights reserved.
    `;

    // Send email
    const resendReplyToEmail = process.env.RESEND_REPLY_TO_EMAIL;
    const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'MuzBeats <orders@prodmuz.com>',
        to: emailAddress,
        ...(resendReplyToEmail ? { replyTo: resendReplyToEmail } : {}),
        subject: 'Your MuzBeats Purchase - Download Links',
        html,
        text,
    });

    if (error) {
        logError('emailService.sendDownloadEmail', 'Failed to send email', { orderId, error });
        return false;
    }

    await pool.query(
        'UPDATE orders SET download_email_sent_at = NOW() WHERE id = $1',
        [orderId]
    );
    
    logInfo(
        'emailService.sendDownloadEmail',
        'Download email sent successfully',
        {
            orderId,
            emailAddress,
            emailId: data?.id,
        }
    );
    return true;
}
