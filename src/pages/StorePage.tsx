import { useEffect, useState } from 'react';
import BeatCard from '../components/BeatCard';
import type { Beat } from '../types/Beat';
import { useSearch } from '../context/SearchContext';
import { filterBeats } from "../utils/search/filterBeats";
import { parseSearchQuery } from '../utils/search/searchParser';

export default function StorePage() {
    const [beats, setBeats] = useState<Beat[]>([]);
    const [filteredBeats, setFilteredBeats] = useState<Beat[]>([]);
    const { searchQuery, setBeats: setVisibleBeats } = useSearch();

    // Load beats initially
    useEffect(() => {
        fetch('/assets/data.json')
            .then(res => res.json())
            .then(data => {
                setBeats(data);
                setFilteredBeats(data);
            })
            .catch(console.error);
    }, []);

    // Filter beats based on search query
    useEffect(() => {
        const searchParamsResult = parseSearchQuery(searchQuery);
        console.log(searchParamsResult); // Debug statement
        const filteredBeats = filterBeats(beats, searchParamsResult)
        setFilteredBeats(filteredBeats);
        setVisibleBeats(filteredBeats); // Make list visible to PlayerBar
    }, [searchQuery, beats]);

    return (
        <div className="pt-12 flex flex-col gap-6 max-w-3xl mx-auto px-4">
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
            <div className="flex flex-col gap-4 pb-[64px]">
                {filteredBeats.map(beat => (
                    <BeatCard
                        key={beat.id}
                        beat={beat}
                    />
                ))}
            </div>
        </div>
    );
}
