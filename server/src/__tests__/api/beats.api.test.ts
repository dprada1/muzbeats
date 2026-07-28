import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Beat } from '@/types/Beat.js';
import type { SearchParams } from '@/types/SearchParams.js';

vi.mock('@/services/beatsService.js', () => ({
    getBeats: vi.fn(),
    getBeatById: vi.fn(),
}));

import beatsRoutes from '@/routes/beatsRoutes.js';
import { getBeats, getBeatById } from '@/services/beatsService.js';

const BEAT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const sampleBeat: Beat = {
    id: BEAT_ID,
    title: 'Test Beat',
    key: 'C♯ min',
    bpm: 160,
    price: 29.99,
    audio: '/assets/beats/mp3/test.mp3',
    cover: '/assets/images/skimask.png',
};

const emptySearchParams: SearchParams = {
    bpmRanges: [],
    bpmValues: [],
    keys: [],
    queryTokens: [],
};

function createApp() {
    const app = express();
    app.use('/api/beats', beatsRoutes);
    return app;
}

function lastGetBeatsParams(): SearchParams {
    const calls = vi.mocked(getBeats).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    return calls[calls.length - 1][0];
}

describe('GET /api/beats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getBeats).mockResolvedValue([]);
    });

    it('returns 200 and an empty array when no beats match', async () => {
        const res = await request(createApp()).get('/api/beats');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
        expect(getBeats).toHaveBeenCalledWith(emptySearchParams);
    });

    it('returns 200 and beat list from the service', async () => {
        vi.mocked(getBeats).mockResolvedValue([sampleBeat]);

        const res = await request(createApp()).get('/api/beats');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([sampleBeat]);
    });

    it('parses ?q= into SearchParams via parseSearchQuery', async () => {
        await request(createApp()).get('/api/beats').query({ q: '160' });

        const params = lastGetBeatsParams();
        expect(params.bpmValues).toContain(160);
    });

    it('builds SearchParams from ?bpm= when q is absent', async () => {
        await request(createApp()).get('/api/beats').query({ bpm: '160' });

        expect(lastGetBeatsParams()).toEqual({
            ...emptySearchParams,
            bpmValues: [160],
        });
    });

    it('ignores invalid ?bpm= values', async () => {
        await request(createApp()).get('/api/beats').query({ bpm: '999' });

        expect(lastGetBeatsParams()).toEqual(emptySearchParams);
    });

    it('builds BPM range from ?bpmMin= and ?bpmMax=', async () => {
        await request(createApp()).get('/api/beats').query({ bpmMin: '150', bpmMax: '170' });

        expect(lastGetBeatsParams()).toEqual({
            ...emptySearchParams,
            bpmRanges: [[150, 170]],
        });
    });

    it('builds key filter from ?key=', async () => {
        await request(createApp()).get('/api/beats').query({ key: 'C#min' });

        expect(lastGetBeatsParams()).toEqual({
            ...emptySearchParams,
            keys: ['C#min'],
        });
    });

    it('tokenizes ?search= into queryTokens', async () => {
        await request(createApp()).get('/api/beats').query({ search: 'pierre noir' });

        expect(lastGetBeatsParams()).toEqual({
            ...emptySearchParams,
            queryTokens: ['pierre', 'noir'],
        });
    });

    it('prefers ?q= over individual filter params', async () => {
        await request(createApp())
            .get('/api/beats')
            .query({ q: '160', bpm: '140', search: 'ignored' });

        const params = lastGetBeatsParams();
        expect(params.bpmValues).toContain(160);
        expect(params.bpmValues).not.toContain(140);
        expect(params.queryTokens).not.toContain('ignored');
    });

    it('returns 500 when getBeats throws', async () => {
        vi.mocked(getBeats).mockRejectedValue(new Error('DB down'));

        const res = await request(createApp()).get('/api/beats');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Failed to fetch beats' });
    });
});

describe('GET /api/beats/:id', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 200 and the beat when found', async () => {
        vi.mocked(getBeatById).mockResolvedValue(sampleBeat);

        const res = await request(createApp()).get(`/api/beats/${BEAT_ID}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(sampleBeat);
        expect(getBeatById).toHaveBeenCalledWith(BEAT_ID);
    });

    it('returns 404 when beat is not found', async () => {
        vi.mocked(getBeatById).mockResolvedValue(null);

        const res = await request(createApp()).get(`/api/beats/${BEAT_ID}`);

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Beat not found' });
    });

    it('returns 500 when getBeatById throws', async () => {
        vi.mocked(getBeatById).mockRejectedValue(new Error('DB down'));

        const res = await request(createApp()).get(`/api/beats/${BEAT_ID}`);

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Failed to fetch beat' });
    });
});
