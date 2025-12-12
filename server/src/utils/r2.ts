/**
 * Cloudflare R2 utility functions
 * Transforms relative asset paths to R2 URLs
 */

/**
 * Get the R2 public URL for an asset
 * @param assetPath - Relative path (e.g., "/assets/beats/mp3/beat.mp3")
 * @returns Full R2 URL or original path if R2 not configured
 */
export function getR2Url(assetPath: string): string {
    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    
    // If R2 is not configured, return original path (for local dev)
    if (!r2PublicUrl) {
        return assetPath;
    }
    
    // Remove leading slash if present
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

