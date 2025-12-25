import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Check if Stripe is enabled (default to true for backward compatibility)
// Set ENABLE_STRIPE=false in production to disable Stripe payments
export const STRIPE_ENABLED = process.env.ENABLE_STRIPE !== 'false';

if (!process.env.STRIPE_SECRET_KEY) {
    if (STRIPE_ENABLED) {
        console.warn('STRIPE_SECRET_KEY is not set - Stripe payments will not work');
    }
}

// Initialize Stripe with secret key (only if enabled)
export const stripe = STRIPE_ENABLED && process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2025-11-17.clover', // Stripe API version
      })
    : null;

// Export publishable key for client-side use (only if enabled)
export const STRIPE_PUBLISHABLE_KEY = STRIPE_ENABLED 
    ? (process.env.STRIPE_PUBLISHABLE_KEY || '')
    : '';

// Log Stripe status
if (STRIPE_ENABLED) {
    console.log('💳 Stripe payment provider: ENABLED');
} else {
    console.log('💳 Stripe payment provider: DISABLED');
}
