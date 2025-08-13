import { useRef, useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useWaveformCache } from '@/context/WaveformContext';
import type { Beat } from '@/types/Beat';

import { useVisibilityGate } from './internal/useVisibilityGate';
import { useWaveSurferInit } from './internal/useWaveSurferInit';
import { useWaveSurferSync } from './internal/useWaveSurferSync';
import { useWaveSurferInteraction } from './internal/useWaveSurferInteraction';
import { useWaveSurferResize } from './internal/useWaveSurferResize';

export interface UseWaveformResult {
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    time: number;
    dur: number;
}

/**
 * Orchestrates the Waveform component by composing focused internal hooks:
 * - Visibility gate (IO): lazily marks the card visible via IntersectionObserver so heavy work is deferred.
 * - WS init/reuse + restore: creates WaveSurfer when visible, reuses cached AudioBuffer, and restores playhead.
 * - Sync with global audio: mirrors the global audio time into the visual cursor and caches the resume position.
 * - Interaction to seek/start: clicking/dragging the waveform seeks the global player (and starts if inactive).
 * - Resize sync: keeps the WS canvas aligned to its container when screen size changes.
 *
 * @param {Beat} beat
 *   The beat whose waveform should render; used for ids, audio URL, and cache lookups.
 *
 * @returns {{ wrapperRef: React.RefObject<HTMLDivElement|null>, time: number, dur: number }}
 *   - wrapperRef: attach to the waveform container div.
 *   - time: current time (seconds) for the left badge.
 *   - dur: total duration (seconds) for the right badge.
 */
export default function useWaveform(beat: Beat): UseWaveformResult {
    const { audio, currentBeat, play } = usePlayer();
    const { buffers, setBuffer, positions, setPosition } = useWaveformCache();

    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [time, setTime] = useState(0);
    const [dur, setDur] = useState(0);

    const isActive = currentBeat?.id === beat.id;

    // 1. Lazy visibility
    const isVisible = useVisibilityGate(isActive, wrapperRef);

    // 2. Create/reuse WS instance + restore position
    const wsRef = useWaveSurferInit({
        isVisible,
        wrapperRef,
        beat,
        isActive,
        audio: audio ?? null,
        buffers,
        positions,
        setBuffer,
        onReady: (duration, now) => { setDur(duration); setTime(now); },
    });

    // 3. Follow <audio> (active) or show cached position (inactive)
    useWaveSurferSync({
        wsRef,
        audio: audio ?? null,
        isActive,
        beatId: beat.id,
        positions,
        setPosition,
        dur,
        setTime,
        setDur,
    });

    // 4. Click/drag to seek (works active or not)
    useWaveSurferInteraction({
        wsRef,
        audio: audio ?? null,
        isActive,
        beat,
        play,
        setPosition,
        getDur: () => dur,
    });

    // 5. Keep canvas in sync with container size (prevents overflow on small screens)
    useWaveSurferResize(wsRef, wrapperRef);

    return { wrapperRef, time, dur };
}
