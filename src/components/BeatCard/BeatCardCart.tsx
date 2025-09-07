import { FaPlay, FaPause, FaTrash } from 'react-icons/fa6';
import { usePlayer } from '@/context/PlayerContext';
import { useCart } from '@/context/CartContext';
import type { Beat } from '@/types/Beat';

interface Props {
    beat: Beat;
}

export default function BeatCardCart({ beat }: Props) {
    const { removeFromCart } = useCart();
    const { play, pause, isPlaying, currentBeat } = usePlayer();
    const active = currentBeat?.id === beat.id && isPlaying;

    return (
        <div className="w-full max-w-full overflow-hidden rounded-2xl bg-[#1e1e1e] p-3 sm:p-4
                        flex items-start gap-3 sm:gap-4">
            {/* Cover + overlay play */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
                <img src={beat.cover} alt={beat.title} className="w-full h-full rounded-xl object-cover" />
                <button
                    aria-label={active ? 'Pause preview' : 'Play preview'}
                    onClick={active ? pause : () => play(beat)}
                    className="absolute inset-0 grid place-items-center rounded-xl
                               bg-black/0 hover:bg-black/20 focus:bg-black/20 transition cursor-pointer"
                >
                    <span className="grid place-items-center rounded-full p-2 bg-black/60 opacity-70
                                     hover:opacity-100 focus:opacity-100 transition">
                        {active ? <FaPause className="text-white text-sm" /> : <FaPlay className="text-white text-sm" />}
                    </span>
                </button>
            </div>

            {/* Right column */}
            <div className="min-w-0 flex-1">
                {/* Title */}
                <h3 className="truncate w-full text-sm sm:text-lg font-semibold">
                    {beat.title}
                </h3>

                {/* Meta + price (left) and Remove (right) */}
                <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="min-w-0 leading-tight">
                        <p className="text-xs sm:text-sm text-zinc-400 truncate">
                            {beat.key} · {beat.bpm} BPM
                        </p>
                        <p className="text-sm sm:text-lg font-semibold mt-1">${beat.price?.toFixed(2)}</p>
                    </div>

                    <button
                        onClick={() => removeFromCart(beat.id)}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-2 rounded-full
                                   bg-[#2a2a2a] text-red-400 hover:bg-[#353535] hover:text-red-300
                                   active:scale-[1.02] transition no-ring cursor-pointer"
                        aria-label="Remove from cart"
                    >
                        <FaTrash className="text-sm" />
                        <span className="text-sm sm:text-base">Remove</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
