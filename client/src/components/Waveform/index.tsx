import useWaveform, { type UseWaveformResult } from './useWaveform';
import { formatTime } from '@/utils/formatTime';
import type { Beat } from '@/types/Beat';
import { useEffect, useRef } from 'react';

export type WaveformProps = {
    beat: Beat;
    isVisible?: boolean;
    onReady?: () => void;
};

export default function Waveform({ beat, isVisible = true, onReady }: WaveformProps) {
    const { wrapperRef, startTime, duration }: UseWaveformResult = useWaveform(beat, isVisible);
    const hasCalledReady = useRef(false);
    
    // Call onReady when waveform has loaded (duration > 0 indicates it's ready)
    // Only call once per beat
    useEffect(() => {
        if (duration > 0 && onReady && !hasCalledReady.current) {
            hasCalledReady.current = true;
            onReady();
        }
    }, [duration, onReady, beat.id]);
    
    // Reset when beat changes
    useEffect(() => {
        hasCalledReady.current = false;
    }, [beat.id]);

    return (
        <div
            ref={wrapperRef}
            className="relative min-w-0 w-full h-12 sm:h-16 rounded overflow-hidden"
        >
            {duration > 0 && (
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
            )}
        </div>
    );
}
