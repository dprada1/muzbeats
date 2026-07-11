import { Request, Response } from 'express';
import {
    createPayPalOrder,
    capturePayPalOrder,
    getPayPalOrder,
    getStoredOrderData,
} from '@/services/paypalService.js';
import type {
    CartLine,
    PayPalOrderCreateResult,
    PayPalOrderSummary,
    StoredOrderData,
} from '@/services/paypalService.js';
import {
    createOrderFromPayPalCapture,
    type OrderCaptureResult,
    type PayPalOrderCapture,
} from '@/services/orderService.js';
import { sendDownloadEmail } from '@/services/emailService.js';
import pool from '@/config/database.js';
import { QueryResult } from 'pg';
import {
    MAX_CART_ITEMS,
    MIN_ITEM_QUANTITY,
    MAX_ITEM_QUANTITY,
    isValidUUIDv4,
} from '@/config/checkoutLimits.js';


/**
 * Parse cart line quantity from the request body (strict: quantity is required).
 * @returns Parsed quantity, or `null` if missing/invalid (reject with 400).
 */
function parseCartQuantity(raw: unknown): number | null {
    if (typeof raw !== 'number' || !Number.isInteger(raw)) return null;
    if (raw < MIN_ITEM_QUANTITY || raw > MAX_ITEM_QUANTITY) return null;
    return raw;
}

/** Type guard: after this passes, `ids` is narrowed to `string[]`. */
function areValidBeatIds(ids: unknown[]): ids is string[] {
    return ids.every((id) => isValidUUIDv4(id));
}

/**
 * POST /api/checkout/paypal/create-order
 * Create a PayPal Order for the cart
 *
 * Request body:
 * {
 *   items: [{ beatId: "uuid", quantity: 1 }]  // JSON field name is `items`; validated as rawCartLines
 * }
 * 
 * Note: Customer email is automatically retrieved from PayPal payer info during capture
 */
export async function createPayPalOrderHandler(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const { items: rawCartLines } = req.body;

        // Validate request body
        if (!rawCartLines || !Array.isArray(rawCartLines) || rawCartLines.length === 0) {
            res.status(400).json({
                error: 'Cart lines array is required and must not be empty',
            });
            return;
        }

        // Reject number of lines that is suspiciously too long
        if (rawCartLines.length > MAX_CART_ITEMS) {
            res.status(400).json({
                error: `Cart cannot exceed ${MAX_CART_ITEMS} lines`,
            });
            return;
        }

        // Validate each item has a beatId, and is of valid type (uuidv4 string)
        const beatIds = rawCartLines.map((rawCartLine: { beatId?: unknown }) => rawCartLine.beatId);
        if (!areValidBeatIds(beatIds)) {
            res.status(400).json({
                error: 'Each cart line must have a valid beatId (uuidv4 string)',
            });
            return;
        }

        // Reject if we find duplicate beat id's
        // (we don't want to charge the user multiple times for the same beat later)
        if (new Set(beatIds).size !== beatIds.length) {
            res.status(400).json({
                error: 'Cart cannot contain duplicate beatId values',
            });
            return;
        }

        // Reject line quantity that is not within bounds
        const cartLines: CartLine[] = [];
        for (let i = 0; i < rawCartLines.length; i++) {
            const quantity = parseCartQuantity(
                (rawCartLines[i] as { quantity?: unknown }).quantity
            );
            if (quantity === null) {
                res.status(400).json({
                    error: `Each line quantity must be an integer between ${MIN_ITEM_QUANTITY} and ${MAX_ITEM_QUANTITY}`,
                });
                return;
            }
            cartLines.push({ beatId: beatIds[i], quantity });
        }

        // Email is no longer required - PayPal provides it automatically
        const paypalOrder: PayPalOrderCreateResult = await createPayPalOrder(cartLines);

        res.status(200).json(paypalOrder);
    } catch (error: any) {
        console.error('Error in createPayPalOrderHandler:', error);
        res.status(500).json({
            error: 'Failed to create PayPal order',
        });
    }
}

/**
 * POST /api/checkout/paypal/capture-order
 * Capture a PayPal order after customer approval
 *
 * Request body:
 * {
 *   orderId: "paypal_order_id"
 * }
 */
export async function capturePayPalOrderHandler(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const { orderId } = req.body;

        if (!orderId || typeof orderId !== 'string') {
            res.status(400).json({
                error: 'PayPal order ID is required',
            });
            return;
        }

        // Retrieve stored order data (beat IDs and customer email)
        const storedData: StoredOrderData | null = getStoredOrderData(orderId);
        console.log('Retrieved stored order data:', storedData);
        
        // Capture the order
        const capturedOrder: unknown = await capturePayPalOrder(orderId);
        
        // Debug: Log what PayPal is actually returning
        console.log('PayPal captured order structure:', JSON.stringify(capturedOrder, null, 2));

        // Check if order already exists (idempotency)
        const existingOrderResult: QueryResult<any> = await pool.query(
            'SELECT id FROM orders WHERE paypal_order_id = $1',
            [orderId]
        );

        if (existingOrderResult.rows.length > 0) {
            // Order already exists, return success
            res.status(200).json({
                success: true,
                message: 'Order already processed',
                orderId: existingOrderResult.rows[0].id,
                paypalOrderId: orderId,
            });
            return;
        }

        // Create order from captured PayPal order, using stored data for beat IDs
        const orderResult: OrderCaptureResult = await createOrderFromPayPalCapture(
            capturedOrder as PayPalOrderCapture,
            storedData
        );
        console.log('capturePayPalOrderHandler: Order created for PayPal order', orderId);

        // Send download email to customer
        if (orderResult.customerEmail && orderResult.beatIds.length > 0) {
            const emailSent: boolean = await sendDownloadEmail(
                orderResult.customerEmail,
                orderResult.orderId,
                orderResult.totalAmount
            );
            if (emailSent) {
                console.log('capturePayPalOrderHandler: Download email sent successfully');
            } else {
                console.warn(
                    'capturePayPalOrderHandler: Download email was not sent (see logs above)'
                );
            }
        }

        res.status(200).json({
            success: true,
            message: 'Payment processed successfully',
            orderId: orderResult.orderId,
            customerEmail: orderResult.customerEmail,
            totalAmount: orderResult.totalAmount,
            paypalOrderId: orderId,
        });
    } catch (error: any) {
        console.error('Error in capturePayPalOrderHandler:', error);
        res.status(500).json({
            error: error.message || 'Failed to capture PayPal order',
        });
    }
}

/**
 * GET /api/checkout/paypal/order/:id
 * Get PayPal order status
 */
export async function getPayPalOrderHandler(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const { id } = req.params;

        if (!id) {
            res.status(400).json({ error: 'PayPal order ID is required' });
            return;
        }

        const paypalOrder: PayPalOrderSummary = await getPayPalOrder(id);
        res.status(200).json({
            id: paypalOrder.id,
            status: paypalOrder.status,
            amount: paypalOrder.purchaseUnits?.[0]?.payments?.captures?.[0]?.amount,
        });
    } catch (error: any) {
        console.error('Error in getPayPalOrderHandler:', error);
        res.status(500).json({
            error: error.message || 'Failed to retrieve PayPal order',
        });
    }
}

