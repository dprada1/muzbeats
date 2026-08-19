import { logWarn, logInfo } from '@/utils/logger.js';
import dotenv from 'dotenv';
import util from 'util';

dotenv.config({ quiet: true });

export type AppEnv = 'production' | 'staging' | 'development';

/** Normalize NODE_ENV into a known environment. Throws if unset or invalid (no silent default). */
export function getAppEnv(): AppEnv {
    const raw: string | undefined = getEnv('NODE_ENV')?.toLowerCase();
    if (raw === 'production' || raw === 'staging' || raw === 'development') {
        return raw;
    }
    throw new Error(
        "NODE_ENV is neither: 'production', 'staging', nor 'development'. Refusing to continue..."
    );
}

/** Trimmed env value, or `undefined` if missing or whitespace-only. */
export function getEnv(name: string): string | undefined {
    const value = process.env[name];
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

/** True when the env var is present and not just whitespace. */
export function isSet(name: string): boolean {
    return getEnv(name) !== undefined;
}

/**
 * Log placeholder, not a string env value.
 * `util.inspect.custom` prints unquoted so it cannot look like `'redacted'`.
 */
export class EnvLogMarker {
    constructor(private readonly label: string) {}

    [util.inspect.custom](
        _depth: number,
        options: util.InspectOptionsStylized
    ): string {
        return options.stylize(this.label, 'special');
    }
}

export const ENV_LOG_UNSET: EnvLogMarker = new EnvLogMarker('(unset)');
export const ENV_LOG_DEFAULT: EnvLogMarker = new EnvLogMarker('(default)');
const ENV_LOG_REDACTED: EnvLogMarker = new EnvLogMarker('(redacted)');
const SECRET_ENV_VAR_NAMES: ReadonlySet<string> = new Set([
    'DATABASE_URL',
    'DB_PASSWORD',
    'PAYPAL_CLIENT_SECRET',
    'RESEND_API_KEY',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
]);

/**
 * Every env var we care about at boot. Secrets log as `(redacted)` / `(unset)`;
 * others log their value, or `(unset)` if missing.
 * Order is the boot story: identity, bind, database, payments, public URLs, email, R2.
 */
const BOOT_ENV_VAR_NAMES: ReadonlySet<string> = new Set([
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'DB_SSL',
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'PAYPAL_MODE',
    'BACKEND_URL',
    'FRONTEND_URL',
    'EMAIL_LOGO_URL',
    'EMAIL_LINK_BASE_URL',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'R2_PUBLIC_URL',
    'R2_PUBLIC_BUCKET_NAME',
    'R2_PRIVATE_BUCKET_NAME',
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'CATALOG_AUDIT_SKIP',
    'CORS_ALLOWED_ORIGINS',
]);

/**
 * Variables that must exist for a deployed (production/staging) server to function.
 * Includes `DATABASE_URL` (Railway). Local development may leave `DATABASE_URL` unset
 * and use `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` instead.
 * Missing any of these in staging/production means checkout, downloads, or emails
 * would silently break, so we refuse to boot instead.
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
    'R2_PUBLIC_BUCKET_NAME',
    'R2_PRIVATE_BUCKET_NAME',
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'CATALOG_AUDIT_SKIP',
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
    'R2_PUBLIC_BUCKET_NAME',
    'R2_PRIVATE_BUCKET_NAME',
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'CATALOG_AUDIT_SKIP',
];

/**
 * Bind port from `PORT`. No default — unset or non-integer values throw.
 *
 * @throws If `PORT` is missing or not an integer in 1–65535
 */
export function parseListenPort(): number {
    const raw = getEnv('PORT');
    if (!raw) {
        throw new Error('config/env: PORT is not set. Set PORT in the environment (no default).');
    }
    if (!/^\d+$/.test(raw)) {
        throw new Error(`config/env: PORT must be an integer 1–65535 (got ${JSON.stringify(raw)})`);
    }
    const port = Number(raw);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`config/env: PORT must be an integer 1–65535 (got ${JSON.stringify(raw)})`);
    }
    return port;
}

function logEnvVarStatus(): void {
    const envVarLog: Record<string, string | EnvLogMarker> = {};
    for (const envVarName of BOOT_ENV_VAR_NAMES) {
        if (!isSet(envVarName)) {
            envVarLog[envVarName] = ENV_LOG_UNSET;
            continue;
        }
        if (SECRET_ENV_VAR_NAMES.has(envVarName)) {
            envVarLog[envVarName] = ENV_LOG_REDACTED;
            continue;
        }
        envVarLog[envVarName] = getEnv(envVarName)!;
    }
    logInfo('env.assertRequiredEnvAtBoot', 'Environment variables', envVarLog);
}

/**
 * Validate environment variables at boot, failing fast for deployed environments.
 *
 * Always prints a checklist first: non-secret vars show their value; secrets show
 * `(redacted)` or `(unset)` so those words cannot be mistaken for the real value.
 * Then:
 * - all envs: `PORT` must be set to an integer 1–65535 (no default)
 * - production/staging: throws if any required variable is missing (including
 *   `DATABASE_URL`), or BACKEND_URL is http://
 * - development: `DATABASE_URL` may be unset (local `DB_*`); warns on recommended gaps
 *
 * @throws If NODE_ENV is invalid, PORT is missing/invalid, or a deployed environment
 *         is missing required variables
 */
export function assertRequiredEnvAtBoot(): void {
    logEnvVarStatus();

    const currentEnv: AppEnv = getAppEnv();
    parseListenPort();

    const isDeployed = currentEnv === 'production' || currentEnv === 'staging';

    if (isDeployed) {
        const missingRequiredEnvVarsWhenDeployed: string[] = REQUIRED_ENV_VARS_WHEN_DEPLOYED.filter((name) => !isSet(name));
        if (missingRequiredEnvVarsWhenDeployed.length > 0) {
            throw new Error(
                `config/env: Missing required environment variables for NODE_ENV=${currentEnv}: ${missingRequiredEnvVarsWhenDeployed.join(', ')}`
            );
        }

        if (getEnv('BACKEND_URL')?.startsWith('http://')) {
            throw new Error(
                `config/env: BACKEND_URL uses http:// in ${currentEnv}. Use https:// for email download links (staging and production must match).`
            );
        }
        return;
    }

    const missingRecommendedEnvVarsInDev: string[] = RECOMMENDED_ENV_VARS_IN_DEV.filter((name) => !isSet(name));
    if (missingRecommendedEnvVarsInDev.length > 0) {
        logWarn(
            'env.assertRequiredEnvAtBoot',
            'Missing recommended env vars (some features may be degraded)',
            { nodeEnv: currentEnv, missing: missingRecommendedEnvVarsInDev }
        );
    }

    if (!isSet('EMAIL_LINK_BASE_URL') && !isSet('BACKEND_URL')) {
        logWarn(
            'env.assertRequiredEnvAtBoot',
            'Neither EMAIL_LINK_BASE_URL nor BACKEND_URL is set — download email links will fail (set a tunnel URL for local email testing)'
        );
    }
}
