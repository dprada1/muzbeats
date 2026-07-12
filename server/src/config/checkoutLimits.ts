/** Minimum line items in one create-order request */
export const MIN_CART_ITEMS = 1;
/** Maximum line items in one create-order request */
export const MAX_CART_ITEMS = 20;

/** Minimum item quantity in one create-order request */
export const MIN_ITEM_QUANTITY = 1;
/** Maximum item quantity in one create-order request */
export const MAX_ITEM_QUANTITY = 5;

/** Minimum price for a beat in one create-order request */
export const MIN_BEAT_PRICE_USD = 19.99;
/** Maximum price for a beat in one create-order request */
export const MAX_BEAT_PRICE_USD = 99.99;

/** Minimum price for a purchase in one create-order request */
export const MIN_CART_TOTAL_USD = MIN_CART_ITEMS * MIN_BEAT_PRICE_USD * MIN_ITEM_QUANTITY; // 1 * 19.99 * 1 = 19.99
/** Maximum price for a purchase in one create-order request */
export const MAX_CART_TOTAL_USD = MAX_CART_ITEMS * MAX_BEAT_PRICE_USD * MAX_ITEM_QUANTITY; // 20 * 99.99 * 5 = 9999

/** UUID v4 - fail fast before SQL */
export const BEAT_ID_UUID_REGEX: RegExp =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns true when value is a UUID v4 string (RegExformat only, not DB lookup). */
export function isValidUUIDv4(value: unknown): value is string {
    return typeof value === 'string' && BEAT_ID_UUID_REGEX.test(value);
}
