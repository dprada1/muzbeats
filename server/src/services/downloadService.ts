import pool from '@/config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function stripLeadingSlash(p: string): string {
    return p.startsWith('/') ? p.slice(1) : p;
}

function stripAssetsPrefix(p: string): string {
    const clean = stripLeadingSlash(p);
    return clean.startsWith('assets/') ? clean.slice(7) : clean;
}

function isR2PrivateConfigured(): boolean {
    return !!(
        process.env.R2_PRIVATE_BUCKET_NAME &&
        process.env.R2_ENDPOINT &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY
    );
}

let privateS3Client: S3Client | null = null;
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

/**
 * Validate a download token and return the associated beat information
 *
 * @param token - The download token to validate
 * @returns Beat information and file path if token is valid, null otherwise
 */
export async function validateDownloadToken(token: string) {
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
 * Increment the download count for a token
 *
 * @param downloadId - The download record ID
 */
export async function incrementDownloadCount(downloadId: string) {
    try {
        await pool.query(
            `
            UPDATE downloads
            SET download_count = download_count + 1
            WHERE id = $1
        `,
            [downloadId]
        );
    } catch (error) {
        console.error('downloadService.incrementDownloadCount error:', error);
        throw error;
    }
}

/**
 * Convert MP3 path to WAV path
 * @param audioPath - The audio path from the database (e.g., "/assets/beats/mp3/beat.mp3")
 * @returns WAV path (e.g., "/assets/beats/wav/beat.wav")
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
 * Check if a WAV file exists for the given audio path
 * @param audioPath - The audio path from the database (e.g., "/assets/beats/mp3/...")
 * @returns True if WAV exists, false otherwise
 */
export async function hasWavFile(audioPath: string): Promise<boolean> {
    const wavPath = getWavPath(audioPath);

    // If private R2 bucket is configured, check there (WAVs should live in the private bucket)
    const client = getPrivateS3Client();
    if (client && process.env.R2_PRIVATE_BUCKET_NAME) {
        const key = stripAssetsPrefix(wavPath); // e.g. beats/wav/...
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

    // Local dev fallback: check filesystem
    const wavCleanPath = stripLeadingSlash(wavPath);
    const wavFullPath = path.join(__dirname, '../../public', wavCleanPath);
    return existsSync(wavFullPath);
}

/**
 * Get the full file path for an audio file
 * Prefers WAV files, falls back to MP3
 *
 * @param audioPath - The audio path from the database (e.g., "/assets/beats/mp3/...")
 * @returns Full file system path to the audio file, or null if not found
 */
export function getAudioFilePath(audioPath: string): string | null {
    // Remove leading slash if present
    const cleanPath = audioPath.startsWith('/') ? audioPath.slice(1) : audioPath;

    // Try WAV first (higher quality)
    const wavPath = getWavPath(audioPath);
    const wavCleanPath = wavPath.startsWith('/') ? wavPath.slice(1) : wavPath;
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
 * Fetch an object stream from the private R2 bucket.
 * Used to serve WAVs privately through the token-protected download endpoint.
 */
export async function getPrivateR2Object(key: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string | null;
    contentLength: number | null;
}> {
    const client = getPrivateS3Client();
    if (!client || !process.env.R2_PRIVATE_BUCKET_NAME) {
        throw new Error('Private R2 is not configured');
    }

    const result = await client.send(
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

export function isPrivateR2Enabled(): boolean {
    return isR2PrivateConfigured();
}

