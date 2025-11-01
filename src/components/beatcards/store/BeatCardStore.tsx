import type { Beat } from '@/types/Beat';
import { FaPlay, FaPause } from 'react-icons/fa';
import { usePlayer } from '@/context/PlayerContext';
import Waveform from '@/components/Waveform';
import AddToCartButton from '@/components/buttons/AddToCartButton';
import { ShareBeatButton } from '@/components/buttons/ShareBeatButton';
import { useWaveformCache } from '@/context/WaveformContext';

type Props = {
    beat: Beat;
    onWaveformReady?: () => void;
};

export default function BeatCard({ beat, onWaveformReady }: Props) {
    const { currentBeat, isPlaying, play, pause } = usePlayer();
    const { positions } = useWaveformCache();
    const isThisPlaying = currentBeat?.id === beat.id && isPlaying;
    const lastPos = positions[beat.id] ?? 0;

    const handleTogglePlay = () => {
        if (isThisPlaying) {
            pause();
        } else {
            play(beat, lastPos);
        }
    };

    return (
        <div className="bg-card-bg text-white rounded-xl shadow-md p-3 sm:p-4 flex gap-3 sm:gap-4 w-full max-w-4xl mx-auto overflow-hidden">
            {/* LEFT: Cover Art */}
            <img
                src={beat.cover}
                alt={beat.title}
                className="aspect-square w-20 h-20 md:w-36 md:h-36 rounded-lg object-cover"
            />

            {/* RIGHT: Content */}
            <div className="flex flex-col justify-between flex-1 min-w-0">
                {/* Title & Key/BPM */}
                <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white leading-snug truncate">
                        {beat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-300">
                        {beat.key} • {beat.bpm} BPM
                    </p>
                </div>

                {/* Play + Waveform */}
                <div className="min-w-0 flex items-center gap-3 sm:gap-4 mt-2">
                    <button
                        onClick={handleTogglePlay}
                        className="text-card-bg bg-white hover:opacity-90 rounded-full w-11 h-11 sm:w-12 sm:h-12 transition cursor-pointer no-ring min-w-[44px] min-h-[44px] flex items-center justify-center self-center"
                    >
                        {isThisPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <Waveform beat={beat} onReady={onWaveformReady} />
                    </div>
                </div>

                {/* Cart + Share */}
                <div className="flex items-center gap-3 mt-2">
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
