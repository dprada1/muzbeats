import { logWarn } from '@/utils/logger.js';
import { Client, Environment, LogLevel } from '@paypal/paypal-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    logWarn('paypal.init', 'PayPal credentials not set — PayPal payments will not work');
}

// Use sandbox for test mode, live for production
const environment = process.env.PAYPAL_MODE === 'live' ? Environment.Production : Environment.Sandbox;

/**
 * PayPal's `logLevel` is the level used to *print* every HTTP request/response,
 * not a minimum-severity filter. Setting Error just changes `info:` → `error:`
 * while still logging successful 200/201 calls. Silence the SDK console noise;
 * our own logger covers create/capture outcomes.
 */
const silentPayPalLogger = {
    log(): void {
        // no-op
    },
};

// Initialize PayPal client
export const paypalSDK = new Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.PAYPAL_CLIENT_ID || '',
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    },
    timeout: 30000,
    environment,
    logging: {
        logger: silentPayPalLogger,
        logLevel: LogLevel.Error,
    },
});

// Export client ID for frontend use
export const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
