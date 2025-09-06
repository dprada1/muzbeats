import usePlayerBar          from './usePlayerBar';
import { PlayerBarProvider } from './PlayerBarContext';
import Progress              from './components/Progress';
import PlaybackControls      from './components/PlaybackControls';
import Metadata              from './components/Metadata';
import VolumeCart            from './components/VolumeCart';

export default function PlayerBar() {
    const playerBarContext = usePlayerBar();

    return (
        <PlayerBarProvider value={playerBarContext}>
            <div className="fixed bottom-0 left-0 w-full bg-[#121212] text-white shadow-t z-50">
                <Progress />
                <div className="flex items-center h-[calc(5rem-0.25rem)] px-4"
                >
                    {/* LEFT: metadata */}
                    <div className="min-w-0 flex-1">
                        <Metadata />
                    </div>

                    {/* CENTER: playback controls (stay centered, never overlap) */}
                    <div className="shrink-0 mx-auto">
                        <PlaybackControls />
                    </div>

                    {/* RIGHT: volume + price/add-to-cart */}
                    <div className="shrink-0 flex-1 flex justify-end">
                        <VolumeCart />
                    </div>
                </div>
            </div>
        </PlayerBarProvider>
    );
}
