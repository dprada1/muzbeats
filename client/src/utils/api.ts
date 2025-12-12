/**
 * Get the base API URL
 * In development, uses relative paths (proxied by Vite)
 * In production, uses VITE_API_URL environment variable or falls back to relative
 */
export function getApiUrl(): string {
    // In production, use VITE_API_URL if set
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    
    // In development, use relative paths (Vite proxy handles it)
    // In production without VITE_API_URL, also use relative (might work if same domain)
    return '';
}

/**
 * Build a full API URL from a path
 * @param path - API path (e.g., '/api/beats' or 'api/beats')
 * @returns Full URL to the API endpoint
 */
export function apiUrl(path: string): string {
    const baseUrl = getApiUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    if (baseUrl) {
        // Remove trailing slash from baseUrl if present
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return `${cleanBase}${cleanPath}`;
    }
    
    // No base URL, use relative path
    return cleanPath;
}

