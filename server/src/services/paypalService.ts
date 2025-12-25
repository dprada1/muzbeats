import { paypalSDK } from '@/config/paypal.js';
import { getBeatById } from './beatsService.js';
import type { Beat } from '@/types/Beat.js';
import {
    OrdersController,
    CheckoutPaymentIntent,
    OrderApplicationContextLandingPage,
    OrderApplicationContextUserAction,
} from '@paypal/paypal-server-sdk';

// Get orders controller from SDK client
const ordersController = new OrdersController(paypalSDK as any);

// Temporary storage for order data (in production, use Redis or database)
// Maps PayPal order ID -> beat IDs and customer email
const orderDataStore = new Map<string, { beatIds: string[]; customerEmail?: string }>();

/**
 * Cart item from client (just beat IDs)
 */
export interface CartItem {
    beatId: string;
    quantity?: number; // Defaults to 1
}

/**
 * Create a PayPal Order for the cart
 * 
 * @param items - Array of cart items (beat IDs)
 * @param customerEmail - Optional customer email for guest checkout
 * @returns PayPal Order with ID and approval URL
 */
export async function createPayPalOrder(
    items: CartItem[],
    customerEmail?: string
) {
    try {
        // Fetch all beats from database to get prices
        const beatPromises = items.map(item => getBeatById(item.beatId));
        const beats = await Promise.all(beatPromises);

        // Filter out any null beats (invalid IDs)
        const validBeats = beats.filter((beat): beat is Beat => beat !== null);

        if (validBeats.length === 0) {
            throw new Error('No valid beats found in cart');
        }

        // Calculate total amount and create line items
        let totalAmount = 0;
        const lineItems: Array<{ beat: Beat; quantity: number }> = [];
        const purchaseUnits: any[] = [];

        items.forEach((item) => {
            const beat = validBeats.find(b => b.id === item.beatId);
            if (beat) {
                const quantity = item.quantity || 1;
                const amount = beat.price * quantity;
                totalAmount += amount;
                lineItems.push({ beat, quantity });
            }
        });

        if (totalAmount === 0) {
            throw new Error('Total amount cannot be zero');
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
        const response = await ordersController.createOrder({
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
            customerEmail,
        });
        
        console.log(`Stored order data for PayPal order ${paypalOrderId}:`, {
            beatIds: lineItems.map(item => item.beat.id),
            customerEmail,
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
        console.error('Error creating PayPal order:', error);
        throw error;
    }
}

/**
 * Capture a PayPal order after customer approval
 * 
 * @param orderId - PayPal order ID
 * @returns Captured order details
 */
export async function capturePayPalOrder(orderId: string) {
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
export async function getPayPalOrder(orderId: string) {
    try {
        const response = await ordersController.getOrder({
            id: orderId,
        });

        return response.result;
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
export function getStoredOrderData(orderId: string) {
    const data = orderDataStore.get(orderId);
    if (data) {
        // Remove from store after retrieval to prevent memory leaks
        orderDataStore.delete(orderId);
    }
    return data || null;
}

