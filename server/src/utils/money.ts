/** USD fractional digits used at checkout (PayPal `value` strings use this precision). */
export const USD_DECIMAL_PLACES = 2;

const USD_CENTS_FACTOR = 10 ** USD_DECIMAL_PLACES;

/**
 * Converts a USD dollar amount to integer cents without float drift.
 *
 * Uses a fixed two-decimal string before scaling so values like `19.99` become
 * exactly `1999` cents, not `1998.999…`.
 *
 * @example usdToCents(19.99) // 1999
 */
export function usdToCents(dollars: number): number {
    if (!Number.isFinite(dollars)) {
        throw new Error(`usdToCents: expected finite number, got ${dollars}`);
    }
    return Math.round(Number(dollars.toFixed(USD_DECIMAL_PLACES)) * USD_CENTS_FACTOR);
}

/**
 * Formats integer cents as a PayPal-compatible USD amount string (`"19.99"`).
 *
 * @example formatUsdFromCents(1999) // "19.99"
 */
export function formatUsdFromCents(cents: number): string {
    if (!Number.isInteger(cents)) {
        throw new Error(`formatUsdFromCents: expected integer cents, got ${cents}`);
    }
    return (cents / USD_CENTS_FACTOR).toFixed(USD_DECIMAL_PLACES);
}

/** Converts integer cents back to a USD number for API responses. */
export function centsToUsd(cents: number): number {
    return cents / USD_CENTS_FACTOR;
}
