import { paypalSDK } from '@/config/paypal.js';
import { getBeatById } from './beatsService.js';
import type { Beat } from '@/types/Beat.js';
import {
    OrdersController,
    CheckoutPaymentIntent,
    OrderApplicationContextLandingPage,
    OrderApplicationContextUserAction,
    ApiResponse,
    Order,
    LinkDescription,
} from '@paypal/paypal-server-sdk';
import {
    CHECKOUT_CURRENCY,
    MAX_BEAT_PRICE_CENTS,
    MAX_CART_TOTAL_CENTS,
    MIN_BEAT_PRICE_CENTS,
    MIN_CART_TOTAL_CENTS,
} from '@/config/checkoutLimits.js';
import { CheckoutError, internalCheckoutError } from '@/utils/checkoutErrors.js';
import { centsToUsd, formatUsdFromCents, usdToCents } from '@/utils/money.js';

// Get orders controller from SDK client
const ordersController = new OrdersController(paypalSDK as any);

// Temporary storage for order data (in production, use Redis or database)
// Maps PayPal order ID -> beat IDs (payer email comes from PayPal at capture)
const orderDataStore = new Map<string, StoredOrderBeatIds>();

/** Validated cart line passed from controller to create-order */
export interface CartLine {
    beatId: string;
    quantity: number;
}

export interface StoredOrderBeatIds {
    beatIds: string[];
}

export interface PayPalOrderCreateResult {
    orderId: string;
    approvalUrl: string;
    amount: number;
    currency: string;
}

/** Subset of PayPal order fields used by checkout status endpoint */
export interface PayPalOrderSummary {
    id?: string;
    status?: string;
    purchaseUnits?: Array<{
        payments?: {
            captures?: Array<{
                amount?: unknown;
            }>;
        };
    }>;
}

/** PayPal Orders API purchase unit payload (camelCase as required by the server SDK). */
interface PayPalPurchaseUnitPayload {
    referenceId: string;
    amount: {
        currencyCode: string;
        value: string;
        breakdown: {
            itemTotal: {
                currencyCode: string;
                value: string;
            };
        };
    };
    items: Array<{
        name: string;
        description: string;
        quantity: string;
        unitAmount: {
            currencyCode: string;
            value: string;
        };
    }>;
    description: string;
    customId: string;
}

/**
 * Create a PayPal Order for the cart
 *
 * @param cartLines - Validated cart lines (beatId + quantity per line)
 * @returns PayPal Order with ID and approval URL
 */
export async function createPayPalOrder(
    cartLines: CartLine[]
): Promise<PayPalOrderCreateResult> {
    try {
        // Fetch all beats from database to get prices
        const beats = await Promise.all(cartLines.map((line) => getBeatById(line.beatId)));
        if (beats.some((b) => b === null)) {
            throw new CheckoutError(
                'One or more beats in your cart could not be found',
                400
            );
        }

        const validBeats = beats as Beat[];

        if (validBeats.length === 0) {
            console.warn('No valid beats found in cart'); // should never execute because cartLines.length >= 1 when paypalController.ts calls it.
            throw internalCheckoutError();
        }

        let totalPriceInCents = 0;
        const lineItems: Array<{ beat: Beat; quantity: number; beatPriceInCents: number }> = [];

        for (let i = 0; i < cartLines.length; i++) {
            const { quantity } = cartLines[i];
            const beat = validBeats[i];

            if (!Number.isFinite(beat.price)) {
                console.warn('createPayPalOrder: invalid beat price', {
                    beatId: beat.id,
                    price: beat.price,
                });
                throw internalCheckoutError();
            }

            const beatPriceInCents = usdToCents(beat.price);

            // Re-check beat price in cents (controller already validated dollars).
            // Quantity bounds are enforced in the controller; pass through here for the PayPal line total.
            if (
                beatPriceInCents < MIN_BEAT_PRICE_CENTS ||
                beatPriceInCents > MAX_BEAT_PRICE_CENTS
            ) {
                console.warn('createPayPalOrder: beat price out of bounds', {
                    beatId: beat.id,
                    price: beat.price,
                    beatPriceInCents,
                    minCents: MIN_BEAT_PRICE_CENTS,
                    maxCents: MAX_BEAT_PRICE_CENTS,
                });
                throw internalCheckoutError();
            }

            totalPriceInCents += beatPriceInCents * quantity;
            lineItems.push({ beat, quantity, beatPriceInCents });
        }

        if (
            totalPriceInCents < MIN_CART_TOTAL_CENTS ||
            totalPriceInCents > MAX_CART_TOTAL_CENTS
        ) {
            console.warn('createPayPalOrder: cart total out of bounds', { totalPriceInCents });
            throw internalCheckoutError();
        }

        const totalPriceInUsdFormatted = formatUsdFromCents(totalPriceInCents);

        const paypalItems = lineItems.map((item) => ({
            name: item.beat.title,
            description: `${item.beat.key} • ${item.beat.bpm} BPM`,
            quantity: item.quantity.toString(),
            unitAmount: {
                currencyCode: CHECKOUT_CURRENCY,
                value: formatUsdFromCents(item.beatPriceInCents),
            },
        }));

        const beatIdsString = lineItems.map((item) => item.beat.id).join(',');

        const purchaseUnits: PayPalPurchaseUnitPayload[] = [{
            referenceId: 'default',
            amount: {
                currencyCode: CHECKOUT_CURRENCY,
                value: totalPriceInUsdFormatted,
                breakdown: {
                    itemTotal: {
                        currencyCode: CHECKOUT_CURRENCY,
                        value: totalPriceInUsdFormatted,
                    },
                },
            },
            items: paypalItems,
            description: `Beat IDs: ${beatIdsString}`,
            customId: beatIdsString,
        }];

        const response: ApiResponse<Order> = await ordersController.createOrder({
            body: {
                intent: CheckoutPaymentIntent.Capture,
                purchaseUnits: purchaseUnits,
                applicationContext: {
                    brandName: 'MuzBeats',
                    landingPage: OrderApplicationContextLandingPage.NoPreference,
                    userAction: OrderApplicationContextUserAction.PayNow,
                    returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/store/checkout/success`,
                    cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/store/checkout`,
                },
            },
        });

        const paypalOrderId = response.result.id;

        if (!paypalOrderId) {
            console.warn('createPayPalOrder: PayPal response missing order id');
            throw internalCheckoutError();
        }

        orderDataStore.set(paypalOrderId, {
            beatIds: lineItems.map((item) => item.beat.id),
        });

        console.log(`Stored order data for PayPal order ${paypalOrderId}:`, {
            beatIds: lineItems.map((item) => item.beat.id),
        });

        // Extract approval URL
        const approvalUrl = response.result.links?.find(
            (link: LinkDescription) => link.rel === 'approve'
        )?.href ?? '';

        return {
            orderId: paypalOrderId,
            approvalUrl,
            amount: centsToUsd(totalPriceInCents),
            currency: CHECKOUT_CURRENCY,
        };
    } catch (error) {
        // Already a CheckoutERROR (400 or 500 we threw above) - pass through
        if (error instanceof CheckoutError) {
            throw error;
        }

        // PayPal SDK, getBeatById DB failure, network, etc.
        console.error('Error creating PayPal order:', error);
        throw internalCheckoutError();
    }
}

/**
 * Capture a PayPal order after customer approval
 *
 * @param orderId - PayPal order ID
 * @returns Captured order details
 */
export async function capturePayPalOrder(orderId: string): Promise<unknown> {
    try {
        const response = await ordersController.captureOrder({
            id: orderId,
        });

        return response.result;
    } catch (error) {
        console.error('Error capturing PayPal order:', error);
        throw error;
    }
}

/**
 * Get PayPal order details
 *
 * @param orderId - PayPal order ID
 * @returns Order details
 */
export async function getPayPalOrder(orderId: string): Promise<PayPalOrderSummary> {
    try {
        const response = await ordersController.getOrder({
            id: orderId,
        });

        return response.result as PayPalOrderSummary;
    } catch (error) {
        console.error('Error retrieving PayPal order:', error);
        throw error;
    }
}

/**
 * Read beat IDs stashed at create-order for capture fulfillment.
 * Removes the entry after read to limit memory growth.
 *
 * @param orderId - PayPal order ID
 * @returns Stored beat IDs or null if not found (e.g. server restarted)
 */
export function getStoredOrderBeatIds(orderId: string): StoredOrderBeatIds | null {
    const beatIds = orderDataStore.get(orderId);
    if (!beatIds) return null;

    // Remove from store after retrieval to prevent double order capturing and prevent memory leaks
    orderDataStore.delete(orderId);
    return beatIds;
}
