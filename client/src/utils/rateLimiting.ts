/**
 * Rate Limiting Utilities
 * 
 * Provides request deduplication to prevent excessive API calls
 * and improve performance.
 */

/**
 * Request deduplication - prevents duplicate requests with the same key
 * @param key - Unique key for the request (e.g., URL)
 * @param requestFn - Function that returns a Promise
 * @returns Promise that resolves/rejects with the request result
 */
const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>
): Promise<T> {
    // If a request with this key is already pending, return that promise
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key)!;
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
