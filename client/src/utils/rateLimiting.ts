/**
 * Rate Limiting Utilities
 * 
 * Provides request deduplication to prevent excessive API calls
 * and improve performance.
 */

/**
 * Request deduplication - prevents duplicate requests with the same key
 * Handles React Strict Mode by checking if the promise is still valid
 * @param key - Unique key for the request (e.g., URL)
 * @param requestFn - Function that returns a Promise
 * @returns Promise that resolves/rejects with the request result
 */
const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>
): Promise<T> {
    // Check if a request with this key is already pending
    const existingRequest = pendingRequests.get(key);
    
    if (existingRequest) {
        // Check if the promise is still pending (not resolved/rejected)
        // We can't directly check promise state, but we can catch errors
        // If it's already resolved/rejected, the catch will handle it
        try {
            // Try to await the existing promise
            // If it's aborted, it will throw and we'll create a new one
            return await existingRequest;
        } catch (error: any) {
            // If the request was aborted or failed, remove it and create a new one
            if (error.name === 'AbortError' || error.message?.includes('aborted') || error.message?.includes('cancelled')) {
                pendingRequests.delete(key);
                // Fall through to create a new request
            } else {
                // Re-throw non-abort errors
                throw error;
            }
        }
    }

    // Create new request and store it
    const request = requestFn()
        .finally(() => {
            // Remove from pending requests when done (success or failure)
            pendingRequests.delete(key);
        });

    pendingRequests.set(key, request);
    return request;
}
