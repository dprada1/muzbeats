import { Request, Response } from 'express';
import { createPaymentIntent, getPaymentIntent } from '@/services/checkoutService.js';
import type { CartItem } from '@/services/checkoutService.js';

/**
 * POST /api/checkout/create-payment-intent
 * Create a Stripe Payment Intent for the cart
 * 
 * Request body:
 * {
 *   items: [{ beatId: "uuid", quantity: 1 }],
 *   customerEmail?: "email@example.com"
 * }
 */
export async function createPaymentIntentHandler(
	req: Request,
	res: Response
): Promise<void> {
	try {
		const { items, customerEmail } = req.body;

		// Validate request body
		if (!items || !Array.isArray(items) || items.length === 0) {
			res.status(400).json({ 
				error: 'Items array is required and must not be empty' 
			});
			return;
		}

		// Validate each item has beatId
		const invalidItems = items.filter(
			(item: any) => !item.beatId || typeof item.beatId !== 'string'
		);

		if (invalidItems.length > 0) {
			res.status(400).json({ 
				error: 'Each item must have a valid beatId (string)' 
			});
			return;
		}

		// Validate email format if provided
		if (customerEmail && typeof customerEmail === 'string') {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(customerEmail)) {
				res.status(400).json({ 
					error: 'Invalid email format' 
				});
				return;
			}
		}

		const cartItems: CartItem[] = items.map((item: any) => ({
			beatId: item.beatId,
			quantity: item.quantity || 1,
		}));

		const paymentIntent = await createPaymentIntent(
			cartItems,
			customerEmail
		);

		res.status(200).json(paymentIntent);
	} catch (error: any) {
		console.error('Error in createPaymentIntentHandler:', error);
		res.status(500).json({ 
			error: error.message || 'Failed to create payment intent' 
		});
	}
}

/**
 * GET /api/checkout/payment-intent/:id
 * Get payment intent status
 */
export async function getPaymentIntentHandler(
	req: Request,
	res: Response
): Promise<void> {
	try {
		const { id } = req.params;

		if (!id) {
			res.status(400).json({ error: 'Payment intent ID is required' });
			return;
		}

		const paymentIntent = await getPaymentIntent(id);
		res.status(200).json({
			id: paymentIntent.id,
			status: paymentIntent.status,
			amount: paymentIntent.amount,
			currency: paymentIntent.currency,
			metadata: paymentIntent.metadata,
		});
	} catch (error: any) {
		console.error('Error in getPaymentIntentHandler:', error);
		res.status(500).json({ 
			error: error.message || 'Failed to retrieve payment intent' 
		});
	}
}
