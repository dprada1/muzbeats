/** Client-safe message for unexpected checkout failures (500). */
const INTERNAL_CHECKOUT_ERROR_MESSAGE =
    'Unable to process checkout. Please try again later.';

/**
 * Checkout failure with an HTTP status the controller should return.
 * Use 400 for client-fixable requests; 500 for server/integrity/external failures.
 */
export class CheckoutError extends Error {
    constructor(
        message: string,
        readonly statusCode: 400 | 500 = 400
    ) {
        super(message);
        this.name = 'CheckoutError';
    }
}

/** 500 CheckoutError with the standard internal message. Log context separately before throwing. */
export function internalCheckoutError(): CheckoutError {
    return new CheckoutError(INTERNAL_CHECKOUT_ERROR_MESSAGE, 500);
}