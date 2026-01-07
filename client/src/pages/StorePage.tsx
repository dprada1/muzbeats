import { useEffect, useState } from "react";
import LazyBeatCard from "@/components/beatcards/store/LazyBeatCard";
import type { Beat } from "@/types/Beat";
import { useSearch } from "@/context/SearchContext";
import PageHeader from "@/components/PageHeader/PageHeader";
import NProgress from "nprogress";
import 'nprogress/nprogress.css';
import BeatCardSkeleton from "@/components/beatcards/store/BeatCardSkeleton";
import { SkeletonTheme } from "react-loading-skeleton";
import { apiUrl, transformBeatsAssets } from "@/utils/api";
import { validatedFetch, BeatSchema, z, type Beat as ValidatedBeat } from "@/utils/apiValidation";
import { truncateForDisplay } from "@/utils/validation";

export default function StorePage() {
    const [beats, setBeats] = useState<Beat[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const { searchQuery, setBeats: setVisibleBeats } = useSearch();

    useEffect(() => {
        setIsLoading(true);
        NProgress.start();
        
        const url = searchQuery.trim() 
            ? apiUrl(`/api/beats?q=${encodeURIComponent(searchQuery.trim())}`)
            : apiUrl('/api/beats');

        validatedFetch(url, z.array(BeatSchema))
            .then((data: ValidatedBeat[]) => {
                // Transform relative asset paths to full URLs
                // Type assertion is safe because ValidatedBeat matches Beat structure
                const transformedBeats = transformBeatsAssets(data) as Beat[];
                setBeats(transformedBeats);
                setVisibleBeats(transformedBeats);
            })
            .catch((error) => {
                console.error('Failed to fetch beats:', error.message);
                setBeats([]);
                setVisibleBeats([]);
            })
            .finally(() => {
                setIsLoading(false);
                NProgress.done();
            });
    }, [searchQuery]);

    // Truncate search query for display (keep full query for API calls)
    // Show full query in tooltip if truncated
    const getSubtitle = () => {
        if (isLoading) return "Loading...";
        if (!searchQuery) return `All beats (${beats.length})`;
        
        const displayQuery = truncateForDisplay(searchQuery, 60);
        const isTruncated = searchQuery.length > 60;
        
        if (beats.length === 0) {
            return (
                <>
                    No results found for "
                    <span title={isTruncated ? searchQuery : undefined}>
                        {displayQuery}
                    </span>
                    "
                </>
            );
        }
        
        return (
            <>
                Showing {beats.length} result{beats.length !== 1 ? "s" : ""} for "
                <span title={isTruncated ? searchQuery : undefined}>
                    {displayQuery}
                </span>
                "
            </>
        );
    };
    
    const subtitle = getSubtitle();

    return (
        <div className="pt-12 flex flex-col gap-2 sm:gap-6 max-w-3xl mx-auto">
            <PageHeader title="Beat Store" subtitle={subtitle} />

            <div className="flex flex-col gap-3 sm:gap-4">
                <SkeletonTheme baseColor="#1e1e1e" highlightColor="#2c2c2c">
                    {isLoading && beats.length === 0
                        ? Array.from({ length: 8 }).map((_, i) => <BeatCardSkeleton key={i} />)
                        : beats.map((beat: Beat) => (
                            <LazyBeatCard 
                                key={beat.id} 
                                beat={beat}
                            />
                        ))}
                </SkeletonTheme>
            </div>
        </div>
    );
}
