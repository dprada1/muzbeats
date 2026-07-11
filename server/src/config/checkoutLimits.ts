/** Max line items in one create-order request */
export const MAX_CART_ITEMS = 20;

export const MIN_ITEM_QUANTITY = 1;
export const MAX_ITEM_QUANTITY = 5;

export const MIN_BEAT_PRICE_USD = 19.99;
export const MAX_BEAT_PRICE_USD = 99.99;

export const MIN_CART_TOTAL_USD = 19.99;
export const MAX_CART_TOTAL_USD = MAX_CART_ITEMS * MAX_BEAT_PRICE_USD; // 20 * 99.99 = 1999.8

/** UUID v4 - fail fast before SQL */
export const BEAT_ID_UUID_REGEX: RegExp =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns true when value is a UUID v4 string (RegExformat only, not DB lookup). */
export function isValidUUIDv4(value: unknown): value is string {
    return typeof value === 'string' && BEAT_ID_UUID_REGEX.test(value);
}
