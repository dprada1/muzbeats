import { useRef, useState, useEffect } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useWaveformCache } from '@/context/WaveformContext';
import type { Beat } from '@/types/Beat';

import { useWaveSurferInit } from './internal/useWaveSurferInit';
import { useWaveSurferSync } from './internal/useWaveSurferSync';
import { useWaveSurferInteraction } from './internal/useWaveSurferInteraction';
import { useViewportContainerSize, type ContainerSize } from './internal/useViewportContainerSize';

export interface UseWaveformResult {
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    startTime: number;
    duration: number;
    /** True after waveform load succeeds or fails (never hangs the beat card skeleton). */
    hasLoadSettled: boolean;
    /** True when MP3 decoded successfully; false after a settled load failure. */
    isAudioAvailable: boolean;
}

/**
 * Orchestrates the Waveform component by composing focused internal hooks.
 *
 * Hooks (why each exists):
 * - WS init/reuse + restore: creates WaveSurfer when visible, reuses cached AudioBuffer, and restores playhead.
 * - Sync with <audio>: mirrors the global <audio> time into the visual cursor and caches the resume position.
 * - Interaction to seek/start: clicking/dragging the waveform seeks the global player (and starts if inactive).
 * - Resize sync: handled by breakpoint-driven remount via layoutKey (no separate redraw hook needed).
 *
 * @param {Beat} beat
 * The beat whose waveform should render; used for ids, audio URL, and cache lookups.
 * @param {boolean} isVisible
 * Whether the waveform should be visible/loaded (controlled by parent component).
 *
 * @returns {{ wrapperRef, startTime, duration, hasLoadSettled, isAudioAvailable }}
 */
export default function useWaveform(beat: Beat, isVisible: boolean = true): UseWaveformResult {
    const { audio, currentBeat, play } = usePlayer();
    const { buffers, cacheAudioBuffer, positions, saveResumePosition } = useWaveformCache();

    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [startTime, setTime] = useState(0);
    const [duration, setDur] = useState(0);
    const [hasLoadSettled, setHasLoadSettled] = useState(false);
    const [isAudioAvailable, setIsAudioAvailable] = useState(false);

    useEffect(() => {
        setHasLoadSettled(false);
        setIsAudioAvailable(false);
    }, [beat.id]);

    const isCurrentBeatInPlayer: boolean = currentBeat?.id === beat.id;
    
    // Use isVisible prop (parent controls visibility via IntersectionObserver)
    // Always consider active beats visible
    const shouldLoadWaveSurfer: boolean = isVisible || isCurrentBeatInPlayer;

    // Derive a coarse layout key from the wrapper's width; used to remount WS on breakpoint changes.
    const containerSize: ContainerSize = useViewportContainerSize();

    // init/reuse WS; rebuild when layoutKey changes
    const wsRef = useWaveSurferInit({
        isVisible: shouldLoadWaveSurfer,
        wrapperRef,
        beat,
        isCurrentBeatInPlayer,
        audio: audio ?? null,
        buffers,
        positions,
        cacheAudioBuffer,
        onSettled: (result) => {
            setDur(result.duration);
            setTime(result.time);
            setIsAudioAvailable(result.isAudioAvailable);
            setHasLoadSettled(true);
        },
        containerSize,
    });

    // sync with <audio> (active) or show cached position (inactive)
    useWaveSurferSync({
        wsRef,
        audio: audio ?? null,
        isCurrentBeatInPlayer,
        beatId: beat.id,
        beatAudioUrl: beat.audio,
        positions,
        saveResumePosition,
        duration,
        setTime,
        setDur,
    });

    // click/drag to seek (works active or not)
    useWaveSurferInteraction({
        wsRef,
        audio: audio ?? null,
        isCurrentBeatInPlayer,
        beat,
        play,
        saveResumePosition,
        getDur: () => duration,
    });

    return {
        wrapperRef,
        startTime,
        duration,
        hasLoadSettled,
        isAudioAvailable
    };
}
