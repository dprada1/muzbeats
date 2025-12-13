import type { Request, Response } from 'express';
import {
    validateDownloadToken,
    incrementDownloadCount,
    getAudioFilePath,
    hasWavFile,
    getPrivateR2Object,
    isPrivateR2Enabled,
    getWavPath,
} from '@/services/downloadService.js';
import { createReadStream, statSync } from 'fs';
import path from 'path';
import { getR2Url, isR2Configured } from '@/utils/r2.js';

function stripLeadingSlash(p: string): string {
    return p.startsWith('/') ? p.slice(1) : p;
}

function stripAssetsPrefix(p: string): string {
    const clean = stripLeadingSlash(p);
    return clean.startsWith('assets/') ? clean.slice(7) : clean;
}

/**
 * GET /api/downloads/:token
 *
 * Download endpoint for purchased beats.
 * Validates the token, checks expiration and download limits, then serves the file.
 */
export async function downloadBeatHandler(req: Request, res: Response): Promise<void> {
    try {
        const { token } = req.params;

        if (!token) {
            res.status(400).json({ error: 'Download token is required' });
            return;
        }

        // Validate token
        const validation = await validateDownloadToken(token);

        if (!validation) {
            res.status(404).json({ error: 'Download token not found' });
            return;
        }

        if (!validation.valid) {
            if (validation.reason === 'expired') {
                res.status(410).json({ error: 'Download token has expired' });
                return;
            }
            if (validation.reason === 'limit_reached') {
                res.status(403).json({
                    error: 'Download limit reached. Maximum downloads exceeded.',
                });
                return;
            }
            res.status(403).json({ error: 'Download token is invalid' });
            return;
        }

        // Increment download count (do this before redirect/stream)
        await incrementDownloadCount(validation.downloadId).catch((error) => {
            console.error('downloadController: Failed to increment download count:', error);
        });

        // Security: Always check if WAV exists before deciding to redirect
        // The database stores MP3 paths, but we prefer WAVs when available
        // WAVs must ALWAYS be served through protected endpoint (never publicly accessible)
        const wavExists = await hasWavFile(validation.audioPath);
        const isMp3Path = validation.audioPath.includes('/mp3/') || validation.audioPath.endsWith('.mp3');

        // If WAV exists, always serve through protected endpoint (never redirect to R2)
        // This ensures WAVs are never publicly accessible
        if (wavExists) {
            console.log(`downloadController: WAV file exists, serving through protected endpoint`);
            // Continue to serve through endpoint below
        }
        // If no WAV exists, it's MP3-only, and R2 is configured, redirect to R2 (uses free egress)
        else if (!wavExists && isMp3Path && isR2Configured()) {
            const r2Url = getR2Url(validation.audioPath);
            console.log(`downloadController: MP3-only, redirecting to R2 URL: ${r2Url}`);
            res.redirect(302, r2Url);
            return;
        }

        // If WAV exists and private R2 is enabled, stream WAV from private bucket
        if (wavExists && isPrivateR2Enabled()) {
            const wavPath = getWavPath(validation.audioPath);
            const key = stripAssetsPrefix(wavPath); // beats/wav/...
            try {
                const { stream, contentType, contentLength } = await getPrivateR2Object(key);
                const ext = path.extname(key).toLowerCase() || '.wav';
                const resolvedContentType =
                    contentType ||
                    (ext === '.wav' ? 'audio/wav' : ext === '.mp3' ? 'audio/mpeg' : 'application/octet-stream');

                res.setHeader('Content-Type', resolvedContentType);
                if (contentLength) {
                    res.setHeader('Content-Length', contentLength);
                }
                res.setHeader(
                    'Content-Disposition',
                    `attachment; filename="${validation.beatTitle}${ext}"`
                );
                res.setHeader('Accept-Ranges', 'bytes');

                stream.pipe(res);
                stream.on('error', (error) => {
                    console.error('downloadController: Private R2 stream error:', error);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Error streaming file' });
                    }
                });
                return;
            } catch (error: any) {
                console.error('downloadController: Failed to fetch WAV from private R2:', error);
                // fall through to local filesystem attempt
            }
        }

        // Otherwise, serve from local filesystem (dev / non-R2 setups)
        const filePath = getAudioFilePath(validation.audioPath);

        if (!filePath) {
            console.error(
                `downloadController: Audio file not found for path: ${validation.audioPath}`
            );
            res.status(404).json({ error: 'Audio file not found' });
            return;
        }

        // Get file stats for Content-Length header
        const stats = statSync(filePath);
        const fileSize = stats.size;

        // Determine content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const contentType =
            ext === '.wav'
                ? 'audio/wav'
                : ext === '.mp3'
                ? 'audio/mpeg'
                : 'application/octet-stream';

        // Set headers for file download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileSize);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${validation.beatTitle}${ext}"`
        );
        res.setHeader('Accept-Ranges', 'bytes');

        // Stream the file
        const fileStream = createReadStream(filePath);
        fileStream.pipe(res);

        // Handle stream errors
        fileStream.on('error', (error) => {
            console.error('downloadController: File stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file' });
            }
        });
    } catch (error: any) {
        console.error('downloadController.downloadBeatHandler error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }
}

