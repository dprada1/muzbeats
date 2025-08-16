import useWaveform, { type UseWaveformResult } from './useWaveform';
import { formatTime } from '@/utils/formatTime';
import type { Beat } from '@/types/Beat';

export default function Waveform(props: { beat: Beat }) {
    const { wrapperRef, startTime, duration }: UseWaveformResult = useWaveform(props.beat);

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
