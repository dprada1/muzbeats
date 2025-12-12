import type { Request, Response } from 'express';
import {
    validateDownloadToken,
    incrementDownloadCount,
    getAudioFilePath,
} from '@/services/downloadService.js';
import { createReadStream, statSync } from 'fs';
import path from 'path';
import { getR2Url, isR2Configured } from '@/utils/r2.js';

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

        // If R2 is configured and it's an MP3 (not WAV), redirect to R2 URL
        // WAVs are kept private and served through backend (protected by token)
        if (isR2Configured() && !validation.audioPath.includes('/wav/') && !validation.audioPath.endsWith('.wav')) {
            const r2Url = getR2Url(validation.audioPath);
            console.log(`downloadController: Redirecting MP3 to R2 URL: ${r2Url}`);
            res.redirect(302, r2Url);
            return;
        }
        
        // For WAVs (or when R2 not configured), serve from local filesystem
        // This ensures WAVs are only accessible through the protected download endpoint

        // Otherwise, stream from local filesystem (for local dev)
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

