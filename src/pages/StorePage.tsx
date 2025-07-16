import { useEffect, useState } from 'react';
import BeatCard from '../components/BeatCard';
import type { Beat } from '../types/Beat';
import { useSearch } from '../context/SearchContext';

export default function StorePage() {
    const [beats, setBeats] = useState<Beat[]>([]);
    const [filteredBeats, setFilteredBeats] = useState<Beat[]>([]);
    const { searchQuery } = useSearch();

    useEffect(() => {
        fetch('/assets/data.json')
            .then(res => res.json())
            .then(data => {
                setBeats(data);
                setFilteredBeats(data);
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        const filtered = beats.filter(
            (beat) => beat && smartMatch(beat, searchQuery)
        );
        setFilteredBeats(filtered);
    }, [searchQuery, beats]);

    return (
        <div className="pt-12 flex flex-col gap-6 max-w-3xl mx-auto px-4 pt-6">
            {/* Header + Summary */}
            <div>
                <h1 className="text-4xl font-bold text-white mb-1">Beat Store</h1>
                <p className="text-zinc-400 text-lg">
                    {searchQuery
                        ? `Showing ${filteredBeats.length} result${filteredBeats.length !== 1 ? 's' : ''} for "${searchQuery}"`
                        : `All beats (${beats.length})`}
                </p>
            </div>

            {/* Beat Cards */}
            <div className="flex flex-col gap-4">
                {filteredBeats.map(beat => (
                    <BeatCard
                        key={beat.id}
                        beat={beat}
                        onAddToCart={(b) => console.log("Add to cart", b.title)}
                    />
                ))}
            </div>
        </div>
    );
}

function smartMatch(beat: Beat, query: string): boolean {
    const cleanedQuery = query.toLowerCase().replace(/[^\w\s#-]+/g, '');
    const words = cleanedQuery.split(/\s+/);

    return words.every(word => {
        if (!word) return true;

        if (/^\d{2,3}$/.test(word)) {
            // Exact BPM
            return beat.bpm?.toString() === word;
        }

        if (/^\d{2,3}-\d{2,3}$/.test(word)) {
            // BPM range
            const [min, max] = word.split('-').map(Number);
            return beat.bpm >= min && beat.bpm <= max;
        }

        if (/maj|min|m$|#|b/.test(word)) {
            // Musical key
            return beat.key?.toLowerCase().includes(word);
        }

        // Fallback to title matching
        return beat.title.toLowerCase().includes(word);
    });
}
