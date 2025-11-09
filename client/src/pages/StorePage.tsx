import { useEffect, useState, useRef } from "react";
import LazyBeatCard from "@/components/beatcards/store/LazyBeatCard";
import type { Beat } from "@/types/Beat";
import { useSearch } from "@/context/SearchContext";
import { filterBeats } from "@/utils/search/filterBeats";
import { parseSearchQuery } from "@/utils/search/searchParser";
import PageHeader from "@/components/PageHeader/PageHeader";
import NProgress from "nprogress";
import 'nprogress/nprogress.css';
import BeatCardSkeleton from "@/components/beatcards/store/BeatCardSkeleton";
import { SkeletonTheme } from "react-loading-skeleton";

export default function StorePage() {
    const [beats, setBeats] = useState<Beat[]>([]);
    const [filteredBeats, setFilteredBeats] = useState<Beat[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasVisibleCards, setHasVisibleCards] = useState<boolean>(false);
    const { searchQuery, setBeats: setVisibleBeats } = useSearch();
    const isInitialMount = useRef(true);
    const previousSearchQuery = useRef(searchQuery);

    useEffect(() => {
        setIsLoading(true);
        fetch("/api/beats")
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Failed to fetch beats');
                }
                return res.json();
            })
            .then((data: Beat[]) => {
                setBeats(data);
                setFilteredBeats(data);
                setVisibleBeats(data);
            })
            .catch((error) => {
                console.error('Error fetching beats:', error);
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        NProgress.start();
        const searchParamsResult = parseSearchQuery(searchQuery);
        const filtered = filterBeats(beats, searchParamsResult);
        setFilteredBeats(filtered);
        setVisibleBeats(filtered);
        NProgress.done();
    }, [searchQuery, beats]);

    // Handle visibility flag when filtered beats change
    useEffect(() => {
        if (!isLoading && filteredBeats.length > 0 && !hasVisibleCards) {
            // If there are results and loading is complete, wait for IntersectionObserver
            // Add a fallback timeout only on initial mount (page refresh scenario)
            if (isInitialMount.current) {
                // Set a short timeout as fallback in case IntersectionObserver hasn't fired yet
                // This handles the case where cards are already in viewport on page refresh
                const timeoutId = setTimeout(() => {
                    setHasVisibleCards(true);
                }, 200);

                return () => clearTimeout(timeoutId);
            }
            // For subsequent searches, IntersectionObserver will handle it via onVisible callback
        } else if (!isLoading && filteredBeats.length === 0) {
            // If no results, immediately mark as visible (no cards to wait for)
            setHasVisibleCards(true);
        }
    }, [filteredBeats.length, hasVisibleCards, isLoading]);

    // Reset visibility when search query actually changes (user action), not on initial mount
    useEffect(() => {
        // Skip on initial mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
            previousSearchQuery.current = searchQuery;
            return;
        }

        // Only reset if search query actually changed (user typed new search)
        if (previousSearchQuery.current !== searchQuery) {
            setHasVisibleCards(false);
            previousSearchQuery.current = searchQuery;
        }
    }, [searchQuery]);

    const showSkeletons = isLoading || !hasVisibleCards;

    const subtitle = showSkeletons
        ? "Loading..."
        : searchQuery
        ? filteredBeats.length === 0
            ? `No results found for "${searchQuery}"`
            : `Showing ${filteredBeats.length} result${
                  filteredBeats.length !== 1 ? "s" : ""
              } for "${searchQuery}"`
        : `All beats (${beats.length})`;

    return (
        <div className="pt-12 flex flex-col gap-2 sm:gap-6 max-w-3xl mx-auto">
            <PageHeader title="Beat Store" subtitle={subtitle} />

            <div className="flex flex-col gap-3 sm:gap-4">
                <SkeletonTheme baseColor="#1e1e1e" highlightColor="#2c2c2c">
                    {isLoading && filteredBeats.length === 0
                        ? Array.from({ length: 8 }).map((_, i) => <BeatCardSkeleton key={i} />)
                        : filteredBeats.map((beat) => (
                            <LazyBeatCard 
                                key={beat.id} 
                                beat={beat} 
                                onVisible={() => setHasVisibleCards(true)}
                            />
                        ))}
                </SkeletonTheme>
            </div>
        </div>
    );
}
