import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { FaPlay, FaPause, FaRepeat, FaVolumeHigh } from 'react-icons/fa6';
import { FaStepForward, FaStepBackward } from "react-icons/fa";
import { usePlayer } from '../context/PlayerContext';
import AddToCartButton from './AddToCartButton';

// Formats time as MM:SS
const fmt = (t = 0) => {
    if (!Number.isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60)
        .toString()
        .padStart(2, '0');
    return `${m}:${s}`;
};

export default function PlayerBar() {
    const { currentBeat, isPlaying, toggle, audio } = usePlayer();

    // Time duration
    const [time, setTime] = useState(0);
    const [dur, setDur] = useState(0);

    useEffect(() => {
        if (!audio) return;

        // Sync once on new track
        setTime(audio.currentTime);
        setDur(audio.duration || 0);

        const handleTime = () => setTime(audio.currentTime);
        const handleMeta = () => setDur(audio.duration || 0);

        audio.addEventListener('timeupdate', handleTime);
        audio.addEventListener('loadedmetadata', handleMeta);
        return () => {
            audio.removeEventListener('timeupdate', handleTime);
            audio.removeEventListener('loadedmetadata', handleMeta);
        };
    }, [audio, currentBeat]);

    // Seek bar click
    const barRef = useRef<HTMLDivElement>(null);
    const seek = (e: MouseEvent<HTMLDivElement>) => {
        if (!audio || !barRef.current || !dur) return;

        const { left, width } = barRef.current.getBoundingClientRect();
        const pct = (e.clientX - left) / width;
        audio.currentTime = pct * dur;
    };

    // Volume slider
    const [vol, setVol] = useState(1);
    const changeVol = (v: number) => {
        if (audio) audio.volume = v;
        setVol(v);
    };

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
                {/* thumbnail ------------------------------------------------------ */}
                {currentBeat?.cover && (
                <img
                    src={currentBeat.cover}
                    alt={currentBeat.title}
                    className="h-12 w-12 rounded object-cover"
                />
                )}

                {/* track info ----------------------------------------------------- */}
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

                {/* controls ------------------------------------------------------- */}
                <div className="flex items-center gap-4 mx-auto">
                    <button className="p-1 hover:opacity-75 cursor-pointer no-ring">
                        <FaStepBackward size={18} />
                    </button>

                    <button
                        onClick={toggle}
                        disabled={!currentBeat}
                        className="p-1 hover:opacity-75 cursor-pointer no-ring"
                    >
                        {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
                    </button>

                    <button className="p-1 hover:opacity-75 cursor-pointer no-ring">
                        <FaStepForward size={18} />
                    </button>

                    <button className="p-1 hover:opacity-75 cursor-pointer no-ring">
                        <FaRepeat size={18} />
                    </button>

                    {/* time ------------------------------------------------------- */}
                    <span className="text-sm tabular-nums w-14 text-right">
                        {fmt(time)}
                    </span>
                    <span className="text-sm opacity-60">/</span>
                    <span className="text-sm tabular-nums w-14">{fmt(dur)}</span>
                </div>

                {/* volume -------------------------------------------------------- */}
                <div className="flex items-center gap-2">
                    <FaVolumeHigh className="shrink-0" />
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={vol}
                        onChange={(e) => changeVol(parseFloat(e.target.value))}
                        className="w-24 accent-white no-ring"
                    />
                </div>

                {/* price + cart --------------------------------------------------- */}
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
