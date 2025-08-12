import { MdVolumeDown, MdVolumeOff, MdVolumeUp } from 'react-icons/md';
import { usePlayerBarContext } from '@/components/PlayerBar/PlayerBarContext';
import AddToCartButton from '@/components/buttons/AddToCartButton';

const iconButton =
    'p-1 transition no-ring disabled:opacity-40 disabled:pointer-events-none hover:text-brand-yellow cursor-pointer';

export default function VolumeCart() {
    const {
        volume,
        setVolume,
        isMuted,
        toggleMute,
        currentBeat,
        noTrackLoaded,
    } = usePlayerBarContext();

    const applyVolume = (val: number) => {
        setVolume(val);
    };

    return (
        <div className="flex items-center gap-2 sm:gap-3 justify-end">
            <button
                onClick={toggleMute}
                disabled={noTrackLoaded}
                className={iconButton}
            >
                {isMuted || volume === 0 ? (
                    <MdVolumeOff size={28} />
                ) : volume < 0.5 ? (
                    <MdVolumeDown size={28} />
                ) : (
                    <MdVolumeUp size={28} />
                )}
            </button>
            <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={e => applyVolume(parseFloat(e.target.value))}
                disabled={noTrackLoaded}
                className={`range-thumb accent-white w-24 no-ring hidden sm:block ${
                    noTrackLoaded
                        ? 'cursor-not-allowed opacity-40'
                        : 'cursor-pointer'
                }`}
            />
            {currentBeat && (
                <div className="flex items-center gap-3">
                    <span className="pointer-events-none hidden sm:flex font-medium">
                        ${currentBeat.price.toFixed(2)}
                    </span>
                    <AddToCartButton beat={currentBeat} />
                </div>
            )}
        </div>
    );
}
