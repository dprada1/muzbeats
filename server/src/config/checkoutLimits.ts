import { usdToCents } from '@/utils/money.js';

/** Minimum line items in one create-order request */
export const MIN_CART_ITEMS = 1;
/** Maximum line items in one create-order request */
export const MAX_CART_ITEMS = 20;

/** Minimum item quantity in one create-order request */
export const MIN_ITEM_QUANTITY = 1;
/** Maximum item quantity in one create-order request */
export const MAX_ITEM_QUANTITY = 5;

/** Currency used at checkout. Only USD is supported today. */
export const CHECKOUT_CURRENCY = 'USD';

/** Minimum price for a beat in one create-order request (USD dollars) */
export const MIN_BEAT_PRICE_USD = 19.99;
/** Maximum price for a beat in one create-order request (USD dollars) */
export const MAX_BEAT_PRICE_USD = 99.99;

/** Minimum price for a purchase in one create-order request (USD dollars) */
export const MIN_CART_TOTAL_USD = MIN_CART_ITEMS * MIN_BEAT_PRICE_USD * MIN_ITEM_QUANTITY; // 1 * 19.99 * 1 = 19.99
/** Maximum price for a purchase in one create-order request (USD dollars) */
export const MAX_CART_TOTAL_USD = MAX_CART_ITEMS * MAX_BEAT_PRICE_USD * MAX_ITEM_QUANTITY; // 20 * 99.99 * 5 = 9999

/** Beat price bounds in integer cents (derived from USD constants). */
export const MIN_BEAT_PRICE_CENTS = usdToCents(MIN_BEAT_PRICE_USD);
export const MAX_BEAT_PRICE_CENTS = usdToCents(MAX_BEAT_PRICE_USD);

/** Cart total bounds in integer cents (derived from USD constants). */
export const MIN_CART_TOTAL_CENTS = usdToCents(MIN_CART_TOTAL_USD);
export const MAX_CART_TOTAL_CENTS = usdToCents(MAX_CART_TOTAL_USD);

/** UUID v4 - fail fast before SQL */
export const BEAT_ID_UUID_REGEX: RegExp =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns true when value is a UUID v4 string (regex format only, not DB lookup). */
export function isValidUUIDv4(value: unknown): value is string {
    return typeof value === 'string' && BEAT_ID_UUID_REGEX.test(value);
}

function assertPositive(name: string, value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid checkout config: ${name} must be a finite number > 0 (got ${value})`);
    }
}

function assertPositiveInteger(name: string, value: number): void {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`Invalid checkout config: ${name} must be a positive integer (got ${value})`);
    }
}

function assertMinMax(minName: string, min: number, maxName: string, max: number): void {
    if (max < min) {
        throw new Error(
            `Invalid checkout config: ${maxName} (${max}) must be >= ${minName} (${min})`
        );
    }
}

/** Fail fast at startup if checkout bounds are misconfigured */
export function assertCheckoutLimitsValid(): void {
    if (CHECKOUT_CURRENCY !== 'USD') {
        throw new Error(
            `Invalid checkout config: CHECKOUT_CURRENCY must be 'USD' (got '${CHECKOUT_CURRENCY}')`
        );
    }

    assertPositive('MIN_CART_ITEMS', MIN_CART_ITEMS);
    assertPositive('MIN_ITEM_QUANTITY', MIN_ITEM_QUANTITY);
    assertPositive('MIN_BEAT_PRICE_USD', MIN_BEAT_PRICE_USD);
    assertPositive('MIN_CART_TOTAL_USD', MIN_CART_TOTAL_USD);

    assertMinMax('MIN_CART_ITEMS', MIN_CART_ITEMS, 'MAX_CART_ITEMS', MAX_CART_ITEMS);
    assertMinMax('MIN_ITEM_QUANTITY', MIN_ITEM_QUANTITY, 'MAX_ITEM_QUANTITY', MAX_ITEM_QUANTITY);
    assertMinMax('MIN_BEAT_PRICE_USD', MIN_BEAT_PRICE_USD, 'MAX_BEAT_PRICE_USD', MAX_BEAT_PRICE_USD);
    assertMinMax('MIN_CART_TOTAL_USD', MIN_CART_TOTAL_USD, 'MAX_CART_TOTAL_USD', MAX_CART_TOTAL_USD);

    assertPositiveInteger('MIN_BEAT_PRICE_CENTS', MIN_BEAT_PRICE_CENTS);
    assertPositiveInteger('MAX_BEAT_PRICE_CENTS', MAX_BEAT_PRICE_CENTS);
    assertMinMax('MIN_BEAT_PRICE_CENTS', MIN_BEAT_PRICE_CENTS, 'MAX_BEAT_PRICE_CENTS', MAX_BEAT_PRICE_CENTS);
    assertPositiveInteger('MIN_CART_TOTAL_CENTS', MIN_CART_TOTAL_CENTS);
    assertPositiveInteger('MAX_CART_TOTAL_CENTS', MAX_CART_TOTAL_CENTS);
    assertMinMax('MIN_CART_TOTAL_CENTS', MIN_CART_TOTAL_CENTS, 'MAX_CART_TOTAL_CENTS', MAX_CART_TOTAL_CENTS);
}
