import {
    useEffect,
    useRef,
    useState,
    type MouseEvent,
} from 'react';
import {
    FaPlay,
    FaPause,
    FaRepeat,
} from 'react-icons/fa6';
import {
    FaStepBackward,
    FaStepForward,
} from 'react-icons/fa';
import {
    MdVolumeDown,
    MdVolumeOff,
    MdVolumeUp,
} from 'react-icons/md';

import { usePlayer } from '../context/PlayerContext';
import { useSearch } from '../context/SearchContext';
import AddToCartButton from './AddToCartButton';

/* ------------------------------ helpers ------------------------------ */
const fmt = (t = 0) => {
    if (!Number.isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60)
        .toString()
        .padStart(2, '0');
    return `${m}:${s}`;
};

/* ================================ component ================================ */
export default function PlayerBar() {
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

    const nothingLoaded = !currentBeat;

    /* ----------- skip logic ----------- */
    const idx = currentBeat ? beats.findIndex((b) => b.id === currentBeat.id) : -1;
    const prevBeat = idx > 0 ? beats[idx - 1] : null;
    const nextBeat = idx !== -1 && idx < beats.length - 1 ? beats[idx + 1] : null;

    const skipPrev = () => prevBeat && play(prevBeat);
    const skipNext = () => nextBeat && play(nextBeat);

    /* ----------- timing ----------- */
    const [time, setTime] = useState(0);
    const [dur, setDur] = useState(0);

    useEffect(() => {
        if (!audio) return;
        const onTime = () => setTime(audio.currentTime);
        const onMeta = () => setDur(audio.duration || 0);

        onMeta();
        onTime();

        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('loadedmetadata', onMeta);
        return () => {
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('loadedmetadata', onMeta);
        };
    }, [audio, currentBeat]);

    /* ----------- seek bar ----------- */
    const barRef = useRef<HTMLDivElement>(null);
    const seek = (e: MouseEvent<HTMLDivElement>) => {
        if (!audio || !barRef.current || !dur) return;
        const { left, width } = barRef.current.getBoundingClientRect();
        const pct = (e.clientX - left) / width;
        audio.currentTime = pct * dur;
    };

    /* ----------- volume ----------- */
    const [vol, setVol] = useState(1);
    const [muted, setMuted] = useState(false);
    const prevVol = useRef(1);

    const changeVol = (v: number) => {
        if (!audio) return;
        audio.volume = v;
        audio.muted = v === 0;
    };

    const toggleMute = () => {
        if (!audio) return;
        if (audio.muted || audio.volume === 0) {
            audio.muted = false;
            audio.volume = prevVol.current || 0.5;
        } else {
            prevVol.current = audio.volume;
            audio.muted = true;
        }
    };

    useEffect(() => {
        if (!audio) return;
        const onVol = () => {
            setVol(audio.volume);
            setMuted(audio.muted);
        };
        onVol();
        audio.addEventListener('volumechange', onVol);
        return () => audio.removeEventListener('volumechange', onVol);
    }, [audio]);

    let VolIcon;
    if (muted || vol === 0) VolIcon = MdVolumeOff;
    else if (vol <= 0.5) VolIcon = MdVolumeDown;
    else VolIcon = MdVolumeUp;

    /* ----------- shared btn style ----------- */
    const btnBase = 'p-1 transition no-ring disabled:opacity-40 disabled:pointer-events-none';

    /* ---------------------------- JSX ---------------------------- */
    return (
        <div className="fixed bottom-0 left-0 w-full bg-[#121212] text-white shadow-t z-50 h-20">
            {/* top progress bar */}
            <div
                ref={barRef}
                onClick={seek}
                className="h-1 w-full cursor-pointer bg-zinc-700"
            >
            <div
                className="h-full bg-white"
                style={{ width: dur ? `${(time / dur) * 100}%` : '0%' }}
            />
            </div>

            {/* main row */}
            <div className="flex items-center gap-4 px-4 py-3">
                {/* thumbnail */}
                {currentBeat?.cover && (
                    <img
                    src={currentBeat.cover}
                    alt={currentBeat.title}
                    className="h-12 w-12 rounded object-cover"
                    />
                )}

                {/* track info */}
                <div className="min-w-0">
                    <div className="truncate font-semibold">
                        {currentBeat ? currentBeat.title : 'No track loaded'}
                    </div>
                    {currentBeat?.key && (
                        <div className="text-xs text-gray-400">
                            {currentBeat.key} • {currentBeat.bpm} BPM
                        </div>
                    )}
                </div>

                {/* controls */}
                <div className="flex items-center gap-4 mx-auto">
                    <button
                        onClick={skipPrev}
                        disabled={nothingLoaded || !prevBeat}
                        className={`${btnBase} hover:text-brand-yellow`}
                    >
                        <FaStepBackward size={18} />
                    </button>

                    <button
                        onClick={toggle}
                        disabled={nothingLoaded}
                        className={`${btnBase} hover:text-brand-yellow`}
                    >
                        {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
                    </button>

                    <button
                        onClick={skipNext}
                        disabled={nothingLoaded || !nextBeat}
                        className={`${btnBase} hover:text-brand-yellow`}
                    >
                        <FaStepForward size={18} />
                    </button>

                    <button
                        onClick={toggleLoop}
                        disabled={nothingLoaded}
                        className={`${btnBase} ${isLoop ? 'text-brand-yellow' : 'text-gray-400'}`}
                    >
                        <FaRepeat size={18} />
                    </button>

                    {/* time */}
                    <span className="text-sm tabular-nums w-14 text-right">
                        {fmt(time)}
                    </span>
                    <span className="text-sm opacity-60">/</span>
                    <span className="text-sm tabular-nums w-14">{fmt(dur)}</span>
                </div>

                {/* volume */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleMute}
                        disabled={nothingLoaded}
                        className={`${btnBase} hover:text-brand-yellow`}
                    >
                        <VolIcon size={24} />
                    </button>

                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={vol}
                        disabled={nothingLoaded}
                        onChange={(e) => changeVol(parseFloat(e.target.value))}
                        className={`seek accent-white w-24 no-ring ${
                            nothingLoaded ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                        }`}
                    />
                </div>

                {/* price + cart */}
                {currentBeat && (
                    <div className="flex items-center gap-3 pl-4">
                        {currentBeat.price && (
                            <span className="font-medium">${currentBeat.price}</span>
                        )}
                        <AddToCartButton beat={currentBeat} />
                    </div>
                )}
            </div>
        </div>
    );
}
