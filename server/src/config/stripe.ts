import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
	throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
	apiVersion: '2025-11-17.clover', // Stripe API version
});

// Export publishable key for client-side use
export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
