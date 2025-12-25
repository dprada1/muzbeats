import { Client, Environment, LogLevel } from '@paypal/paypal-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    console.warn('PayPal credentials not set. PayPal payments will not work.');
}

// Use sandbox for test mode, live for production
const environment = process.env.PAYPAL_MODE === 'live' ? Environment.Production : Environment.Sandbox;

// Initialize PayPal client
export const paypalSDK = new Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.PAYPAL_CLIENT_ID || '',
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    },
    timeout: 0,
    environment,
    logging: {
        logLevel: process.env.NODE_ENV === 'development' ? LogLevel.Info : LogLevel.Error,
    },
});

// Export client ID for frontend use
export const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';

// Export mode for determining which credentials to use
export const PAYPAL_MODE = environment;

