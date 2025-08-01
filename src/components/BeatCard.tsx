import type { Beat } from '@/types/Beat';
import { FaPlay, FaPause } from 'react-icons/fa';
import { usePlayer } from '@/context/PlayerContext';
import Waveform from './Waveform';
import AddToCartButton from './AddToCartButton';
import { ShareBeatButton } from './ShareBeatButton';
import { useWaveformCache } from '@/context/WaveformContext';

type Props = {
    beat: Beat;
};

export default function BeatCard({ beat }: Props) {
    const { currentBeat, isPlaying, play, pause } = usePlayer();
    const { positions } = useWaveformCache();
    const isThisPlaying = currentBeat?.id === beat.id && isPlaying;

    // Look up last-saved time for this beat
    const lastPos = positions[beat.id] ?? 0;

    const handleTogglePlay = () => {
        if (isThisPlaying) {
            pause();
        } else {
            play(beat, lastPos);
        }
    };

    return (
        <div className="bg-card-bg text-white rounded-xl shadow-md p-4 flex gap-4 w-full max-w-4xl mx-auto">
            {/* LEFT: Cover Art */}
            <img
                src={beat.cover}
                alt={beat.title}
                className="w-28 h-28 md:w-36 md:h-36 rounded-lg object-cover"
            />

            {/* RIGHT: Content */}
            <div className="flex flex-col justify-between flex-1">
                {/* Title & Key/BPM */}
                <div>
                    <h3 className="text-lg font-semibold text-white break-words leading-snug">
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
                        className="text-card-bg bg-white hover:opacity-75 hover:text-black p-3 rounded-full transition cursor-pointer no-ring"
                    >
                        {isThisPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                    <Waveform beat={beat} />
                </div>

                {/* Price + Cart + Share*/}
                <div className="flex items-center gap-3 mt-3">
                    <span className="text-sm font-medium">${beat.price.toFixed(2)}</span>
                    <AddToCartButton beat={beat} />
                    <ShareBeatButton 
                        url={`${window.location.origin}/store/beat/${beat.id}`}
                        title={beat.title}
                    />
                </div>
            </div>
        </div>
    );
}
