import type { Beat } from '../types/Beat';
import { FaPlay, FaPause, FaShoppingCart } from 'react-icons/fa';
import { usePlayer } from '../context/PlayerContext';

type Props = {
    beat: Beat;
    onAddToCart: (beat: Beat) => void;
};

export default function BeatCard({ beat, onAddToCart }: Props) {
    const { currentBeat, isPlaying, play, pause } = usePlayer();
    const isThisPlaying = currentBeat?.id === beat.id && isPlaying;

    const handleTogglePlay = () => {
        if (isThisPlaying) {
            pause();
        } else {
            play(beat);
        }
    };

    return (
        <div className="bg-zinc-900 text-white rounded-xl shadow-md p-4 flex gap-4 w-full max-w-4xl mx-auto">
            {/* LEFT: Cover Art */}
            <img
                src={beat.cover}
                alt={beat.title}
                className="w-28 h-28 md:w-32 md:h-32 rounded-lg object-cover"
            />

            {/* RIGHT: Content */}
            <div className="flex flex-col justify-between flex-1">
                {/* Title & Key/BPM */}
                <div>
                    <h3 className="text-lg font-semibold text-brand-yellow break-words leading-snug">
                        {beat.title}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                        {beat.key} • {beat.bpm} BPM
                    </p>
                </div>

                {/* Play + Waveform */}
                <div className="flex items-center gap-4 mt-3">
                    <button
                        onClick={handleTogglePlay}
                        className="text-white bg-zinc-700 hover:bg-brand-yellow hover:text-black p-2 rounded-full transition"
                    >
                        {isThisPlaying ? <FaPause /> : <FaPlay />}
                    </button>

                    <div className="flex-1 h-10 bg-zinc-800 rounded text-zinc-400 flex items-center justify-center text-sm">
                        Waveform will go here
                    </div>
                </div>

                {/* Price + Cart */}
                <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-medium">${beat.price.toFixed(2)}</span>

                    <button
                        onClick={() => onAddToCart(beat)}
                        className="flex items-center gap-2 border border-brand-yellow text-brand-yellow hover:bg-brand-yellow hover:text-black px-4 py-2 rounded-full text-sm transition"
                    >
                        <FaShoppingCart />
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
}
