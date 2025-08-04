import { usePlayerBarContext } from '@/components/PlayerBar/PlayerBarContext';

export default function Metadata() {
    const { currentBeat } = usePlayerBarContext();

    return (
        <div className="flex items-center gap-4 overflow-hidden">
            {currentBeat?.cover && (
                <img
                    src={currentBeat.cover}
                    alt={currentBeat.title}
                    className="h-12 w-12 rounded object-cover shrink-0"
                />
            )}
            <div className="min-w-0">
                <div className="truncate font-semibold">
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
