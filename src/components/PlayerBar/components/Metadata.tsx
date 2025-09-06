import { usePlayerBarContext } from '@/components/PlayerBar/PlayerBarContext';

export default function Metadata() {
    const { currentBeat } = usePlayerBarContext();

    return (
        <div className="flex items-center gap-4 pointer-events-none">
            {currentBeat?.cover && (
                <img
                    src={currentBeat.cover}
                    alt={currentBeat.title}
                    className="h-12 w-12 rounded object-cover shrink-0"
                />
            )}
            <div className="min-w-0">
                <div className="font-semibold truncate lg:text-clip lg:overflow-visible">
                    {currentBeat ? currentBeat.title : 'No track loaded'}
                </div>
                {currentBeat && (
                    <div className="text-xs text-gray-400 truncate">
                        {currentBeat.key} • {currentBeat.bpm} BPM
                    </div>
                )}
            </div>
        </div>
    );
}
