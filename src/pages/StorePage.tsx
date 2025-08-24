import { useEffect, useState } from "react";
import BeatCard from "@/components/BeatCard/BeatCard";
import type { Beat } from "@/types/Beat";
import { useSearch } from "@/context/SearchContext";
import { filterBeats } from "@/utils/search/filterBeats";
import { parseSearchQuery } from "@/utils/search/searchParser";
import SearchCluster from "@/components/SearchBar/SearchCluster";
import NProgress from "nprogress";

export default function StorePage() {
    const [beats, setBeats] = useState<Beat[]>([]);
    const [filteredBeats, setFilteredBeats] = useState<Beat[]>([]);
    const { searchQuery, setBeats: setVisibleBeats } = useSearch();

    useEffect(() => {
        fetch("/assets/data.json")
            .then((res) => res.json())
            .then((data) => {
                setBeats(data);
                setFilteredBeats(data);
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        const searchParamsResult = parseSearchQuery(searchQuery);
        const filtered = filterBeats(beats, searchParamsResult);
        setFilteredBeats(filtered);
        setVisibleBeats(filtered);
        NProgress.done();
    }, [searchQuery, beats]);

    return (
        <div className="pt-12 flex flex-col gap-2 sm:gap-6 max-w-3xl mx-auto">
            {/* Mobile: tight sticky search under the fixed NavBar */}
            <div
                className="fixed inset-x-0 z-40 md:hidden bg-[#111111] px-4 top-1 pt-3"
                style={{ top: "calc(64px + env(safe-area-inset-top))" }}
            >
                <SearchCluster className="pb-0.5"/>

                {/* push the fade OUTSIDE the bar so it shows */}
                <div
                    className="pointer-events-none absolute left-0 right-0 pt-1
                                h-4 bg-gradient-to-b from-[#111111]/60 via-[#111111]/25 to-transparent"
                    aria-hidden
                />
            </div>

            <div className="mt-[48px] md:mt-0">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-0.5 sm:mb-1">
                    Beat Store
                </h1>
                <p className="text-base sm:text-lg text-zinc-400">
                    {searchQuery
                        ? `Showing ${filteredBeats.length} result${filteredBeats.length !== 1 ? "s" : ""} for "${searchQuery}"`
                        : `All beats (${beats.length})`}
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:gap-4 pb-[64px]">
                {filteredBeats.map((beat) => (
                    <BeatCard key={beat.id} beat={beat} />
                ))}
            </div>
        </div>
    );
}
