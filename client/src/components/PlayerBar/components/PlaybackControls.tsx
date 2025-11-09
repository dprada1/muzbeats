import { usePlayerBarContext } from '@/components/PlayerBar/PlayerBarContext';
import { FaPlay, FaPause, FaStepBackward, FaStepForward } from 'react-icons/fa';
import { FaRepeat } from "react-icons/fa6";
import { formatTime } from '@/utils/formatTime';

const iconButton =
    `p-1 transition no-ring cursor-pointer
    enabled:hover:text-brand-yellow
    disabled:cursor-not-allowed disabled:opacity-40`;

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
        <div className="flex items-center justify-center gap-3 sm:gap-4">
            <span className="pointer-events-none text-sm tabular-nums text-right hidden md:inline">
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
            <span className="pointer-events-none text-sm tabular-nums hidden md:inline">
                {formatTime(duration)}
            </span>
            <button
                onClick={toggleLoop}
                disabled={noTrackLoaded}
                className={`${iconButton + " hidden sm:flex"} ${
                    isLoop ? 'text-brand-yellow' : 'text-gray-400'
                }`}
            >
                <FaRepeat size={20} />
            </button>
        </div>
    );
}
