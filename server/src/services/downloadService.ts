import pool from '@/config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Get the full file path for an audio file
 * Prefers WAV files, falls back to MP3
 *
 * @param audioPath - The audio path from the database (e.g., "/assets/beats/mp3/...")
 * @returns Full file system path to the audio file, or null if not found
 */
export function getAudioFilePath(audioPath: string): string | null {
    // Remove leading slash if present
    const cleanPath = audioPath.startsWith('/') ? audioPath.slice(1) : audioPath;

    // Try WAV first (higher quality) - replace /mp3/ with /wav/ and .mp3 with .wav
    let wavPath = audioPath;
    if (wavPath.includes('/mp3/')) {
        wavPath = wavPath.replace('/mp3/', '/wav/');
    }
    if (wavPath.endsWith('.mp3')) {
        wavPath = wavPath.replace('.mp3', '.wav');
    }
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

