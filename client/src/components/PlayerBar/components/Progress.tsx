import { usePlayerBarContext } from "@/components/PlayerBar/PlayerBarContext";

export default function Progress() {
    const { currentTime, duration, seekTo, noTrackLoaded } =
        usePlayerBarContext();

    // Ensure duration is a valid number (fallback to 0 if NaN or invalid)
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;

    return (
        <div className="relative h-1 w-full bg-zinc-700">
            <div
                className="absolute inset-0 bg-white pointer-events-none"
                style={{
                    width: safeDuration > 0
                        ? `${(currentTime / safeDuration) * 100}%`
                        : '0%',
                }}
            />
            <input
                type="range"
                min={0}
                max={safeDuration || 0}
                step={0.01}
                value={currentTime}
                onChange={e => seekTo(+e.target.value)}
                disabled={noTrackLoaded}
                className={`progress accent-white no-ring range-thumb absolute inset-0 w-full h-full bg-transparent ${
                    noTrackLoaded
                        ? 'cursor-not-allowed opacity-0'
                        : 'cursor-pointer'
                }`}
            />
        </div>
    );
}
