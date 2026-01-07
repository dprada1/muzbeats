/**
 * UUID validation regex
 * Matches standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID format
 * @param id - The string to validate
 * @returns true if valid UUID format, false otherwise
 */
export function isValidUUID(id: string | undefined | null): boolean {
    if (!id || typeof id !== 'string') {
        return false;
    }
    
    // Check length (UUIDs are exactly 36 characters with hyphens)
    if (id.length !== 36) {
        return false;
    }
    
    // Check format
    return UUID_REGEX.test(id);
}

/**
 * Validates a beat ID parameter from URL
 * @param beatId - The beat ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidBeatId(beatId: string | undefined | null): boolean {
    return isValidUUID(beatId);
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
    if (isValidUUID(orderId)) {
        return true;
    }
    
    // PayPal order IDs typically start with specific prefixes
    // Common formats: "PAYID-...", "PAY-...", or alphanumeric strings
    // Allow alphanumeric, hyphens, and underscores
    const paypalOrderIdRegex = /^[A-Z0-9_-]+$/i;
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
