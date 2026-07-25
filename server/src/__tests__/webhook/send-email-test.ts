/**
 * Manual email test script
 *
 * Creates a synthetic completed order (random beats + cart-line quantity) and sends
 * the download receipt via Resend — no PayPal purchase required.
 *
 * Usage:
 *   npx tsx src/__tests__/webhook/send-email-test.ts --beats 3 --quantity 2
 *   npx tsx src/__tests__/webhook/send-email-test.ts --beats 1
 *   npx tsx src/__tests__/webhook/send-email-test.ts --order <order-uuid>
 *   npx tsx src/__tests__/webhook/send-email-test.ts --beats 2 --quantity 1 --email you@gmail.com
 *
 * Flags:
 *   --beats <n>       How many distinct beats to put on the receipt (default: 1)
 *   --quantity <n>    Cart-line quantity applied to every beat (default: 1)
 *   --email <addr>    Recipient override (default: EMAIL_TEST_TO or test@example.com)
 *   --order <uuid>    Skip synthesis; resend for an existing order instead
 *
 * Notes:
 *   - Beats are chosen with ORDER BY RANDOM() from the beats table.
 *   - Download tokens are random (base64url); they do not need to be clickable for layout tests.
 *   - If EMAIL_ALLOWLIST is set, --email must be on that list or Resend will be skipped.
 */

import dotenv from 'dotenv';
dotenv.config();

import { randomBytes } from 'crypto';
import type { QueryResult } from 'pg';
import pool from '@/config/database.js';
import {
    DOWNLOAD_TOKEN_TTL_DAYS,
    MAX_DOWNLOADS_PER_TOKEN,
} from '@/config/checkoutLimits.js';
import { sendDownloadEmail } from '@/services/emailService.js';

type CliArgs = {
    beats: number;
    quantity: number;
    email: string;
    orderId: string | null;
};

function printUsage(): void {
    console.log(`
Usage:
  npx tsx src/__tests__/webhook/send-email-test.ts --beats 3 --quantity 2
  npx tsx src/__tests__/webhook/send-email-test.ts --order <order-uuid>
  npx tsx src/__tests__/webhook/send-email-test.ts --beats 2 --email you@gmail.com
`);
}

function parsePositiveInt(raw: string | undefined, flag: string): number {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1) {
        throw new Error(`${flag} must be a positive integer (got: ${raw ?? '(missing)'})`);
    }
    return n;
}

function parseArgs(argv: string[]): CliArgs {
    let beats = 1;
    let quantity = 1;
    let email = process.env.EMAIL_TEST_TO?.trim() || 'test@prodmuz.com';
    let orderId: string | null = null;

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const next = argv[i + 1];

        if (arg === '--help' || arg === '-h') {
            printUsage();
            process.exit(0);
        }
        if (arg === '--beats') {
            beats = parsePositiveInt(next, '--beats');
            i++;
            continue;
        }
        if (arg === '--quantity') {
            quantity = parsePositiveInt(next, '--quantity');
            i++;
            continue;
        }
        if (arg === '--email') {
            if (!next?.trim()) throw new Error('--email requires an address');
            email = next.trim();
            i++;
            continue;
        }
        if (arg === '--order') {
            if (!next?.trim()) throw new Error('--order requires an order UUID');
            orderId = next.trim();
            i++;
            continue;
        }

        // Back-compat: bare UUID still means "resend this order"
        if (/^[0-9a-f-]{36}$/i.test(arg)) {
            orderId = arg;
            continue;
        }

        throw new Error(`Unknown argument: ${arg}`);
    }

    return { beats, quantity, email, orderId };
}

type BeatRow = {
    id: string;
    title: string;
    price: string | number;
};

/** Pick `count` random beats from the catalog. */
async function pickRandomBeats(count: number): Promise<BeatRow[]> {
    const result: QueryResult<BeatRow> = await pool.query(
        `
        SELECT id, title, price
        FROM beats
        ORDER BY RANDOM()
        LIMIT $1
    `,
        [count]
    );

    if (result.rows.length === 0) {
        throw new Error('No beats found in database. Seed beats before running this script.');
    }
    if (result.rows.length < count) {
        throw new Error(
            `Requested ${count} beats but only ${result.rows.length} exist in the database.`
        );
    }

    return result.rows;
}

/**
 * Insert a completed test order with order_items + downloads for the given cart lines.
 * Tokens are random opaque strings (fine for email HTML preview; may 404 if clicked).
 */
async function createSyntheticOrder(
    email: string,
    beats: BeatRow[],
    quantity: number
): Promise<{ orderId: string; totalAmount: number }> {
    let totalAmount = 0;
    for (const beat of beats) {
        totalAmount += Number(beat.price) * quantity;
    }

    const paypalOrderId = `test_email_${Date.now()}_${randomBytes(4).toString('hex')}`;

    const orderResult: QueryResult<{ id: string }> = await pool.query(
        `
        INSERT INTO orders (customer_email, total_amount, status, paypal_order_id)
        VALUES ($1, $2, 'completed', $3)
        RETURNING id
    `,
        [email, totalAmount, paypalOrderId]
    );
    const orderId = orderResult.rows[0].id;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DOWNLOAD_TOKEN_TTL_DAYS);

    for (const beat of beats) {
        await pool.query(
            `
            INSERT INTO order_items (order_id, beat_id, price_at_purchase, quantity)
            VALUES ($1, $2, $3, $4)
        `,
            [orderId, beat.id, Number(beat.price), quantity]
        );

        // Random token — not required to be a real downloadable WAV for layout tests
        const downloadToken = randomBytes(32).toString('base64url');

        await pool.query(
            `
            INSERT INTO downloads (order_id, beat_id, download_token, expires_at, max_downloads)
            VALUES ($1, $2, $3, $4, $5)
        `,
            [orderId, beat.id, downloadToken, expiresAt, MAX_DOWNLOADS_PER_TOKEN]
        );
    }

    return { orderId, totalAmount };
}

async function sendForExistingOrder(orderId: string): Promise<void> {
    const orderResult: QueryResult<{
        id: string;
        customer_email: string;
        total_amount: string | number;
    }> = await pool.query(
        'SELECT id, customer_email, total_amount FROM orders WHERE id = $1',
        [orderId]
    );

    if (orderResult.rows.length === 0) {
        throw new Error(`Order ${orderId} not found.`);
    }

    const order = orderResult.rows[0];
    const downloadsResult: QueryResult<{ count: string }> = await pool.query(
        'SELECT COUNT(*)::text as count FROM downloads WHERE order_id = $1',
        [orderId]
    );
    const downloadCount = Number(downloadsResult.rows[0].count);

    console.log('\n📧 Resending download email for existing order...');
    console.log('   Order ID:', order.id);
    console.log('   Email:', order.customer_email);
    console.log('   Total:', `$${Number(order.total_amount).toFixed(2)}`);
    console.log('   Download tokens:', downloadCount);

    if (downloadCount === 0) {
        console.warn('⚠️  No download tokens found for this order — email will soft-fail.');
    }

    const sent = await sendDownloadEmail(
        order.customer_email,
        order.id,
        Number(order.total_amount)
    );
    if (!sent) {
        console.warn('⚠️  sendDownloadEmail returned false (check allowlist / Resend / base URL).');
        return;
    }
    console.log('\n✅ Email sent successfully. Check inbox (and spam).');
}

async function sendSyntheticReceipt(args: CliArgs): Promise<void> {
    console.log('🧪 Building synthetic order for email preview...');
    console.log(`   Beats requested: ${args.beats}`);
    console.log(`   Quantity per beat: ${args.quantity}`);
    console.log(`   Recipient: ${args.email}`);

    const beats = await pickRandomBeats(args.beats);
    console.log('\n🎲 Random beats selected:');
    for (const beat of beats) {
        console.log(
            `   - ${beat.title} ($${Number(beat.price).toFixed(2)}) × ${args.quantity}`
        );
    }

    const { orderId, totalAmount } = await createSyntheticOrder(
        args.email,
        beats,
        args.quantity
    );

    console.log(`\n✅ Created test order ${orderId}`);
    console.log(`   Total: $${totalAmount.toFixed(2)}`);
    console.log('\n📧 Sending download email...');

    const sent = await sendDownloadEmail(args.email, orderId, totalAmount);
    if (!sent) {
        console.warn('⚠️  sendDownloadEmail returned false (check allowlist / Resend / base URL).');
        console.log(`   Order left in DB for inspection: ${orderId}`);
        return;
    }

    console.log('\n✅ Email sent successfully. Check inbox (and spam).');
    console.log(`   Order ID: ${orderId}`);
}

async function main(): Promise<void> {
    try {
        const args = parseArgs(process.argv.slice(2));

        if (args.orderId) {
            await sendForExistingOrder(args.orderId);
        } else {
            await sendSyntheticReceipt(args);
        }
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        printUsage();
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
