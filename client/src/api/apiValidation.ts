/**
 * API Response Validation Schemas
 * 
 * Uses Zod for runtime validation of API responses to ensure:
 * - Type safety at runtime (not just compile-time)
 * - Protection against malformed/malicious responses
 * - Early detection of API contract changes
 * - Better error messages for debugging
 */

import { z } from 'zod';

// Re-export z for convenience
export { z };

/**
 * Beat schema - matches the Beat type
 * Note: id is validated as UUID since we validate beatId as UUID in URLs
 */
// UUID regex pattern for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const BeatSchema = z.object({
    id: z.string().min(1).refine((val) => UUID_REGEX.test(val), {
        message: 'Invalid UUID format',
    }), // Beat IDs are UUIDs from database
    title: z.string().min(1),
    key: z.string().min(1),
    bpm: z.number().int().positive(),
    price: z.number().nonnegative(),
    audio: z.string().min(1), // Can be full URL or relative path
    cover: z.string().min(1), // Can be full URL or relative path
});

/**
 * PayPal config response schema
 */
export const PayPalConfigSchema = z.object({
    paypal: z.object({
        enabled: z.boolean(),
        clientId: z.string().nullable(),
    }),
});

/**
 * PayPal create order response schema
 */
export const PayPalCreateOrderResponseSchema = z.object({
    orderId: z.string().min(1),
    approvalUrl: z.string().optional(),
    amount: z.number().nonnegative().optional(),
    currency: z.string().optional(),
});

/**
 * PayPal capture order response schema
 * Returns our database order ID after successful capture
 */
export const PayPalCaptureOrderResponseSchema = z.object({
    orderId: z.string().min(1), // Our database order ID (UUID)
});

/**
 * Error response schema (for consistent error handling)
 */
export const ErrorResponseSchema = z.object({
    error: z.string(),
});

/**
 * Safely validates a response, returning a result object instead of throwing
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with success flag and data/error
 */
export function safeValidateResponse<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}

/**
 * Type exports for use in components
 */
export type Beat = z.infer<typeof BeatSchema>;
export type PayPalConfig = z.infer<typeof PayPalConfigSchema>;
export type PayPalCreateOrderResponse = z.infer<typeof PayPalCreateOrderResponseSchema>;
export type PayPalCaptureOrderResponse = z.infer<typeof PayPalCaptureOrderResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Validated fetch wrapper
 * Fetches data and validates the response against a schema
 * @param url - URL to fetch
 * @param schema - Zod schema to validate response against
 * @param options - Optional fetch options
 * @returns Validated data
 * @throws Error if fetch fails or validation fails
 */
export async function validatedFetch<T>(
    url: string,
    schema: z.ZodSchema<T>,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(url, options);
    
    if (!response.ok) {
        // Try to extract backend error message
        let backendErrorMessage: string | null = null;
        try {
            const errorData = await response.json();
            const validatedError = ErrorResponseSchema.safeParse(errorData);
            if (validatedError.success) {
                backendErrorMessage = validatedError.data.error;
            }
        } catch {
            // If error response parsing fails, use generic message
        }
        
        // Log technical details in development
        if (import.meta.env.DEV) {
            console.error('API request failed:', { url, status: response.status, statusText: response.statusText, backendError: backendErrorMessage });
        }
        
        // Use backend error message if available, otherwise provide context-aware message
        if (backendErrorMessage) {
            throw new Error(backendErrorMessage);
        }
        
        // Provide user-friendly message based on HTTP status code
        const statusMessages: Record<number, string> = {
            401: 'Authentication required.',
            403: 'Access denied.',
            404: 'Resource not found.',
        };
        
        if (response.status >= 500) {
            throw new Error('Server error. Please try again later.');
        } else if (statusMessages[response.status]) {
            throw new Error(statusMessages[response.status]);
        } else if (response.status >= 400) {
            throw new Error('Request failed. Please check your input and try again.');
        }
        
        throw new Error('Request failed. Please try again.');
    }
    
    const data = await response.json();
    const validationResult = safeValidateResponse(schema, data);
    
    if (!validationResult.success) {
        // Log detailed validation errors in development
        if (import.meta.env.DEV) {
            console.error('API response validation failed:', {
                url,
                errors: validationResult.error.issues,
                receivedData: data,
            });
        }
        throw new Error('Invalid response format from server');
    }
    
    return validationResult.data;
}

