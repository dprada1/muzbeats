import pool from '@/config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import type { GetObjectCommandOutput } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Removes a single leading slash from a path segment.
 * E.g.: `/path/to/file` -> `path/to/file`
 *
 * @param p - Path string, with or without a leading `/`
 * @returns The same string without a leading slash
 */
function stripLeadingSlash(p: string): string {
    return p.startsWith('/') ? p.slice(1) : p;
}

/**
 * Checks whether an object exists in the private R2 bucket (S3 HEAD).
 *
 * Returns false when private R2 is not configured, the key is missing, or the
 * request fails for any reason. Does not throw.
 *
 * @param key - Object key in the private bucket (e.g. `wav/beat.wav`)
 * @returns `true` if the object exists; `false` otherwise
 */
async function headPrivateR2Any(key: string): Promise<boolean> {
    const client = getPrivateS3Client();
    if (!client) return false;

    try {
        await client.send(
            new HeadObjectCommand({
                Bucket: process.env.R2_PRIVATE_BUCKET_NAME,
                Key: key,
            })
        );
        return true;
    } catch {
        return false;
    }
}

/**
 * Returns whether all required private R2 environment variables are set.
 *
 * Required:
 *  - `R2_PRIVATE_BUCKET_NAME`
 *  - `R2_ENDPOINT`
 *  - `R2_ACCESS_KEY_ID`
 *  - `R2_SECRET_ACCESS_KEY`.
 *
 * @returns `true` when private R2 can be initialized; `false` otherwise (expected in local dev without R2)
 */
function isR2PrivateConfigured(): boolean {
    return !!(
        process.env.R2_PRIVATE_BUCKET_NAME &&
        process.env.R2_ENDPOINT &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY
    );
}

let privateS3Client: S3Client | null = null;

/**
 * Returns a cached S3 client for the private R2 bucket.
 *
 * Trust this as the single gate for private R2 configuration; callers should not re-check individual env vars.
 *
 * @returns Configured `S3Client`, or `null` when {@link isR2PrivateConfigured} is false
 */
function getPrivateS3Client(): S3Client | null {
    if (!isR2PrivateConfigured()) {
        return null;
    }
    if (privateS3Client) {
        return privateS3Client;
    }
    privateS3Client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
        },
    });
    return privateS3Client;
}

export type DownloadTokenInvalidReason = 'expired' | 'limit_reached';

export type DownloadTokenValidation =
    | null
    | { valid: false; reason: DownloadTokenInvalidReason }
    | {
          valid: true;
          downloadId: string;
          beatId: string;
          beatTitle: string;
          audioPath: string;
          downloadCount: number;
          maxDownloads: number;
      };

/**
 * Validates a download token and loads the associated beat and order metadata.
 *
 * @param token - Opaque download token from the purchase confirmation email
 * @returns `null` if the token is not found; `{ valid: false, reason }` if expired or over limit; otherwise beat and download fields with `valid: true`
 * @throws If the database query fails
 */
export async function validateDownloadToken(
    token: string
): Promise<DownloadTokenValidation> {
    try {
        const result = await pool.query(
            `
            SELECT 
                d.id,
                d.order_id,
                d.beat_id,
                d.download_token,
                d.expires_at,
                d.download_count,
                d.max_downloads,
                b.audio_path,
                b.title
            FROM downloads d
            JOIN beats b ON d.beat_id = b.id
            WHERE d.download_token = $1
        `,
            [token]
        );

        if (result.rows.length === 0) {
            return null; // Token not found
        }

        const download = result.rows[0];

        // Check if token has expired
        const expiresAt = new Date(download.expires_at);
        if (expiresAt < new Date()) {
            return { valid: false, reason: 'expired' as const };
        }

        // Check if download limit has been reached
        if (download.download_count >= download.max_downloads) {
            return { valid: false, reason: 'limit_reached' as const };
        }

        // Token is valid
        return {
            valid: true,
            downloadId: download.id,
            beatId: download.beat_id,
            beatTitle: download.title,
            audioPath: download.audio_path,
            downloadCount: download.download_count,
            maxDownloads: download.max_downloads,
        };
    } catch (error) {
        console.error('downloadService.validateDownloadToken error:', error);
        throw error;
    }
}

/**
 * Atomically consumes one download slot for a token after a successful delivery.
 *
 * The check (`download_count < max_downloads`) and increment run in one SQL statement,
 * so concurrent requests cannot exceed the limit (no TOCTOU race).
 *
 * @param downloadId - Primary key of the `downloads` row
 * @returns `true` if a slot was consumed; `false` if the token was already at its limit
 * @throws If the database update fails
 */
export async function incrementDownloadCount(downloadId: string): Promise<boolean> {
    try {
        const result = await pool.query(
            `
            UPDATE downloads
            SET download_count = download_count + 1
            WHERE id = $1 AND download_count < max_downloads
            RETURNING download_count
        `,
            [downloadId]
        );
        return (result.rowCount ?? 0) > 0;
    } catch (error) {
        console.error('downloadService.incrementDownloadCount error:', error);
        throw error;
    }
}

/**
 * Derives the corresponding WAV storage path from a database audio path.
 *
 * Replaces `/mp3/` with `/wav/` and `.mp3` with `.wav` when present.
 *
 * @param audioPath - Path stored on the beat row (usually MP3 under `/assets/beats/mp3/...`)
 * @returns Equivalent WAV path (e.g. `/assets/beats/wav/beat.wav`)
 */
export function getWavPath(audioPath: string): string {
    let wavPath = audioPath;
    if (wavPath.includes('/mp3/')) {
        wavPath = wavPath.replace('/mp3/', '/wav/');
    }
    if (wavPath.endsWith('.mp3')) {
        wavPath = wavPath.replace('.mp3', '.wav');
    }
    return wavPath;
}

/**
 * Builds the private R2 object key for a beat's WAV master.
 *
 * Bucket layout is flat: `wav/<filename>.wav` (not `beats/wav/<filename>.wav`).
 *
 * @param audioPath - Database audio path (MP3 or WAV); only the basename is used
 * @returns R2 object key (e.g. `wav/gunna__versace_Cmin_130.wav`)
 */
function getPrivateWavR2Key(audioPath: string): string {
    return `wav/${path.basename(getWavPath(audioPath))}`;
}

/**
 * Checks whether the WAV master exists in the private R2 bucket.
 *
 * @param audioPath - Database audio path for the purchased beat
 * @returns `true` if private R2 is configured and HEAD succeeds for the derived key; `false` if R2 is unconfigured, the object is missing, or HEAD fails
 */
export async function hasR2WavFile(audioPath: string): Promise<boolean> {
    if (!getPrivateS3Client()) return false;
    return headPrivateR2Any(getPrivateWavR2Key(audioPath));
}

/**
 * Checks whether the WAV master exists on the local filesystem.
 *
 * Looks under `server/public/` using the path from {@link getWavPath}.
 *
 * @param audioPath - Database audio path for the purchased beat
 * @returns `true` if the WAV file exists on disk; `false` otherwise
 */
export function hasLocalWavFile(audioPath: string): boolean {
    const wavPath = getWavPath(audioPath);
    const wavCleanPath = stripLeadingSlash(wavPath);
    const wavFullPath = path.join(__dirname, '../../public', wavCleanPath);
    return existsSync(wavFullPath);
}

/**
 * Resolves an absolute filesystem path for local audio serving (dev / non-R2).
 *
 * Prefers the WAV under `server/public/`; falls back to the original MP3 path if no local WAV exists.
 *
 * @param audioPath - Database audio path (e.g. `/assets/beats/mp3/beat.mp3`)
 * @returns Absolute path to an existing local WAV or MP3 file, or `null` if neither exists
 */
export function getAudioFilePath(audioPath: string): string | null {
    // Remove leading slash if present
    const cleanPath = stripLeadingSlash(audioPath);

    // Try WAV first (higher quality)
    const wavPath = getWavPath(cleanPath);
    const wavCleanPath = stripLeadingSlash(wavPath);
    const wavFullPath = path.join(__dirname, '../../public', wavCleanPath);

    if (existsSync(wavFullPath)) {
        return wavFullPath;
    }

    // Fall back to MP3 (original path)
    const mp3FullPath = path.join(__dirname, '../../public', cleanPath);
    if (existsSync(mp3FullPath)) {
        return mp3FullPath;
    }

    return null;
}

/**
 * Fetches a WAV object stream from private R2 for token-protected download.
 *
 * The object key is derived from `audioPath` via {@link getPrivateWavR2Key}; callers must not pass legacy `beats/wav/...` keys.
 *
 * @param audioPath - Database audio path for the purchased beat
 * @returns Readable stream plus optional S3 `Content-Type` and `Content-Length`
 * @throws If private R2 is not configured, the object is missing, S3 returns an error, or the response body is empty
 */
export async function getPrivateR2Object(audioPath: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string | null;
    contentLength: number | null;
}> {
    const privateR2Client = getPrivateS3Client();
    if (!privateR2Client) {
        throw new Error('Private R2 is not configured');
    }

    const key = getPrivateWavR2Key(audioPath);

    const result: GetObjectCommandOutput = await privateR2Client.send(
        new GetObjectCommand({
            Bucket: process.env.R2_PRIVATE_BUCKET_NAME,
            Key: key,
        })
    );

    if (!result.Body) {
        throw new Error('Private R2 object body is empty');
    }

    return {
        stream: result.Body as NodeJS.ReadableStream,
        contentType: (result.ContentType as string | undefined) ?? null,
        contentLength: (result.ContentLength as number | undefined) ?? null,
    };
}

/**
 * Reports whether private R2 is fully configured and available for downloads.
 *
 * Alias for {@link isR2PrivateConfigured}. Use in the controller for routing; do not re-check individual env vars elsewhere.
 *
 * @returns `true` when all private R2 env vars are set; `false` otherwise
 */
export function isPrivateR2Enabled(): boolean {
    return isR2PrivateConfigured();
}
