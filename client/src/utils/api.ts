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

/**
 * Get the base URL for static assets (images, audio files)
 * Assets are served from the backend, so we use the same base URL as the API
 * @returns Base URL for assets
 */
export function getAssetUrl(): string {
    return getApiUrl();
}

/**
 * Build a full asset URL from a path
 * @param path - Asset path (e.g., '/assets/images/skimask.png' or 'assets/beats/mp3/beat.mp3')
 * @returns Full URL to the asset
 */
export function assetUrl(path: string): string {
    const baseUrl = getAssetUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    if (baseUrl) {
        // Remove trailing slash from baseUrl if present
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return `${cleanBase}${cleanPath}`;
    }
    
    // No base URL, use relative path
    return cleanPath;
}

/**
 * Transform a beat object to use full asset URLs for audio and cover
 * @param beat - Beat object with relative asset paths
 * @returns Beat object with full asset URLs
 */
export function transformBeatAssets<T extends { audio: string; cover: string }>(beat: T): T {
    return {
        ...beat,
        audio: assetUrl(beat.audio),
        cover: assetUrl(beat.cover),
    };
}

/**
 * Transform an array of beat objects to use full asset URLs
 * @param beats - Array of beat objects with relative asset paths
 * @returns Array of beat objects with full asset URLs
 */
export function transformBeatsAssets<T extends { audio: string; cover: string }>(beats: T[]): T[] {
    return beats.map(transformBeatAssets);
}

