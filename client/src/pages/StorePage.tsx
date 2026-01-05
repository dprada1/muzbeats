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

        fetch(url)
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`${res.status} ${res.statusText}`);
                }
                const data: Beat[] = await res.json();
                const transformedBeats = transformBeatsAssets(data);
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

    const subtitle = isLoading
        ? "Loading..."
        : searchQuery
        ? beats.length === 0
            ? `No results found for "${searchQuery}"`
            : `Showing ${beats.length} result${
                  beats.length !== 1 ? "s" : ""
              } for "${searchQuery}"`
        : `All beats (${beats.length})`;

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
