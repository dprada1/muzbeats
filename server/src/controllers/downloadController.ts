import type { Request, Response } from 'express';
import {
    validateDownloadToken,
    incrementDownloadCount,
    getAudioFilePath,
    hasR2WavFile,
    hasLocalWavFile,
    getPrivateR2Object,
    isPrivateR2Enabled,
    getWavPath,
    type DownloadTokenValidation,
} from '@/services/downloadService.js';
import { getRouteParam } from '@/utils/routeParams.js';
import { createReadStream, statSync } from 'fs';
import path from 'path';
import { getR2PublicUrl, isR2PublicConfigured } from '@/utils/r2.js';
import { logError, logInfo, logWarn } from '@/utils/logger';

/**
 * Sets download headers, pipes a readable stream to the HTTP response, and handles stream errors.
 *
 * Used for both private R2 bodies and local filesystem reads. Does not increment the download counter;
 * the handler registers `res.on('finish')` once for all success paths.
 *
 * @param res - Express response
 * @param stream - Source stream (R2 `GetObject` body or `createReadStream`)
 * @param audioPath - Path for `Content-Disposition` basename (use {@link getWavPath} when serving WAV)
 * @param ext - Extension being served (e.g. `'.wav'`); used to derive MIME when `contentType` is absent
 * @param contentType - Optional MIME from S3; falls back to a type derived from `ext`
 * @param contentLength - Optional byte length; omitted from headers when null/undefined
 * @param errorLabel - Short label for stream error logs (e.g. `'Private R2'`, `'File'`)
 */
function streamDownloadToClient(
    res: Response,
    stream: NodeJS.ReadableStream,
    audioPath: string,
    ext: string,
    contentType?: string | null,
    contentLength?: number | null,
    errorLabel = 'Download'
): void {
    // Sanitize the basename so it can't break `Content-Disposition` or filesystem save dialogs.
    // Beat titles are not used here (they can contain quotes); storage basenames are trusted but sanitized.
    const base = path.basename(audioPath);
    const filename = base.replace(/[\\/"<>|:*?]/g, '_')
                         .replace(/[\r\n]/g, '')
                         .replace(/\s+/g, ' ')
                         .trim() || 'download';

    let resolvedContentType = contentType;
    if (!resolvedContentType) {
        if (ext === '.wav') resolvedContentType = 'audio/wav';
        else if (ext === '.mp3') resolvedContentType = 'audio/mpeg';
        else resolvedContentType = 'application/octet-stream';
    }

    res.setHeader('Content-Type', resolvedContentType);
    if (contentLength != null && contentLength > 0) {
        res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Deferred: HTTP Range / Accept-Ranges (206 partial content). Whole-file 200 is sufficient
    // for token-based WAV delivery; partial ranges complicate download counting without clear product benefit.

    stream.pipe(res);
    stream.on('error', (error) => {
        logError('downloadController.streamDownloadToClient', `${errorLabel} stream error`, error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error streaming file' });
        }
    });
}

/**
 * Streams a file from the local `server/public/` tree through the download endpoint.
 *
 * @param res - Express response
 * @param filePath - Absolute path from {@link getAudioFilePath}
 * @param audioPath - DB audio path (for canonical filename)
 * @param ext - Extension being served (e.g. `'.wav'`, `'.mp3'`)
 */
function streamLocalFile(
    res: Response,
    filePath: string,
    audioPath: string,
    ext: string
): void {
    const stats = statSync(filePath);
    streamDownloadToClient(
        res,
        createReadStream(filePath),
        audioPath, 
        ext,
        null,
        stats.size,
        'File'
    );
}

/**
 * GET /api/downloads/:token
 *
 * Token-protected download for purchased beats. Validates the token, then serves audio using this order:
 *
 * 1. **Private R2 WAV** — stream through this endpoint (all environments).
 * 2. **Prod/staging, no R2 WAV** — 500 (no MP3 fallback for paid downloads).
 * 3. **Dev only** — local WAV, then public MP3 redirect (if configured), then local MP3, else 404.
 *
 * WAV masters are never exposed via public R2 URLs. Download count increments on successful 2xx stream only
 * (`res.on('finish')`); 3xx redirects do not consume a slot.
 */
export async function downloadBeatHandler(req: Request, res: Response): Promise<void> {
    try {
        const token = getRouteParam(req.params.token);

        if (!token) {
            res.status(400).json({ error: 'Download token is required' });
            return;
        }

        // Validate token
        const validation: DownloadTokenValidation = await validateDownloadToken(token);

        if (!validation) {
            res.status(404).json({ error: 'Download token not found' });
            return;
        }

        if (!validation.valid) {
            switch (validation.reason) {
                case 'expired':
                    res.status(410).json({ error: 'Download token has expired' });
                    return;
                case 'limit_reached':
                    res.status(410).json({ error: 'Download limit reached. Maximum downloads exceeded.' });
                    return;
                default: {
                    // If a new reason is ever added to the union and not handled here,
                    // THIS LINE STOPS COMPILING; the compiler forces you to handle it.
                    const _exhaustive: never = validation.reason;
                    void _exhaustive;
                    res.status(400).json({ error: 'Download token is invalid' });
                    return;
                }
            }
        }

        // Count a download only once the response has been fully and successfully
        // streamed to the client. `finish` fires when all bytes are flushed; the 2xx
        // guard excludes error responses (4xx/5xx) and dev redirects (3xx), and a
        // failed/aborted transfer never emits `finish` at all. Registered once here so
        // it applies to every serve path below (private R2, redirect, or local file).
        res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                logInfo('downloadController.downloadBeatHandler', 'Download completed', {
                    ip: req.ip,
                    downloadId: validation.downloadId,
                    beatId: validation.beatId,
                    statusCode: res.statusCode,
                    downloadCountBefore: validation.downloadCount,
                    maxDownloads: validation.maxDownloads,
                });
                incrementDownloadCount(validation.downloadId)
                    .then((consumed) => {
                        if (!consumed) {
                            logWarn(
                                'downloadController.downloadBeatHandler',
                                'Served beyond download limit (race)',
                                { downloadId: validation.downloadId }
                            );
                        }
                    })
                    .catch((error) => {
                        logError(
                            'downloadController.downloadBeatHandler',
                            'Failed to increment download count',
                            error
                        );
                    });
            }
        });

        // Security: Always check if WAV exists before deciding to redirect
        // The database stores MP3 paths, but we prefer WAVs when available
        // WAVs must ALWAYS be served through protected endpoint (never publicly accessible)
        const r2WavAvailable: boolean = await hasR2WavFile(validation.audioPath);
        const localWavAvailable: boolean = hasLocalWavFile(validation.audioPath);

        const prodLikeEnvironment =
            process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

        if (r2WavAvailable) {
            try {
                const { stream, contentType, contentLength } = await getPrivateR2Object(validation.audioPath);
                streamDownloadToClient(
                    res,
                    stream,
                    getWavPath(validation.audioPath),
                    '.wav',
                    contentType,
                    contentLength,
                    'Private R2'
                );
                return;
            } catch (error: unknown) {
                logError(
                    'downloadController.downloadBeatHandler',
                    'Failed to fetch WAV from private R2',
                    error
                );
                // dev: fall through to local WAV / MP3 fallback below
            }
        }

        // R2 WAV not available in prod/staging — reject (no MP3 fallback for paid downloads)
        if (prodLikeEnvironment) {
            logWarn(
                'downloadController.downloadBeatHandler',
                'WAV not found for purchased download (prod-like) — refusing MP3 fallback',
                {
                    audioPath: validation.audioPath,
                    privateR2Enabled: isPrivateR2Enabled(),
                    r2PublicConfigured: isR2PublicConfigured(),
                }
            );
            res.status(500).json({
                error: 'WAV master is not available. Please contact support (server is likely missing private R2 configuration).',
            });
            return;
        }

        const filePath = getAudioFilePath(validation.audioPath);

        // R2 is NOT available, but we are in dev environment, stream wav file locally to the client
        if (localWavAvailable) {
            if (!filePath) {
                // hasLocalWavFile was true but path missing - rare (deleted between checks)
                res.status(404).json({ error: 'Audio file not found' });
                return;
            }
            streamLocalFile(res, filePath, getWavPath(validation.audioPath), '.wav');
            return;
        }

        // Dev MP3 fallback: redirect to public R2 when configured (see getR2Url NODE_ENV behavior in r2.ts)
        if (isR2PublicConfigured()) {
            const redirectUrl = getR2PublicUrl(validation.audioPath);
            res.redirect(302, redirectUrl);
            return;
        }

        if (!filePath) {
            res.status(404).json({ error: 'Audio file not found' });
            return;
        }

        // R2 is NOT available, we are in dev environment, local wav file is NOT available: stream mp3 file to the client
        streamLocalFile(res, filePath, validation.audioPath, path.extname(filePath));
    } catch (error: unknown) {
        logError('downloadController.downloadBeatHandler', 'Unhandled download error', error);
        if (!res.headersSent) {
            const message = error instanceof Error ? error.message : 'Internal server error';
            res.status(500).json({ error: message });
        }
    }
}
