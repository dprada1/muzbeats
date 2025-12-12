/**
 * Cloudflare R2 utility functions
 * Transforms relative asset paths to R2 URLs
 */

/**
 * Get the R2 public URL for an asset
 * Only serves MP3s from R2 (public). WAVs are kept private and served through download endpoint.
 * @param assetPath - Relative path (e.g., "/assets/beats/mp3/beat.mp3" or "/assets/beats/wav/beat.wav")
 * @returns Full R2 URL for MP3s, original path for WAVs (to be served through protected download endpoint)
 */
export function getR2Url(assetPath: string): string {
    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    
    // If R2 is not configured, return original path (for local dev)
    if (!r2PublicUrl) {
        return assetPath;
    }
    
    // Only serve MP3s from R2 (public). WAVs stay private.
    // WAVs will be served through the download endpoint which validates tokens.
    if (assetPath.includes('/wav/') || assetPath.endsWith('.wav')) {
        // Return original path - WAVs will be served through protected download endpoint
        return assetPath;
    }
    
    // For MP3s (and other non-WAV files), serve from R2
    const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
    
    // Remove 'assets/' prefix if present (R2 bucket structure)
    const r2Path = cleanPath.startsWith('assets/') ? cleanPath.slice(7) : cleanPath;
    
    // Construct R2 URL
    const baseUrl = r2PublicUrl.endsWith('/') ? r2PublicUrl.slice(0, -1) : r2PublicUrl;
    return `${baseUrl}/${r2Path}`;
}

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
    return !!process.env.R2_PUBLIC_URL;
}

