import pool from '@/config/database.js';
import type { OrderStatus } from '@/types/Order.js';
import { randomBytes } from 'crypto';
import {
    CHECKOUT_CURRENCY,
    MAX_CART_TOTAL_CENTS,
    MAX_CART_TOTAL_USD,
    MIN_CART_TOTAL_CENTS,
    MIN_CART_TOTAL_USD,
    DOWNLOAD_TOKEN_TTL_DAYS,
    MAX_DOWNLOADS_PER_TOKEN,
    MIN_BEAT_PRICE_CENTS,
    MAX_BEAT_PRICE_CENTS,
    MIN_BEAT_PRICE_USD,
    MAX_BEAT_PRICE_USD,
    isValidUUIDv4,
    areValidBeatIds,
} from '@/config/checkoutLimits.js';
import { centsToUsd, usdToCents } from '@/utils/money.js';
import { QueryResult } from 'pg';

// PayPal order capture type (simplified for our needs)
export interface PayPalOrderCapture {
    id: string;
    status: string;
    purchaseUnits: Array<{
        payments: {
            captures: Array<{
                amount: {
                    value: string;
                    currencyCode: string;
                };
            }>;
        };
        customId?: string;
    }>;
    payer?: {
        emailAddress?: string;
    };
}

export interface OrderCaptureResult {
    orderId: string;
    customerEmail: string;
    totalAmount: number;
    beatIds: string[];
}

/** PayPal Orders API id: 1–36 uppercase alphanumeric chars. */
const PAYPAL_ORDER_ID_REGEX: RegExp = /^[A-Z0-9]{1,36}$/;

/**
 * Returns true when value looks like a PayPal order id.
 * Used to reject garbage cheaply before PayPal/DB work — not a substitute for parameterized SQL.
 */
function isValidPayPalOrderId(paypalOrderId: unknown): boolean {
    if (typeof paypalOrderId !== 'string') return false;
    return PAYPAL_ORDER_ID_REGEX.test(paypalOrderId);
}

/** Minimum plausible email length (e.g. a@b.c). */
const MIN_EMAIL_LENGTH = 3;
/** Practical upper bound for email address length. */
const MAX_EMAIL_LENGTH = 320;

/**
 * Pragmatic email shape check (non–RFC 5322).
 *
 * Intentionally strict allowlist (ASCII local/domain chars only) + length bound.
 * Full RFC regexes are huge and ReDoS-prone; a `validator`-style dependency is optional later
 * if we need broader acceptance. Parameterized queries handle SQL safety —
 * this rejects garbage / unexpected unicode before Resend / fulfillment assumptions.
 */
const EMAIL_REGEX: RegExp = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

function isValidEmail(email: unknown): boolean {
    if (typeof email !== 'string') return false;
    if (email.length < MIN_EMAIL_LENGTH || email.length > MAX_EMAIL_LENGTH) {
        return false;
    }
    return EMAIL_REGEX.test(email);
}

/**
 * Create an order and related order_items/downloads from a PayPal Order Capture.
 *
 * Handles PayPal's order structure and creates database records.
 *
 * @param paypalOrder - The captured PayPal order
 * @param storedData - Optional stored beat IDs from create-order (in-memory bridge)
 */
export async function createOrderFromPayPalCapture(
    paypalOrder: PayPalOrderCapture,
    storedData?: { beatIds: string[] } | null
): Promise<OrderCaptureResult> {
    const dbClient = await pool.connect();

    try {
        await dbClient.query('BEGIN');

        const paypalOrderId = paypalOrder.id;

        if (!isValidPayPalOrderId(paypalOrderId)) {
            throw new Error('Not valid PayPal order id');
        }

        // Get customer email from PayPal payer info (always provided by PayPal)
        const customerEmail = paypalOrder.payer?.emailAddress || '';

        if (!isValidEmail(customerEmail)) {
            throw new Error('Invalid customer email');
        }

        // Get total amount from first capture (integer cents for bounds; dollars for DB)
        const capture = paypalOrder.purchaseUnits?.[0]?.payments?.captures?.[0];
        if (!capture?.amount?.value) {
            throw new Error('PayPal capture missing amount');
        }

        const usedCurrencyCode = capture.amount.currencyCode;
        if (!usedCurrencyCode) {
            throw new Error('PayPal capture missing currency code');
        }
        if (usedCurrencyCode !== CHECKOUT_CURRENCY) {
            throw new Error(
                `Currency code (${usedCurrencyCode}) does not match CHECKOUT_CURRENCY (${CHECKOUT_CURRENCY})`
            );
        }

        const captureAmountDollars = Number(capture.amount.value);
        if (!Number.isFinite(captureAmountDollars)) {
            throw new Error('Invalid capture amount');
        }

        const totalPriceInCents = usdToCents(captureAmountDollars);
        if (
            totalPriceInCents < MIN_CART_TOTAL_CENTS ||
            totalPriceInCents > MAX_CART_TOTAL_CENTS
        ) {
            throw new Error(
                `Total price (${centsToUsd(totalPriceInCents)}) out of bounds [${MIN_CART_TOTAL_USD}, ${MAX_CART_TOTAL_USD}]`
            );
        }

        const totalAmount = centsToUsd(totalPriceInCents);

        // PayPal wire status (uppercase). Only COMPLETED means money settled enough to fulfill.
        // MuzBeats DB status stays lowercase and independent — we set 'completed' only after we commit to fulfill.
        if (paypalOrder.status !== 'COMPLETED') {
            throw new Error(
                `PayPal status is ${paypalOrder.status}, not COMPLETED; refusing fulfillment`
            );
        }

        const status: OrderStatus = 'completed';

        // Get beat IDs from stored data (most reliable)
        let beatIds: string[] = [];
        
        if (storedData?.beatIds && storedData.beatIds.length > 0) {
            beatIds = storedData.beatIds;
            console.log('Using beat IDs from stored data:', beatIds);
        } else {
            // Fallback: try to parse from customId
            const customId = paypalOrder.purchaseUnits?.[0]?.customId;
            if (customId) {
                beatIds = customId.split(',').map(id => id.trim()).filter(id => id.length > 0);
                console.log('Parsed beat IDs from customId:', beatIds);
            } else {
                console.warn('No beat IDs found in stored data or PayPal customId');
            }
        }

        if (beatIds.length === 0) {
            throw new Error('beatIds cannot be empty.');
        }

        if (!areValidBeatIds(beatIds)) {
            throw new Error(`beatIds are not valid UUIDv4 strings: ${beatIds}`);
        }

        // Insert into orders table
        const orderResult: QueryResult<any> = await dbClient.query(
            `
            INSERT INTO orders (customer_email, total_amount, status, paypal_order_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `,
            [customerEmail, totalAmount, status, paypalOrderId]
        );

        const orderId: string = orderResult.rows[0].id;

        if (!isValidUUIDv4(orderId)) {
            throw new Error(`Order id (${orderId}) is not valid`);
        }

        // Fetch current beat prices for all beatIds and insert into order_items      
        const beatsResult: QueryResult<any> = await dbClient.query(
            `
            SELECT id, price
            FROM beats
            WHERE id = ANY($1::uuid[])
        `,
            [beatIds]
        );

        if (beatsResult.rows.length !== beatIds.length) {
            throw new Error(`beatsResult.rows.length (${beatsResult.rows.length}) does not match beatIds.length (${beatIds.length})`);
        }

        // Calculate expiration date (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + DOWNLOAD_TOKEN_TTL_DAYS);

        for (const row of beatsResult.rows) {
            if (!isValidUUIDv4(row.id)) {
                throw new Error(`Row ID (${row.id}) in 'beats' table in db is invalid`);
            }

            const beatPriceInCents = usdToCents(Number(row.price));
            if (beatPriceInCents < MIN_BEAT_PRICE_CENTS || beatPriceInCents > MAX_BEAT_PRICE_CENTS) {
                throw new Error(`Beat price for ${row.id} (${row.price}) is outside the valid range of [${MIN_BEAT_PRICE_USD}, ${MAX_BEAT_PRICE_USD}]`);
            }

            // Insert order item
            await dbClient.query(
                `
                INSERT INTO order_items (order_id, beat_id, price_at_purchase, quantity)
                VALUES ($1, $2, $3, $4)
            `,
                [orderId, row.id, row.price, 1]
            );

            // Generate secure download token
            const tokenBytes = randomBytes(32);
            const downloadToken = tokenBytes.toString('base64url');

            // Insert download token
            await dbClient.query(
                `
                INSERT INTO downloads (order_id, beat_id, download_token, expires_at, max_downloads)
                VALUES ($1, $2, $3, $4, $5)
            `,
                [orderId, row.id, downloadToken, expiresAt, MAX_DOWNLOADS_PER_TOKEN]
            );
        }

        await dbClient.query('COMMIT');

        return {
            orderId,
            customerEmail,
            totalAmount,
            beatIds,
        };
    } catch (error) {
        await dbClient.query('ROLLBACK');
        console.error('orderService.createOrderFromPayPalCapture error:', error);
        throw error;
    } finally {
        dbClient.release();
    }
}
