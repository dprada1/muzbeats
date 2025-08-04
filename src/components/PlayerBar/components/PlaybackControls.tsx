import { usePlayerBarContext } from '@/components/PlayerBar/PlayerBarContext';
import { FaPlay, FaPause, FaStepBackward, FaStepForward } from 'react-icons/fa';
import { FaRepeat } from "react-icons/fa6";
import { formatTime } from '@/utils/formatTime';

const iconButton =
    'p-1 transition no-ring disabled:opacity-40 disabled:pointer-events-none hover:text-brand-yellow cursor-pointer';

export default function PlaybackControls() {
    const {
        currentTime,
        duration,
        isPlaying,
        togglePlay,
        skipPrevious,
        skipNext,
        isLoop,
        toggleLoop,
        noTrackLoaded,
        canSkipPrevious,
        canSkipNext,
    } = usePlayerBarContext();

    return (
        <div className="flex items-center justify-center gap-2 sm:gap-4">
            <span className="text-sm tabular-nums w-[48px] text-right hidden sm:inline">
                {formatTime(currentTime)}
            </span>
            <button
                onClick={skipPrevious}
                disabled={noTrackLoaded || !canSkipPrevious}
                className={iconButton}
            >
                <FaStepBackward size={24} />
            </button>
            <button
                onClick={togglePlay}
                disabled={noTrackLoaded}
                className={iconButton}
            >
                {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} />}
            </button>
            <button
                onClick={skipNext}
                disabled={noTrackLoaded || !canSkipNext}
                className={iconButton}
            >
                <FaStepForward size={24} />
            </button>
            <span className="text-sm tabular-nums w-[48px] hidden sm:inline">
                {formatTime(duration)}
            </span>
            <button
                onClick={toggleLoop}
                disabled={noTrackLoaded}
                className={`${iconButton} ${
                    isLoop ? 'text-brand-yellow' : 'text-gray-400'
                }`}
            >
                <FaRepeat size={20} />
            </button>
        </div>
    );
}
