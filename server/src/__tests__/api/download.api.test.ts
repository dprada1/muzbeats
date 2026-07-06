import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Readable } from 'stream';
import type { DownloadTokenValidation } from '@/services/downloadService.js';

vi.mock('@/services/downloadService.js', () => ({
    validateDownloadToken: vi.fn(),
    incrementDownloadCount: vi.fn(),
    getAudioFilePath: vi.fn(),
    hasR2WavFile: vi.fn(),
    hasLocalWavFile: vi.fn(),
    getPrivateR2Object: vi.fn(),
    isPrivateR2Enabled: vi.fn(),
}));

vi.mock('@/utils/r2.js', () => ({
    getR2PublicUrl: vi.fn(),
    isR2PublicConfigured: vi.fn(),
}));

vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    return {
        ...actual,
        statSync: vi.fn(() => ({ size: 11 })),
        createReadStream: vi.fn(() => Readable.from(['local-bytes'])),
    };
});

import downloadRoutes from '@/routes/downloadRoutes.js';
import {
    validateDownloadToken,
    incrementDownloadCount,
    getAudioFilePath,
    hasR2WavFile,
    hasLocalWavFile,
    getPrivateR2Object,
    isPrivateR2Enabled,
} from '@/services/downloadService.js';
import { getR2PublicUrl, isR2PublicConfigured } from '@/utils/r2.js';

const TOKEN = 'test-download-token';
const AUDIO_PATH = '/assets/beats/mp3/test_beat.mp3';
const LOCAL_FILE = '/tmp/test_beat.wav';

const validValidation: Extract<DownloadTokenValidation, { valid: true }> = {
    valid: true,
    downloadId: 'download-id-1',
    beatId: 'beat-id-1',
    beatTitle: 'Test Beat',
    audioPath: AUDIO_PATH,
    downloadCount: 0,
    maxDownloads: 5,
};

function createApp() {
    const app = express();
    app.use('/api/downloads', downloadRoutes);
    return app;
}

function mockValidToken() {
    vi.mocked(validateDownloadToken).mockResolvedValue(validValidation);
    vi.mocked(incrementDownloadCount).mockResolvedValue(true);
}

function mockNoR2Wav() {
    vi.mocked(hasR2WavFile).mockResolvedValue(false);
}

describe('GET /api/downloads/:token', () => {
    const originalNodeEnv: string | undefined = process.env.NODE_ENV;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NODE_ENV = 'development';
        mockValidToken();
        mockNoR2Wav();
        vi.mocked(hasLocalWavFile).mockReturnValue(false);
        vi.mocked(getAudioFilePath).mockReturnValue(null);
        vi.mocked(isR2PublicConfigured).mockReturnValue(false);
        vi.mocked(isPrivateR2Enabled).mockReturnValue(false);
        vi.mocked(getR2PublicUrl).mockReturnValue(AUDIO_PATH);
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
    });

    describe('token validation (A1–A3)', () => {
        test('returns 404 when token is not found', async () => {
            vi.mocked(validateDownloadToken).mockResolvedValue(null);

            const res = await request(createApp()).get(`/api/downloads/${TOKEN}`);

            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Download token not found' });
            expect(hasR2WavFile).not.toHaveBeenCalled();
        });

        test('returns 410 when token is expired', async () => {
            vi.mocked(validateDownloadToken).mockResolvedValue({
                valid: false,
                reason: 'expired',
            });

            const res = await request(createApp()).get(`/api/downloads/${TOKEN}`);

            expect(res.status).toBe(410);
            expect(res.body).toEqual({ error: 'Download token has expired' });
        });

        test('returns 410 when download limit is reached', async () => {
            vi.mocked(validateDownloadToken).mockResolvedValue({
                valid: false,
                reason: 'limit_reached',
            });

            const res = await request(createApp()).get(`/api/downloads/${TOKEN}`);

            expect(res.status).toBe(410);
            expect(res.body).toEqual({
                error: 'Download limit reached. Maximum downloads exceeded.',
            });
        });

        test('returns 500 when validateDownloadToken throws', async () => {
            vi.mocked(validateDownloadToken).mockRejectedValue(new Error('DB unavailable'));

            const res = await request(createApp()).get(`/api/downloads/${TOKEN}`);

            expect(res.status).toBe(500);
            expect(res.body.error).toBe('DB unavailable');
        });
    });

    describe('serve branches (B1–B8)', () => {
        test('B1: streams WAV from private R2 when HEAD succeeds', async () => {
            vi.mocked(hasR2WavFile).mockResolvedValue(true);
            vi.mocked(getPrivateR2Object).mockResolvedValue({
                stream: Readable.from(['wav-bytes']),
                contentType: 'audio/wav',
                contentLength: 9,
            });

            const res = await request(createApp()).get(`/api/downloads/${TOKEN}`);

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/audio\/wav/);
            expect(res.headers['content-length']).toBe('9');
            expect(getPrivateR2Object).toHaveBeenCalledWith(AUDIO_PATH);
            await vi.waitFor(() =>
                expect(incrementDownloadCount).toHaveBeenCalledWith(validValidation.downloadId)
            );
        });

        test('B2: returns 500 when R2 GET fails in prod-like environment', async () => {
            process.env.NODE_ENV = 'staging';
            vi.mocked(hasR2WavFile).mockResolvedValue(true);
            vi.mocked(getPrivateR2Object).mockRejectedValue(new Error('R2 GET failed'));

            const res = await request(createApp()).get(`/api/downloads/${TOKEN}`);

            expect(res.status).toBe(500);
            expect(res.body.error).toContain('WAV master is not available');
            expect(incrementDownloadCount).not.toHaveBeenCalled();
        });

        test('B3: falls through to local WAV when R2 GET fails in dev', async () => {
            vi.mocked(hasR2WavFile).mockResolvedValue(true);
            vi.mocked(getPrivateR2Object).mockRejectedValue(new Error('R2 GET failed'));
            vi.mocked(hasLocalWavFile).mockReturnValue(true);
            vi.mocked(getAudioFilePath).mockReturnValue(LOCAL_FILE);

            const res = await request(createApp()).get(`/api/downloads/${TOKEN}`);

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/audio\/wav/);
            await vi.waitFor(() =>
                expect(incrementDownloadCount).toHaveBeenCalledWith(validValidation.downloadId)
            );
        });

        test('B4: returns 500 in prod-like environment when no R2 WAV', async () => {
            process.env.NODE_ENV = 'staging';
            vi.mocked(hasLocalWavFile).mockReturnValue(true);
            vi.mocked(getAudioFilePath).mockReturnValue(LOCAL_FILE);

            const res = await request(createApp()).get(`/api/downloads/${TOKEN}`);

            expect(res.status).toBe(500);
            expect(res.body.error).toContain('WAV master is not available');
            expect(incrementDownloadCount).not.toHaveBeenCalled();
        });

        test('B5: streams local WAV in dev when private R2 WAV is unavailable', async () => {
            vi.mocked(hasLocalWavFile).mockReturnValue(true);
            vi.mocked(getAudioFilePath).mockReturnValue(LOCAL_FILE);

            const res = await request(createApp()).get(`/api/downloads/${TOKEN}`);

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/audio\/wav/);
            await vi.waitFor(() =>
                expect(incrementDownloadCount).toHaveBeenCalledWith(validValidation.downloadId)
            );
        });

        test('B6: redirects to public MP3 URL in dev when configured', async () => {
            vi.mocked(isR2PublicConfigured).mockReturnValue(true);
            vi.mocked(getR2PublicUrl).mockReturnValue(AUDIO_PATH);

            const res = await request(createApp()).get(`/api/downloads/${TOKEN}`).redirects(0);

            expect(res.status).toBe(302);
            expect(res.headers.location).toBe(AUDIO_PATH);
            expect(incrementDownloadCount).not.toHaveBeenCalled();
        });

        test('B7: streams local MP3 in dev when no WAV and no public R2 redirect', async () => {
            const mp3Path = '/tmp/test_beat.mp3';
            vi.mocked(getAudioFilePath).mockReturnValue(mp3Path);

            const res = await request(createApp()).get(`/api/downloads/${TOKEN}`);

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/audio\/mpeg/);
            await vi.waitFor(() =>
                expect(incrementDownloadCount).toHaveBeenCalledWith(validValidation.downloadId)
            );
        });

        test('B8: returns 404 when no WAV, no redirect, and no local MP3', async () => {
            const res = await request(createApp()).get(`/api/downloads/${TOKEN}`);

            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Audio file not found' });
            expect(incrementDownloadCount).not.toHaveBeenCalled();
        });

        test('returns 404 when local WAV existed at check time but path is missing', async () => {
            vi.mocked(hasLocalWavFile).mockReturnValue(true);
            vi.mocked(getAudioFilePath).mockReturnValue(null);

            const res = await request(createApp()).get(`/api/downloads/${TOKEN}`);

            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Audio file not found' });
        });
    });
});
