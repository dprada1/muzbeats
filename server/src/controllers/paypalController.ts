import { Request, Response } from 'express';
import {
    createPayPalOrder,
    capturePayPalOrder,
    getPayPalOrder,
    getStoredOrderBeatIds,
} from '@/services/paypalService.js';
import type {
    CartLine,
    PayPalOrderCreateResult,
    PayPalOrderSummary,
    StoredOrderBeatIds,
} from '@/services/paypalService.js';
import { getRouteParam } from '@/utils/routeParams.js';
import {
    createOrderFromPayPalCapture,
    type OrderCaptureResult,
    type PayPalOrderCapture,
} from '@/services/orderService.js';
import { sendDownloadEmail } from '@/services/emailService.js';
import pool from '@/config/database.js';
import { QueryResult } from 'pg';
import {
    MIN_CART_ITEMS,
    MAX_CART_ITEMS,
    MIN_ITEM_QUANTITY,
    MAX_ITEM_QUANTITY,
    areValidBeatIds,
} from '@/config/checkoutLimits.js';
import { CheckoutError, internalCheckoutError } from '@/utils/checkoutErrors.js';
import { logError, logInfo, logWarn } from '@/utils/logger.js';


/**
 * Parse cart line quantity from the request body (strict: quantity is required).
 * @returns Parsed quantity, or `null` if missing/invalid (reject with 400).
 */
function parseCartQuantity(raw: unknown): number | null {
    if (typeof raw !== 'number' || !Number.isInteger(raw)) return null;
    if (raw < MIN_ITEM_QUANTITY || raw > MAX_ITEM_QUANTITY) return null;
    return raw;
}

/** Extract beatId values from create-order body for abuse / audit logging */
function beatIdsFromCreateOrderBody(body: unknown): unknown[] {
    if (!body || typeof body !== 'object' || !('items' in body)) {
        return [];
    }
    const items = (body as { items?: unknown }).items;
    if (!Array.isArray(items)) {
        return [];
    }
    return items.map((line) => {
        if (!line || typeof line !== 'object' || !('beatId' in line)) {
            return undefined;
        }
        return (line as { beatId?: unknown }).beatId;
    });
}

/**
 * POST /api/checkout/paypal/create-order
 * Create a PayPal Order for the cart
 *
 * Request body:
 * {
 *   items: [{ beatId: "uuid", quantity: 1 }]  // destructured as rawCartLines in handler
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

        if (rawCartLines.length < MIN_CART_ITEMS) {
            res.status(400).json({
                error: `Cart needs a minimum of ${MIN_CART_ITEMS} item(s)`,
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
            logWarn(
                'paypalController.createPayPalOrderHandler',
                'Rejected create-order request: invalid beatId format',
                { ip: req.ip, beatIds }
            );
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
    } catch (error: unknown) {
        const auditBeatIds: unknown[] = beatIdsFromCreateOrderBody(req.body);

        if (error instanceof CheckoutError) {
            const logContext = { ip: req.ip, beatIds: auditBeatIds };

            if (error.statusCode >= 500) {
                logError(
                    'paypalController.createPayPalOrderHandler',
                    'Failed to create PayPal order',
                    { ...logContext, error }
                );
            } else {
                logWarn(
                    'paypalController.createPayPalOrderHandler',
                    error.message,
                    logContext
                );
            }

            res.status(error.statusCode).json({ error: error.message });
            return;
        }

        logError(
            'paypalController.createPayPalOrderHandler',
            'Failed to create PayPal order',
            {
                ip: req.ip,
                beatIds: auditBeatIds,
                error,
            }
        );
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
        const storedBeatIds: StoredOrderBeatIds | null = getStoredOrderBeatIds(orderId);
        logInfo(
            'paypalController.capturePayPalOrderHandler',
            'Retrieved stored order data',
            {
                paypalOrderId: orderId,
                storedBeatIds,
            }
        );
        
        // Capture the order (here is exactly where the money is transferred)
        const capturedOrder: unknown = await capturePayPalOrder(orderId);
        
        const capturedStatus =
            typeof capturedOrder === 'object' &&
            capturedOrder !== null &&
            'status' in capturedOrder
                ? (capturedOrder as { status?: unknown }).status
                : undefined;
        logInfo(
            'paypalController.capturePayPalOrderHandler',
            'PayPal order captured',
            {
                paypalOrderId: orderId,
                status: capturedStatus,
            }
        );

        // Check if order already exists (idempotency)
        const existingOrderResult: QueryResult<any> = await pool.query(
            'SELECT id, download_email_sent_at FROM orders WHERE paypal_order_id = $1',
            [orderId]
        );

        if (existingOrderResult.rows.length > 0) {
            // Order already exists, return success
            const firstRow = existingOrderResult.rows[0];
            res.status(200).json({
                emailSent: firstRow.download_email_sent_at != null,
                message: 'Order already processed',
                orderId: firstRow.id,
                paypalOrderId: orderId,
            });
            return;
        }

        // Create order from captured PayPal order, using stored data for beat IDs
        const orderResult: OrderCaptureResult = await createOrderFromPayPalCapture(
            capturedOrder as PayPalOrderCapture,
            storedBeatIds
        );
        logInfo(
            'paypalController.capturePayPalOrderHandler',
            'Order created',
            {
                paypalOrderId: orderId,
                orderId: orderResult.orderId,
            }
        );

        // Send download email to customer
        if (!orderResult.customerEmail) {
            logError(
                'paypalController.capturePayPalOrderHandler',
                'Customer email missing',
                {
                    orderId: orderResult.orderId,
                    paypalOrderId: orderId,
                }
            );
            throw internalCheckoutError();
        }

        if (orderResult.beatIds.length === 0) {
            logError(
                'paypalController.capturePayPalOrderHandler',
                'Beat IDs cannot be empty',
                {
                    orderId: orderResult.orderId,
                    paypalOrderId: orderId,
                }
            );
            throw internalCheckoutError();
        }

        const emailSent: boolean = await sendDownloadEmail(
            orderResult.customerEmail,
            orderResult.orderId,
            orderResult.totalAmount
        );

        if (emailSent) {
            logInfo(
                'paypalController.capturePayPalOrderHandler',
                'Download email sent successfully',
                {
                    orderId: orderResult.orderId,
                }
            );
        } else {
            logWarn(
                'paypalController.capturePayPalOrderHandler',
                'Download email was not sent',
                {
                    orderId: orderResult.orderId,
                }
            );
        }

        res.status(200).json({
            emailSent: emailSent,
            message: emailSent
                ? 'Payment processed successfully'
                : 'Payment processed. Download email could not be sent — contact support with your order ID.',
            orderId: orderResult.orderId,
            customerEmail: orderResult.customerEmail,
            totalAmount: orderResult.totalAmount,
            paypalOrderId: orderId,
        });
    } catch (error: unknown) {
        logError('paypalController.capturePayPalOrderHandler', 'Failed to capture PayPal order', error);
        if (error instanceof CheckoutError) {
            res.status(error.statusCode).json({ error: error.message });
            return;
        }
        res.status(500).json({
            error: 'Failed to capture PayPal order',
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
        const id = getRouteParam(req.params.id);

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
    } catch (error: unknown) {
        logError('paypalController.getPayPalOrderHandler', 'Failed to retrieve PayPal order', error);
        res.status(500).json({
            error: 'Failed to retrieve PayPal order',
        });
    }
}

