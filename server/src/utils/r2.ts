/**
 * Cloudflare R2 utility functions
 * Transforms relative asset paths to R2 URLs
 */

import {
    getEnv,
    isSet
} from '@/config/env.js';

/**
 * Get the R2 public URL for an asset
 * Only serves MP3s from R2 (public). WAVs are kept private and served through download endpoint.
 * @param assetPath - Relative path (e.g., "/assets/beats/mp3/beat.mp3" or "/assets/beats/wav/beat.wav")
 * @returns Full R2 URL for MP3s, original path for WAVs (to be served through protected download endpoint)
 */
export function getR2PublicUrl(assetPath: string): string {
    const r2PublicUrl = getEnv('R2_PUBLIC_URL');

    // Serve from R2 only when it's configured AND we're in a deployed environment.
    // In local dev we return the original path so assets load from the local filesystem.
    const isProduction = process.env.NODE_ENV === 'production';
    const isStaging = process.env.NODE_ENV === 'staging';
    if (!r2PublicUrl || !(isProduction || isStaging)) {
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
 * True when `R2_PUBLIC_URL` is set (CDN / public HTTP base, e.g. pub-*.r2.dev or a custom domain).
 * Used for browser URLs and HTTP HEAD probes — not for S3 ListObjects.
 */
export function isR2PublicURLConfigured(): boolean {
    return isSet('R2_PUBLIC_URL');
}

/**
 * True when `R2_PUBLIC_BUCKET_NAME` is set (e.g. muzbeats-media-public).
 * Needed for S3 ListObjects inventory; HTTP HEAD uses {@link isR2PublicURLConfigured} instead.
 */
export function isR2PublicBucketNameConfigured(): boolean {
    return isSet('R2_PUBLIC_BUCKET_NAME');
}

/**
 * Returns whether private R2 S3 access is configured.
 *
 * Checks (not a public URL — private objects have no CDN URL):
 *  - `R2_PRIVATE_BUCKET_NAME`
 *  - `R2_ENDPOINT`
 *  - `R2_ACCESS_KEY_ID`
 *  - `R2_SECRET_ACCESS_KEY`
 *
 * @returns `true` when a private R2 S3 client can be initialized; `false` otherwise
 */
export function isR2PrivateConfigured(): boolean {
    return (
        isSet('R2_PRIVATE_BUCKET_NAME') &&
        isSet('R2_ENDPOINT') &&
        isSet('R2_ACCESS_KEY_ID') &&
        isSet('R2_SECRET_ACCESS_KEY')
    );
}
