import { logWarn, logInfo } from '@/utils/logger';
import dotenv from 'dotenv';

dotenv.config();

type AppEnv = 'production' | 'staging' | 'development';

/** Normalize NODE_ENV into a known environment (defaults to development). */
function getAppEnv(): AppEnv {
    const raw = process.env.NODE_ENV?.trim().toLowerCase();
    if (raw === 'production' || raw === 'staging' || raw === 'development') {
        return raw;
    }
    throw new Error('NODE_ENV is neither: \'production\', \'staging\', nor \'development\'. Refusing to continue...');
}

/** True when the env var is present and not just whitespace. */
function isSet(name: string): boolean {
    const value = process.env[name];
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Variables that must exist for a deployed (production/staging) server to function.
 * Missing any of these means checkout, downloads, or emails would silently break,
 * so we refuse to boot instead.
 */
const REQUIRED_ENV_VARS_WHEN_DEPLOYED: readonly string[] = [
    'DATABASE_URL',
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'BACKEND_URL',
    'EMAIL_LOGO_URL',
    'FRONTEND_URL',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'R2_PUBLIC_URL',
    'R2_PRIVATE_BUCKET_NAME',
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
];

/**
 * Variables that are strongly recommended in local development. Their absence only
 * degrades a feature (e.g. no email, no real payments), so we warn rather than exit.
 */
const RECOMMENDED_ENV_VARS_IN_DEV: readonly string[] = [
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'R2_PRIVATE_BUCKET_NAME',
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
];

/**
 * Validate environment variables at startup, failing fast for deployed environments.
 *
 * - production/staging: throws (caller should exit) if any required variable is missing,
 *   or if BACKEND_URL uses http:// in production.
 * - development: logs warnings only, so local boot is never blocked by optional config.
 *
 * Relies on {@link getAppEnv}, which throws unless NODE_ENV is exactly production, staging,
 * or development — so an unset/typo'd NODE_ENV fails fast rather than silently degrading.
 *
 * @throws If NODE_ENV is invalid, or a deployed environment is missing required variables
 */
export function assertRequiredEnv(): void {
    const currentEnv: AppEnv = getAppEnv();
    const isDeployed = currentEnv === 'production' || currentEnv === 'staging';

    if (isDeployed) {
        const missingEnvVarsInProd = REQUIRED_ENV_VARS_WHEN_DEPLOYED.filter((name) => !isSet(name));
        if (missingEnvVarsInProd.length > 0) {
            throw new Error(
                `config/env: Missing required environment variables for NODE_ENV=${currentEnv}: ${missingEnvVarsInProd.join(', ')}`
            );
        }

        if (currentEnv === 'production' && process.env.BACKEND_URL?.trim().startsWith('http://')) {
            throw new Error(
                'config/env: BACKEND_URL uses http:// in production. Prefer https:// for email download links.'
            );
        }
    } else {
        const missingEnvVarsInDev = RECOMMENDED_ENV_VARS_IN_DEV.filter((name) => !isSet(name));
        if (missingEnvVarsInDev.length > 0) {
            logWarn(
                'env.assertRequiredEnv',
                'Missing recommended env vars (some features may be degraded)',
                { nodeEnv: currentEnv, missing: missingEnvVarsInDev }
            );
        }

        // Download email links need a public base URL to be clickable end-to-end.
        if (!isSet('EMAIL_LINK_BASE_URL') && !isSet('BACKEND_URL')) {
            logWarn(
                'env.assertRequiredEnv',
                'Neither EMAIL_LINK_BASE_URL nor BACKEND_URL is set — download email links will fail (set a tunnel URL for local email testing)'
            );
        }
    }

    logInfo(
        'env.assertRequiredEnv',
        'Environment variables validated',
        {
            nodeEnv: currentEnv,
        }
    );
}
