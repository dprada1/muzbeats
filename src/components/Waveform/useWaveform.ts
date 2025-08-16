import { useRef, useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useWaveformCache } from '@/context/WaveformContext';
import type { Beat } from '@/types/Beat';

import { useVisibilityGate } from './internal/useVisibilityGate';
import { useWaveSurferInit } from './internal/useWaveSurferInit';
import { useWaveSurferSync } from './internal/useWaveSurferSync';
import { useWaveSurferInteraction } from './internal/useWaveSurferInteraction';
import { useViewportContainerSize } from './internal/useViewportContainerSize';

export interface UseWaveformResult {
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    startTime: number;
    duration: number;
}

/**
 * Orchestrates the Waveform component by composing focused internal hooks.
 *
 * Hooks (why each exists):
 * - Visibility gate (IO): lazily marks the card visible via IntersectionObserver so heavy work is deferred.
 * - WS init/reuse + restore: creates WaveSurfer when visible, reuses cached AudioBuffer, and restores playhead.
 * - Sync with <audio>: mirrors the global <audio> time into the visual cursor and caches the resume position.
 * - Interaction to seek/start: clicking/dragging the waveform seeks the global player (and starts if inactive).
 * - Resize sync: handled by breakpoint-driven remount via layoutKey (no separate redraw hook needed).
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
    const [startTime, setTime] = useState(0);
    const [duration, setDur] = useState(0);

    const isActive = currentBeat?.id === beat.id;

    // ① visibility
    const isVisible = useVisibilityGate(isActive, wrapperRef);

    // Derive a coarse layout key from the wrapper's width; used to remount WS on breakpoint changes.
    const containerSize = useViewportContainerSize();

    // ② init/reuse WS; rebuild when layoutKey changes
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
        containerSize,
    });

    // ③ sync with <audio> (active) or show cached position (inactive)
    useWaveSurferSync({
        wsRef,
        audio: audio ?? null,
        isActive,
        beatId: beat.id,
        positions,
        setPosition,
        duration,
        setTime,
        setDur,
    });

    // ④ click/drag to seek (works active or not)
    useWaveSurferInteraction({
        wsRef,
        audio: audio ?? null,
        isActive,
        beat,
        play,
        setPosition,
        getDur: () => duration,
    });

    return { wrapperRef, startTime, duration };
}
