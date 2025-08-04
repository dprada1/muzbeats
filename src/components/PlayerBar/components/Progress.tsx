import { usePlayerBarContext } from "../PlayerBarContext";

export default function Progress() {
    const { currentTime, duration, seekTo, noTrackLoaded } =
        usePlayerBarContext();

    return (
        <div className="relative h-1 w-full bg-zinc-700">
            <div
                className="absolute inset-0 bg-white pointer-events-none"
                style={{
                    width: duration
                        ? `${(currentTime / duration) * 100}%`
                        : '0%',
                }}
            />
            <input
                type="range"
                min={0}
                max={duration}
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
