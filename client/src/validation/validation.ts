/**
 * UUIDv4 validation regex
 * Matches standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const BEAT_ID_UUIDv4_REGEX: RegExp =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID format
 * @param id - The string to validate
 * @returns true if valid UUID format, false otherwise
 */
export function isValidUUIDv4(id: string | undefined | null): boolean {
    if (!id || typeof id !== 'string') {
        return false;
    }
    
    // Check length (UUIDs are exactly 36 characters with hyphens)
    if (id.length !== 36) {
        return false;
    }
    
    // Check format
    return BEAT_ID_UUIDv4_REGEX.test(id);
}

/**
 * Validates a beat ID parameter from URL
 * @param beatId - The beat ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidBeatId(beatId: string | undefined | null): boolean {
    return isValidUUIDv4(beatId);
}

/**
 * Validates an order ID parameter from URL
 * Can be either a UUID (our database order ID) or a PayPal order ID
 * PayPal order IDs typically start with specific prefixes and have different formats
 * @param orderId - The order ID to validate
 * @returns true if valid format, false otherwise
 */
export function isValidOrderId(orderId: string | undefined | null): boolean {
    if (!orderId || typeof orderId !== 'string') {
        return false;
    }
    
    // Check length (reasonable limits)
    if (orderId.length < 10 || orderId.length > 255) {
        return false;
    }
    
    // Check if it's a UUID (our database order ID)
    if (isValidUUIDv4(orderId)) {
        return true;
    }
    
    // PayPal order IDs typically start with specific prefixes
    // Common formats: "PAYID-...", "PAY-...", or alphanumeric strings
    // Allow alphanumeric, hyphens, and underscores
    const paypalOrderIdRegex: RegExp = /^[A-Z0-9_-]+$/i;
    if (paypalOrderIdRegex.test(orderId)) {
        return true;
    }
    
    return false;
}

/**
 * Maximum length for search queries
 * Prevents DoS attacks and URL length issues
 */
export const MAX_SEARCH_QUERY_LENGTH = 200;

/**
 * Validates and sanitizes a search query
 * @param query - The search query to validate
 * @returns Object with isValid flag and sanitized query (truncated if too long)
 */
export function validateSearchQuery(query: string | null | undefined): {
    isValid: boolean;
    query: string;
    wasTruncated: boolean;
} {
    if (!query || typeof query !== 'string') {
        return { isValid: false, query: '', wasTruncated: false };
    }

    const trimmed = query.trim();
    
    if (trimmed.length === 0) {
        return { isValid: false, query: '', wasTruncated: false };
    }

    // Check if query exceeds maximum length
    if (trimmed.length > MAX_SEARCH_QUERY_LENGTH) {
        // Truncate to max length (preserve word boundaries if possible)
        const truncated = trimmed.substring(0, MAX_SEARCH_QUERY_LENGTH);
        // Try to truncate at a space to avoid cutting words
        const lastSpace = truncated.lastIndexOf(' ');
        const finalQuery = lastSpace > MAX_SEARCH_QUERY_LENGTH * 0.8 
            ? truncated.substring(0, lastSpace) 
            : truncated;
        
        return { 
            isValid: true, 
            query: finalQuery.trim(), 
            wasTruncated: true 
        };
    }

    return { isValid: true, query: trimmed, wasTruncated: false };
}

/**
 * Truncates text for display in the UI
 * Shows first part of text with ellipsis if it exceeds max length
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation (default: 60)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateForDisplay(text: string, maxLength: number = 60): string {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

/**
 * Validates a Beat object structure
 * @param item - Object to validate
 * @returns true if valid Beat structure, false otherwise
 */
export function isValidBeat(item: unknown): item is import('@/types/Beat').Beat {
    if (!item || typeof item !== 'object') {
        return false;
    }
    
    const beat = item as Record<string, unknown>;
    
    // Check required fields with correct types
    return (
        typeof beat.id === 'string' &&
        isValidBeatId(beat.id) &&
        typeof beat.title === 'string' &&
        beat.title.length > 0 &&
        typeof beat.key === 'string' &&
        beat.key.length > 0 &&
        typeof beat.bpm === 'number' &&
        beat.bpm > 0 &&
        Number.isInteger(beat.bpm) &&
        typeof beat.price === 'number' &&
        beat.price >= 0 &&
        typeof beat.audio === 'string' &&
        beat.audio.length > 0 &&
        typeof beat.cover === 'string' &&
        beat.cover.length > 0
    );
}

/**
 * Validates and sanitizes cart data from localStorage
 * @param data - Raw data from localStorage
 * @returns Validated array of Beat objects, or empty array if invalid
 */
export function validateCartData(data: unknown): import('@/types/Beat').Beat[] {
    // Must be an array
    if (!Array.isArray(data)) {
        if (import.meta.env.DEV) {
            console.warn('Cart data is not an array, clearing cart');
        }
        return [];
    }
    
    // Validate each item and filter out invalid ones
    const validBeats = data.filter((item): item is import('@/types/Beat').Beat => {
        const isValid = isValidBeat(item);
        if (!isValid && import.meta.env.DEV) {
            console.warn('Invalid beat item in cart, removing:', item);
        }
        return isValid;
    });
    
    // If we filtered out items, log in development
    if (validBeats.length < data.length && import.meta.env.DEV) {
        console.warn(`Cart validation: ${data.length - validBeats.length} invalid item(s) removed`);
    }
    
    return validBeats;
}
