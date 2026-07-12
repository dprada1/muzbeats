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
} from '@paypal/paypal-server-sdk';
import { MAX_BEAT_PRICE_USD, MAX_CART_TOTAL_USD, MIN_BEAT_PRICE_USD, MIN_CART_TOTAL_USD } from '@/config/checkoutLimits.js';
import { CheckoutError, internalCheckoutError } from '@/utils/checkoutErrors.js';

// Get orders controller from SDK client
const ordersController = new OrdersController(paypalSDK as any);

// Temporary storage for order data (in production, use Redis or database)
// Maps PayPal order ID -> beat IDs (email comes from PayPal payer info)
const orderDataStore = new Map<string, StoredOrderData>();

/** Validated cart line passed from controller to create-order */
export interface CartLine {
    beatId: string;
    quantity: number;
}

export interface StoredOrderData {
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

/**
 * Create a PayPal Order for the cart
 * 
 * @param cartLines - Validated cart lines (beatId + quantity per line)
 * - beatId is a UUIDv4 string
 * - Quantity is an integer in specified valid range
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

        // Calculate total amount and create line items
        let totalAmount = 0;
        const lineItems: Array<{ beat: Beat; quantity: number }> = [];
        const purchaseUnits: any[] = [];

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

            if (beat.price < MIN_BEAT_PRICE_USD || beat.price > MAX_BEAT_PRICE_USD) {
                console.warn('createPayPalOrder: beat price out of bounds', {
                    beatId: beat.id,
                    price: beat.price,
                    min: MIN_BEAT_PRICE_USD,
                    max: MAX_BEAT_PRICE_USD,
                });
                throw internalCheckoutError();
            }

            totalAmount += beat.price * quantity;
            lineItems.push({ beat, quantity });
        }

        if (totalAmount < MIN_CART_TOTAL_USD || totalAmount > MAX_CART_TOTAL_USD) {
            console.warn('createPayPalOrder: cart total out of bounds', { totalAmount});
            throw internalCheckoutError();
        }

        // Create PayPal order items (using camelCase as required by SDK)
        const paypalItems = lineItems.map(item => ({
            name: item.beat.title,
            description: `${item.beat.key} • ${item.beat.bpm} BPM`,
            quantity: item.quantity.toString(),
            unitAmount: {
                currencyCode: 'USD',
                value: item.beat.price.toFixed(2),
            },
        }));

        // Create purchase unit (using camelCase as required by SDK)
        // Store beat IDs in description since customId is unreliable
        const beatIdsString = lineItems.map(item => item.beat.id).join(',');
        
        purchaseUnits.push({
            referenceId: 'default',
            amount: {
                currencyCode: 'USD',
                value: totalAmount.toFixed(2),
                breakdown: {
                    itemTotal: {
                        currencyCode: 'USD',
                        value: totalAmount.toFixed(2),
                    },
                },
            },
            items: paypalItems,
            description: `Beat IDs: ${beatIdsString}`,
            customId: beatIdsString, // Store as comma-separated string
        });

        // Create the order using SDK
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

        const paypalOrderId = response.result.id || '';
        
        // Store order data for later retrieval (when capturing)
        orderDataStore.set(paypalOrderId, {
            beatIds: lineItems.map(item => item.beat.id),
        });
        
        console.log(`Stored order data for PayPal order ${paypalOrderId}:`, {
            beatIds: lineItems.map(item => item.beat.id),
        });

        // Extract approval URL
        const approvalUrl = response.result.links?.find(
            (link: any) => link.rel === 'approve'
        )?.href || '';

        return {
            orderId: paypalOrderId,
            approvalUrl,
            amount: totalAmount,
            currency: 'USD',
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
 * Get stored order data (beat IDs and customer email)
 * 
 * @param orderId - PayPal order ID
 * @returns Stored order data or null if not found
 */
export function getStoredOrderData(orderId: string): StoredOrderData | null {
    const data = orderDataStore.get(orderId);
    if (data) {
        // Remove from store after retrieval to prevent memory leaks
        orderDataStore.delete(orderId);
    }
    return data || null;
}

