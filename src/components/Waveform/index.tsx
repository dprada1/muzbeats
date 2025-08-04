import useWaveform, { type UseWaveformResult } from './useWaveform';
import { formatTime } from '@/utils/formatTime';
import type { Beat } from '@/types/Beat';

export default function Waveform(props: { beat: Beat }) {
    const { wrapperRef, time, dur }: UseWaveformResult = useWaveform(props.beat);

    return (
        <div ref={wrapperRef} className="relative w-full h-16 rounded">
            {dur > 0 && (
                <>
                <span
                    className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 z-20
                                text-[11px] bg-black/75 text-gray-200 px-1 rounded"
                >
                    {formatTime(time)}
                </span>
                <span
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 z-20
                                text-[11px] bg-black/75 text-gray-200 px-1 rounded"
                >
                    {formatTime(dur)}
                </span>
                </>
            )}
        </div>
    );
}
