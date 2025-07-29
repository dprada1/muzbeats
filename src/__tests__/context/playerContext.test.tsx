import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { PlayerProvider, usePlayer } from '../../context/PlayerContext';
import type { Beat } from '../../types/Beat';

/**
 * Flush pending useEffect calls by awaiting a resolved promise in act.
 */
const flushEffects = async (): Promise<void> => {
    await act(async () => Promise.resolve());
};

beforeAll(() => {
    vi.spyOn(Audio.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(Audio.prototype, 'pause').mockImplementation(() => {});
});

afterAll(() => vi.restoreAllMocks());

describe('PlayerContext', () => {
    beforeEach(() => vi.clearAllMocks());

    // Provide PlayerContext for hook testing
    const wrapper = ({ children }: { children?: React.ReactNode }) => (
        <PlayerProvider>{children}</PlayerProvider>
    );

    const beat: Beat = {
        id: '1',
        title: 'Test Beat',
        key: 'Cmaj',
        bpm: 100,
        price: 1,
        audio: '/test.mp3',
        cover: '/test.webp',
    };

    it('exposes default state', async () => {
        const { result } = renderHook(() => usePlayer(), { wrapper });
        await flushEffects();

        expect(result.current.currentBeat).toBeNull();
        expect(result.current.isPlaying).toBe(false);
        expect(result.current.isLoop).toBe(false);
        expect(result.current.audio).toBeNull();
    });

    it('play() sets track and starts playback', async () => {
        const { result } = renderHook(() => usePlayer(), { wrapper });
        await flushEffects();
        vi.clearAllMocks();

        await act(async () => result.current.play(beat));

        expect(result.current.currentBeat).toEqual(beat);
        expect(result.current.isPlaying).toBe(true);
        expect(Audio.prototype.play).toHaveBeenCalledTimes(1);
        expect(result.current.audio?.src).toContain(beat.audio);
    });

    it('pause() stops playback', async () => {
        const { result } = renderHook(() => usePlayer(), { wrapper });
        await flushEffects();
        vi.clearAllMocks();

        await act(async () => {
            result.current.play(beat);
            result.current.pause();
        });

        expect(result.current.isPlaying).toBe(false);
        expect(Audio.prototype.pause).toHaveBeenCalledTimes(1);
    });

    it('toggle() switches play and pause correctly', async () => {
        const { result } = renderHook(() => usePlayer(), { wrapper });
        await flushEffects();

        await act(async () => result.current.play(beat));
        await flushEffects();
        vi.clearAllMocks();

        await act(async () => result.current.toggle());
        expect(Audio.prototype.pause).toHaveBeenCalledTimes(1);

        vi.clearAllMocks();
        await act(async () => result.current.toggle());
        expect(Audio.prototype.play).toHaveBeenCalledTimes(1);
    });

    it('toggleLoop() flips loop state on audio', async () => {
        const { result } = renderHook(() => usePlayer(), { wrapper });
        await flushEffects();
        vi.clearAllMocks();

        const before = result.current.isLoop;
        act(() => result.current.toggleLoop());
        expect(result.current.isLoop).toBe(!before);
        expect(result.current.audio?.loop).toBe(result.current.isLoop);
    });

    it('throws when usePlayer is used outside PlayerProvider', () => {
        expect(() => renderHook(() => usePlayer())).toThrow(
            'usePlayer must be used inside <PlayerProvider>'
        );
    });
});
