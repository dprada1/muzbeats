import {
    logInfo,
    logWarn
} from '@/utils/logger.js';
import {
    getAppEnv,
    getEnv,
    type AppEnv
} from '@/config/env.js';
import {
    Client,
    Environment,
    LogLevel
} from '@paypal/paypal-server-sdk';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export type PayPalMode = 'live' | 'sandbox';

/**
 * Resolve PayPal API mode from `PAYPAL_MODE`.
 * Throws if unset or anything other than `live` / `sandbox` (no silent default).
 */
export function getPayPalMode(): PayPalMode {
    const raw = getEnv('PAYPAL_MODE')?.toLowerCase();
    if (raw === 'live' || raw === 'sandbox') {
        return raw;
    }
    throw new Error(
        "PAYPAL_MODE is neither: 'live' nor 'sandbox'. Refusing to continue..."
    );
}

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

let paypalSDKInstance: Client | undefined;

function createPayPalSDK(): Client {
    const paypalMode = getPayPalMode();
    const environment =
        paypalMode === 'live' ? Environment.Production : Environment.Sandbox;

    return new Client({
        clientCredentialsAuthCredentials: {
            oAuthClientId: getEnv('PAYPAL_CLIENT_ID') || '',
            oAuthClientSecret: getEnv('PAYPAL_CLIENT_SECRET') || '',
        },
        timeout: 30000,
        environment,
        logging: {
            logger: silentPayPalLogger,
            logLevel: LogLevel.Error,
        },
    });
}

/** PayPal SDK client. Created on first use so boot can assert `PAYPAL_MODE` before import-time construction. */
export function getPayPalSDK(): Client {
    if (!paypalSDKInstance) {
        paypalSDKInstance = createPayPalSDK();
    }
    return paypalSDKInstance;
}

// Export client ID for frontend use
export const PAYPAL_CLIENT_ID = getEnv('PAYPAL_CLIENT_ID') || '';

/**
 * Assert `PAYPAL_MODE` is `live` or `sandbox`, then log the NODE_ENV × mode pairing
 * so misconfigured money movement is obvious before we listen.
 */
export function assertPayPalModeAtBoot(): void {
    const nodeEnv: AppEnv = getAppEnv();
    const paypalMode: PayPalMode = getPayPalMode();
    const isDeployed: boolean = nodeEnv === 'production' || nodeEnv === 'staging';

    const meta = {
        NODE_ENV: nodeEnv,
        PAYPAL_MODE: paypalMode,
        message: '',
    };

    if (isDeployed && paypalMode === 'live') {
        meta.message = 'deployed-like environment with REAL PayPal charges';
        logWarn('paypal.mode', 'PayPal mode', meta);
        return;
    }

    if (isDeployed && paypalMode === 'sandbox') {
        meta.message = 'deployed-like environment, but payments are NOT real (sandbox)';
        logWarn('paypal.mode', 'PayPal mode', meta);
        return;
    }

    if (nodeEnv === 'development' && paypalMode === 'live') {
        meta.message = 'local/dev process with REAL PayPal charges (easy to mistake-test)';
        logWarn('paypal.mode', 'PayPal mode', meta);
        return;
    }

    meta.message = 'local/dev; payments are NOT real. Safe to keep coding and testing.';
    logInfo('paypal.mode', 'PayPal mode', meta);
}
