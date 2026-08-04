import { useState, useEffect } from 'react';
import type { Beat } from '@/types/Beat';
import { FaPlay, FaPause } from 'react-icons/fa';
import { usePlayer } from '@/context/PlayerContext';
import Waveform from '@/components/Waveform';
import AddToCartButton from '@/components/buttons/AddToCartButton';
import { ShareBeatButton } from '@/components/buttons/ShareBeatButton';
import BeatCoverImage from '@/components/BeatCoverImage';
import { useWaveformCache } from '@/context/WaveformContext';

type Props = {
    beat: Beat;
    /** Optional ping when waveform load settles (success or failure). Used by LazyBeatCardStore to clear its skeleton. */
    onWaveformReady?: () => void;
};

/**
 * Store beat card: cover, beat title, key, bpm, play/waveform, add-to-cart, and share.
 *
 * Tracks `isAudioAvailable` as `null` while Waveform loads, then `true`/`false`
 * from `onReady`. Missing MP3 disables play/cart/share and dims the card; the
 * waveform itself shows the “Preview unavailable” UI. BeatDetail (used when loading a
 * shared beat) renders this directly; StorePage goes through LazyBeatCardStore.
 *
 * @param beat - Beat to display and preview
 * @param onWaveformReady - Optional callback after waveform load settles
 */
export default function BeatCardStore({ beat, onWaveformReady }: Props) {
    const { currentBeat, isPlaying, play, pause } = usePlayer();
    const { positions } = useWaveformCache();
    const isThisPlaying: boolean = currentBeat?.id === beat.id && isPlaying;
    const lastPos: number = positions[beat.id] ?? 0;

    const [isAudioAvailable, setIsAudioAvailable] = useState<boolean | null>(null);

    useEffect(() => {
        setIsAudioAvailable(null);
    }, [beat.id]);

    const handleTogglePlay = () => {
        if (!isAudioAvailable) return;
        if (isThisPlaying) {
            pause();
        } else {
            play(beat, lastPos);
        }
    };

    return (
        <div
            className={`bg-card-bg text-white rounded-xl shadow-md p-3 sm:p-4 flex gap-3 sm:gap-4 w-full max-w-4xl mx-auto overflow-hidden ${
                isAudioAvailable === false ? 'opacity-90' : ''
            }`}
        >
            <BeatCoverImage
                src={beat.cover}
                alt={beat.title}
                className="aspect-square w-20 h-20 md:w-36 md:h-36 rounded-lg object-cover"
            />

            <div className="flex flex-col justify-between flex-1 min-w-0">
                <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white leading-snug truncate">
                        {beat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-300">
                        {beat.key} • {beat.bpm} BPM
                    </p>
                </div>

                <div className="min-w-0 flex items-center gap-3 sm:gap-4 mt-2">
                    <button
                        onClick={handleTogglePlay}
                        disabled={!isAudioAvailable}
                        aria-disabled={!isAudioAvailable}
                        aria-label={
                            !isAudioAvailable
                                ? 'Preview unavailable'
                                : isThisPlaying
                                  ? 'Pause'
                                  : 'Play'
                        }
                        className={`rounded-full w-11 h-11 sm:w-12 sm:h-12 transition no-ring min-w-11 min-h-11 flex items-center justify-center self-center ${
                            isAudioAvailable
                                ? 'text-card-bg bg-white hover:opacity-90 cursor-pointer'
                                : 'text-zinc-500 bg-zinc-700 cursor-not-allowed opacity-60'
                        }`}
                    >
                        {isThisPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                    <div className="min-w-0 flex-1">
                        <Waveform
                            beat={beat}
                            onReady={({ isAudioAvailable: available }) => {
                                setIsAudioAvailable(available);
                                onWaveformReady?.();
                            }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-2">
                    <AddToCartButton beat={beat} disabled={!isAudioAvailable} />
                    <ShareBeatButton
                        url={`${window.location.origin}/store/beat/${beat.id}`}
                        title={beat.title}
                        disabled={!isAudioAvailable}
                    />
                </div>
            </div>
        </div>
    );
}
