import { useEffect, useRef, useState } from 'react';
import { FaPlay, FaPause, FaRepeat } from 'react-icons/fa6';
import { FaStepBackward, FaStepForward } from 'react-icons/fa';
import { MdVolumeDown, MdVolumeOff, MdVolumeUp } from 'react-icons/md';
import { usePlayer } from '../context/PlayerContext';
import { useSearch } from '../context/SearchContext';
import { formatTime } from '../utils/formatTime';
import AddToCartButton from './AddToCartButton';

export default function PlayerBar() {
    /* ---------- context ---------- */
    const {
        currentBeat,
        isPlaying,
        play,
        toggle,
        isLoop,
        toggleLoop,
        audio,
    } = usePlayer();
    const { beats } = useSearch();
    const noTrackLoaded = !currentBeat;

    /* ---------- skip logic ---------- */
    const currentIndex = currentBeat ? beats.findIndex(b => b.id === currentBeat.id) : -1;
    const previousBeat = currentIndex > 0 ? beats[currentIndex - 1] : null;
    const nextBeat = currentIndex !== -1 && currentIndex < beats.length - 1 ? beats[currentIndex + 1] : null;

    const skipPrevious = () => previousBeat && play(previousBeat);
    const skipNext = () => nextBeat && play(nextBeat);

    /* ---------- timing ---------- */
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!audio) return;

        const handleTime = () => setCurrentTime(audio.currentTime);
        const handleMeta = () => setDuration(audio.duration || 0);

        handleTime();
        handleMeta();

        audio.addEventListener('timeupdate', handleTime);
        audio.addEventListener('loadedmetadata', handleMeta);
        return () => {
            audio.removeEventListener('timeupdate', handleTime);
            audio.removeEventListener('loadedmetadata', handleMeta);
        };
    }, [audio, currentBeat]);

    /* ---------- seek bar ---------- */
    const barRef = useRef<HTMLDivElement>(null);

    /* ---------- volume ---------- */
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const previousVolume = useRef(1);

    const applyVolume = (v: number) => {
        if (!audio) return;
        audio.volume = v;
        audio.muted = v === 0;
    };

    const toggleMute = () => {
        if (!audio) return;
        if (audio.muted || audio.volume === 0) {
            audio.muted = false;
            audio.volume = previousVolume.current || 0.5;
        } else {
            previousVolume.current = audio.volume;
            audio.muted = true;
        }
    };

    useEffect(() => {
        if (!audio) return;
        const syncVolume = () => {
            setVolume(audio.volume);
            setIsMuted(audio.muted);
        };
        syncVolume();
        audio.addEventListener('volumechange', syncVolume);
        return () => audio.removeEventListener('volumechange', syncVolume);
    }, [audio]);

    let VolumeIcon = MdVolumeUp;
    if (isMuted || volume === 0) VolumeIcon = MdVolumeOff;
    else if (volume <= 0.5) VolumeIcon = MdVolumeDown;

    /* ---------- shared styles ---------- */
    const iconButton =
        'p-1 transition no-ring disabled:opacity-40 disabled:pointer-events-none hover:text-brand-yellow cursor-pointer';

    /* ---------- render ---------- */
    return (
        <div className="fixed bottom-0 left-0 w-full bg-[#121212] text-white shadow-t z-50 h-20">
            {/* progress bar */}
            <div ref={barRef} className="relative h-1 w-full bg-zinc-700">
                {/* filled portion */}
                <div
                    className="absolute inset-0 bg-white pointer-events-none"
                    style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                />
                {/* invisible range captures drag / hover */}
                <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.01}
                    value={currentTime}
                    onChange={(e) => audio && (audio.currentTime = +e.target.value)}
                    disabled={noTrackLoaded}
                    className={`progress accent-white no-ring range-thumb absolute inset-0 w-full h-full bg-transparent ${
                        noTrackLoaded ? 'cursor-not-allowed opacity-0' : 'cursor-pointer'
                    }`}
                />
            </div>

            {/* 3-column grid */}
            <div className="grid grid-cols-[320px_1fr_320px] items-center h-[calc(5rem-0.25rem)] px-4 gap-4">
                {/* left – metadata */}
                <div className="flex items-center gap-4 overflow-hidden">
                    {currentBeat?.cover && (
                        <img
                            src={currentBeat.cover}
                            alt={currentBeat.title}
                            className="h-12 w-12 rounded object-cover shrink-0"
                        />
                    )}
                    <div className="min-w-0">
                        <div className="truncate font-semibold">
                            {currentBeat ? currentBeat.title : 'No track loaded'}
                        </div>
                        {currentBeat?.key && (
                            <div className="text-xs text-gray-400 truncate">
                                {currentBeat.key} • {currentBeat.bpm} BPM
                            </div>
                        )}
                    </div>
                </div>

                {/* centre – controls */}
                <div className="flex items-center justify-center gap-4">
                    <span className="text-sm tabular-nums w-[48px] text-right">
                        {formatTime(currentTime)}
                    </span>

                    <button
                        onClick={skipPrevious}
                        disabled={noTrackLoaded || !previousBeat}
                        className={iconButton}
                    >
                        <FaStepBackward size={24} />
                    </button>

                    <button
                        onClick={toggle}
                        disabled={noTrackLoaded}
                        className={`${iconButton} text-lg`}
                    >
                        {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} />}
                    </button>

                    <button
                        onClick={skipNext}
                        disabled={noTrackLoaded || !nextBeat}
                        className={iconButton}
                    >
                        <FaStepForward size={24} />
                    </button>

                    <span className="text-sm tabular-nums w-[48px]">
                        {formatTime(duration)}
                    </span>

                    <button
                        onClick={toggleLoop}
                        disabled={noTrackLoaded}
                        className={`${iconButton} ${isLoop ? 'text-brand-yellow' : 'text-gray-400'}`}
                    >
                        <FaRepeat size={20} />
                    </button>
                </div>

                {/* right – volume + cart */}
                <div className="flex items-center gap-3 justify-end">
                    <button
                        onClick={toggleMute}
                        disabled={noTrackLoaded}
                        className={iconButton}
                    >
                        <VolumeIcon size={28} />
                    </button>

                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        disabled={noTrackLoaded}
                        onChange={(e) => applyVolume(parseFloat(e.target.value))}
                        className={`range-thumb accent-white w-24 no-ring ${
                            noTrackLoaded ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                        }`}
                    />

                    {currentBeat && (
                        <div className="flex items-center gap-3">
                            {currentBeat.price && (
                                <span className="font-medium">${currentBeat.price}</span>
                            )}
                            <AddToCartButton beat={currentBeat} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
