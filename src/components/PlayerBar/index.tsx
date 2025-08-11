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
                <div className="grid grid-cols-[minmax(80px,240px)_1fr_minmax(80px,240px)] items-center h-[calc(5rem-0.25rem)] px-4 gap-2 sm:gap-4">
                    <Metadata />
                    <PlaybackControls />
                    <VolumeCart />
                </div>
            </div>
        </PlayerBarProvider>
    );
}
