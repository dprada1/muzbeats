/**
 * Error Message Sanitization
 * 
 * Prevents information disclosure by sanitizing error messages before
 * displaying them to users. Technical details are logged but not shown.
 */

/**
 * Sanitizes error messages for user display
 * Removes technical details, stack traces, and sensitive information
 * @param error - Error object or error message string
 * @param context - Context where the error occurred (for logging)
 * @returns User-friendly error message
 */
export function sanitizeErrorMessage(
    error: unknown,
    context: string = 'application'
): string {
    // Extract message from error object
    let errorMessage = '';
    
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        errorMessage = String(error);
    }

    // Log full error details in development (for debugging)
    if (import.meta.env.DEV) {
        console.error(`[${context}] Error details:`, error);
    }

    // Sanitize technical details that could leak sensitive information
    const sanitized = errorMessage
        // Remove stack traces (reveal file structure and code paths)
        .replace(/at\s+.*/g, '')
        // Remove absolute file paths (reveal server structure)
        .replace(/\/[^\s]+\.[a-z]+:\d+:\d+/g, '')
        // Remove Windows paths (C:\Users\..., D:\path\...)
        .replace(/[A-Z]:\\[^\s]+/gi, '')
        // Remove file:// URLs
        .replace(/file:\/\/[^\s]*/g, '')
        // Remove internal URLs with paths (but keep simple domain references)
        .replace(/https?:\/\/[^\s]+\/[^\s]+/g, '')
        // Remove technical error type prefixes (not useful to users)
        .replace(/^(Error|TypeError|ReferenceError|SyntaxError|RangeError):\s*/i, '')
        // Remove database error codes and technical brackets
        .replace(/\[SQL.*?\]/gi, '')
        .replace(/\[.*?Error.*?\]/gi, '')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
        .trim();

    // If sanitization removed everything, use generic message
    if (!sanitized || sanitized.length < 3) {
        return getGenericErrorMessage(context);
    }

    // Check if message contains sensitive patterns that could leak information
    // Focus on actual security risks: credentials, database details, stack traces
    const sensitivePatterns = [
        /password/i,
        /token/i,
        /secret/i,
        /api[_-]?key/i,
        /database/i,
        /sql\s+(select|insert|update|delete|drop|create)/i,
        /stack\s+trace/i,
        /file:\/\/|\.js:\d+:\d+/i, // File paths in errors
    ];

    const containsSensitive = sensitivePatterns.some(pattern => 
        sanitized.match(pattern)
    );

    if (containsSensitive) {
        return getGenericErrorMessage(context);
    }

    return sanitized;
}

/**
 * Returns a generic, user-friendly error message based on context
 * @param context - Context where the error occurred
 * @returns Generic error message
 */
function getGenericErrorMessage(context: string): string {
    const contextLower = context.toLowerCase();
    
    if (contextLower.includes('payment') || contextLower.includes('checkout') || contextLower.includes('paypal')) {
        return 'Payment processing failed. Please try again or contact support if the issue persists.';
    }
    
    if (contextLower.includes('fetch') || contextLower.includes('api') || contextLower.includes('server')) {
        return 'Unable to connect to the server. Please check your connection and try again.';
    }
    
    if (contextLower.includes('validation') || contextLower.includes('format')) {
        return 'Invalid data format. Please refresh the page and try again.';
    }
    
    // Generic fallback
    return 'An error occurred. Please try again or contact support if the issue persists.';
}

/**
 * Determines if an error is a network/connectivity error
 * @param error - Error to check
 * @returns true if it's a network error
 */
export function isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes('network') ||
            message.includes('fetch') ||
            message.includes('connection') ||
            message.includes('failed to fetch') ||
            message.includes('networkerror') ||
            message.includes('timeout')
        );
    }
    return false;
}

/**
 * Determines if an error is a server error (5xx)
 * @param error - Error to check
 * @returns true if it's a server error
 */
export function isServerError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message;
        // Check for 5xx status codes
        return /5\d{2}/.test(message);
    }
    return false;
}

