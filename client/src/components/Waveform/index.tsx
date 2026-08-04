import useWaveform, { type UseWaveformResult } from './useWaveform';
import { formatTime } from '@/utils/formatTime';
import type { Beat } from '@/types/Beat';
import { useEffect, useRef } from 'react';

export type WaveformReadyResult = {
    /** True when the MP3 decoded successfully; false after a settled load failure. */
    isAudioAvailable: boolean;
};

export type WaveformProps = {
    beat: Beat;
    /** When false, WaveSurfer init is deferred unless this beat is the active player track. Defaults to true. */
    isVisible?: boolean;
    /** Fired once per beat when load settles (success or failure). */
    onReady?: (result: WaveformReadyResult) => void;
};

/**
 * Visual waveform for a beat (WaveSurfer), or a “Preview unavailable” state when
 * the MP3 cannot be loaded. Composes {@link useWaveform} for init/sync/seek.
 * Calls `onReady` once after settle so parents can gate UI / clear skeletons.
 *
 * @param beat - Beat whose audio URL and id drive load and cache
 * @param isVisible - Whether the waveform should load (default true)
 * @param onReady - Optional one-shot callback with `{ isAudioAvailable }`
 */
export default function Waveform({ beat, isVisible = true, onReady }: WaveformProps) {
    const {
        wrapperRef,
        startTime,
        duration,
        hasLoadSettled,
        isAudioAvailable,
    }: UseWaveformResult = useWaveform(beat, isVisible);
    const hasCalledReady = useRef(false);
    
    // Unblock LazyBeatCardStore once waveform load finishes (success or 404/CORS failure).
    useEffect(() => {
        if (hasLoadSettled && onReady && !hasCalledReady.current) {
            hasCalledReady.current = true;
            onReady({ isAudioAvailable });
        }
    }, [hasLoadSettled, isAudioAvailable, onReady, beat.id]);
    
    // Reset when beat changes
    useEffect(() => {
        hasCalledReady.current = false;
    }, [beat.id]);

    const isPreviewUnavailable = hasLoadSettled && !isAudioAvailable;

    return (
        <div
            className={`relative min-w-0 w-full h-12 sm:h-16 rounded-lg ${
                isPreviewUnavailable
                    ? 'bg-zinc-800/80 ring-1 ring-inset ring-zinc-600'
                    : 'overflow-hidden'
            }`}
        >
            {/* Keep WS container mounted even on failure so cleanup/destroy stays correct */}
            <div
                ref={wrapperRef}
                className={`absolute inset-0 ${isPreviewUnavailable ? 'invisible' : ''}`}
                aria-hidden={isPreviewUnavailable}
            />

            {isPreviewUnavailable ? (
                <div
                    className="absolute inset-0 flex items-center justify-center px-2"
                    role="status"
                    aria-live="polite"
                >
                    <span className="text-[11px] sm:text-xs text-zinc-400 text-center leading-snug">
                        Preview unavailable (MP3 not found). Please contact support.
                    </span>
                </div>
            ) : (
                duration > 0 && (
                    <>
                        <span
                            className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 z-20
                                        text-[11px] bg-black/75 text-gray-200 px-1 rounded"
                        >
                            {formatTime(startTime)}
                        </span>
                        <span
                            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 z-20
                                        text-[11px] bg-black/75 text-gray-200 px-1 rounded"
                        >
                            {formatTime(duration)}
                        </span>
                    </>
                )
            )}
        </div>
    );
}
