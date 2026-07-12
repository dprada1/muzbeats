import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/database.js', () => ({
    default: { query: vi.fn() },
}));

import pool from '@/config/database.js';
import {
    validateDownloadToken,
    incrementDownloadCount,
    getWavPath,
} from '@/services/downloadService.js';

const TOKEN = 'test-download-token';
const DOWNLOAD_ID = 'download-id-1';
const BEAT_ID = 'beat-id-1';
const AUDIO_PATH = '/assets/beats/mp3/test_beat.mp3';

function downloadRow(overrides: Record<string, unknown> = {}) {
    return {
        id: DOWNLOAD_ID,
        order_id: 'order-id-1',
        beat_id: BEAT_ID,
        download_token: TOKEN,
        expires_at: '2099-06-01T00:00:00.000Z',
        download_count: 0,
        max_downloads: 5,
        audio_path: AUDIO_PATH,
        title: 'Test Beat',
        ...overrides,
    };
}

describe('downloadService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateDownloadToken', () => {
        test('returns null when no row matches the token', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as never);

            await expect(validateDownloadToken(TOKEN)).resolves.toBeNull();
            expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE d.download_token = $1'), [
                TOKEN,
            ]);
        });

        test('returns expired when expires_at is in the past', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({
                rows: [downloadRow({ expires_at: '2020-01-01T00:00:00.000Z' })],
            } as never);

            await expect(validateDownloadToken(TOKEN)).resolves.toEqual({
                valid: false,
                reason: 'expired',
            });
        });

        test('returns limit_reached when download_count equals max_downloads', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({
                rows: [downloadRow({ download_count: 5, max_downloads: 5 })],
            } as never);

            await expect(validateDownloadToken(TOKEN)).resolves.toEqual({
                valid: false,
                reason: 'limit_reached',
            });
        });

        test('returns limit_reached when download_count exceeds max_downloads', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({
                rows: [downloadRow({ download_count: 6, max_downloads: 5 })],
            } as never);

            await expect(validateDownloadToken(TOKEN)).resolves.toEqual({
                valid: false,
                reason: 'limit_reached',
            });
        });

        test('returns valid payload when token is active and under limit', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({
                rows: [downloadRow()],
            } as never);

            await expect(validateDownloadToken(TOKEN)).resolves.toEqual({
                valid: true,
                downloadId: DOWNLOAD_ID,
                beatId: BEAT_ID,
                beatTitle: 'Test Beat',
                audioPath: AUDIO_PATH,
                downloadCount: 0,
                maxDownloads: 5,
            });
        });

        test('rethrows when the database query fails', async () => {
            const dbError = new Error('connection refused');
            vi.mocked(pool.query).mockRejectedValueOnce(dbError);

            await expect(validateDownloadToken(TOKEN)).rejects.toThrow('connection refused');
        });
    });

    describe('incrementDownloadCount', () => {
        test('returns true when a row is updated', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 1, rows: [{ download_count: 1 }] } as never);

            await expect(incrementDownloadCount(DOWNLOAD_ID)).resolves.toBe(true);
            expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('download_count < max_downloads'), [
                DOWNLOAD_ID,
            ]);
        });

        test('returns false when no row is updated (already at limit)', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rowCount: 0, rows: [] } as never);

            await expect(incrementDownloadCount(DOWNLOAD_ID)).resolves.toBe(false);
        });

        test('rethrows when the database update fails', async () => {
            vi.mocked(pool.query).mockRejectedValueOnce(new Error('deadlock'));

            await expect(incrementDownloadCount(DOWNLOAD_ID)).rejects.toThrow('deadlock');
        });
    });

    describe('getWavPath', () => {
        test('maps mp3 asset path to wav path', () => {
            expect(getWavPath('/assets/beats/mp3/test_beat.mp3')).toBe('/assets/beats/wav/test_beat.wav');
        });

        test('leaves non-mp3 paths unchanged when no mp3 segment', () => {
            expect(getWavPath('/assets/beats/wav/test_beat.wav')).toBe('/assets/beats/wav/test_beat.wav');
        });
    });
});
