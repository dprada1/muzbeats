import { Request, Response } from 'express';
import {
    createPayPalOrder,
    capturePayPalOrder,
    getPayPalOrder,
    getStoredOrderData,
} from '@/services/paypalService.js';
import type { CartItem } from '@/services/paypalService.js';
import { createOrderFromPayPalCapture } from '@/services/orderService.js';
import { sendDownloadEmail } from '@/services/emailService.js';
import pool from '@/config/database.js';

/**
 * POST /api/checkout/paypal/create-order
 * Create a PayPal Order for the cart
 *
 * Request body:
 * {
 *   items: [{ beatId: "uuid", quantity: 1 }]
 * }
 * 
 * Note: Customer email is automatically retrieved from PayPal payer info during capture
 */
export async function createPayPalOrderHandler(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const { items } = req.body;

        // Validate request body
        if (!items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({
                error: 'Items array is required and must not be empty',
            });
            return;
        }

        // Validate each item has beatId
        const invalidItems = items.filter(
            (item: any) => !item.beatId || typeof item.beatId !== 'string'
        );

        if (invalidItems.length > 0) {
            res.status(400).json({
                error: 'Each item must have a valid beatId (string)',
            });
            return;
        }

        const cartItems: CartItem[] = items.map((item: any) => ({
            beatId: item.beatId,
            quantity: item.quantity || 1,
        }));

        // Email is no longer required - PayPal provides it automatically
        const paypalOrder = await createPayPalOrder(cartItems);

        res.status(200).json(paypalOrder);
    } catch (error: any) {
        console.error('Error in createPayPalOrderHandler:', error);
        res.status(500).json({
            error: error.message || 'Failed to create PayPal order',
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
        const storedData = getStoredOrderData(orderId);
        console.log('Retrieved stored order data:', storedData);
        
        // Capture the order
        const capturedOrder = await capturePayPalOrder(orderId);
        
        // Debug: Log what PayPal is actually returning
        console.log('PayPal captured order structure:', JSON.stringify(capturedOrder, null, 2));

        // Check if order already exists (idempotency)
        const existingOrderResult = await pool.query(
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
        const orderResult = await createOrderFromPayPalCapture(capturedOrder as any, storedData);
        console.log('capturePayPalOrderHandler: Order created for PayPal order', orderId);

        // Send download email to customer
        if (orderResult.customerEmail && orderResult.beatIds.length > 0) {
            const emailSent = await sendDownloadEmail(
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

        const paypalOrder = await getPayPalOrder(id);
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

