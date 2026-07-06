import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { SearchParams } from '@/types/SearchParams.js';

vi.mock('@/config/database.js', () => ({
    default: { query: vi.fn() },
}));

vi.mock('@/utils/r2.js', () => ({
    getR2PublicUrl: vi.fn((path: string) => `https://cdn.example/${path.replace(/^\//, '')}`),
}));

import pool from '@/config/database.js';
import { getBeats, getBeatById } from '@/services/beatsService.js';
import { getR2PublicUrl } from '@/utils/r2.js';

const BEAT_ID = '11111111-1111-1111-1111-111111111111';
const AUDIO_PATH = '/assets/beats/mp3/test_beat.mp3';

const emptySearchParams: SearchParams = {
    bpmRanges: [],
    bpmValues: [],
    keys: [],
    queryTokens: [],
};

function beatRow(overrides: Record<string, unknown> = {}) {
    return {
        id: BEAT_ID,
        title: 'Test Beat',
        key: 'c#min',
        bpm: 160,
        price: '29.99',
        audio_path: AUDIO_PATH,
        cover_path: null,
        ...overrides,
    };
}

describe('beatsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getBeatById', () => {
        test('returns null when no beat matches the id', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as never);

            await expect(getBeatById(BEAT_ID)).resolves.toBeNull();
            expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), [BEAT_ID]);
        });

        test('maps database row to Beat with denormalized key and cover fallback', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rows: [beatRow()] } as never);

            const beat = await getBeatById(BEAT_ID);

            expect(beat).toEqual({
                id: BEAT_ID,
                title: 'Test Beat',
                key: 'C♯ min',
                bpm: 160,
                price: 29.99,
                audio: 'https://cdn.example/assets/beats/mp3/test_beat.mp3',
                cover: 'https://cdn.example/assets/images/skimask.png',
            });
            expect(getR2PublicUrl).toHaveBeenCalledWith(AUDIO_PATH);
            expect(getR2PublicUrl).toHaveBeenCalledWith('/assets/images/skimask.png');
        });

        test('throws a wrapped error when the database query fails', async () => {
            vi.mocked(pool.query).mockRejectedValueOnce(new Error('timeout'));

            await expect(getBeatById(BEAT_ID)).rejects.toThrow('Failed to fetch beat from database');
        });
    });

    describe('getBeats', () => {
        test('returns mapped beats for query results', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rows: [beatRow()] } as never);

            const beats = await getBeats(emptySearchParams);

            expect(beats).toHaveLength(1);
            expect(beats[0]?.id).toBe(BEAT_ID);
            expect(beats[0]?.key).toBe('C♯ min');
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id, title, key, bpm, price, audio_path, cover_path FROM beats'),
                expect.any(Array)
            );
        });

        test('returns an empty array when no beats match', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as never);

            await expect(getBeats(emptySearchParams)).resolves.toEqual([]);
        });

        test('throws a wrapped error when the database query fails', async () => {
            vi.mocked(pool.query).mockRejectedValueOnce(new Error('timeout'));

            await expect(getBeats(emptySearchParams)).rejects.toThrow('Failed to fetch beats from database');
        });
    });
});
