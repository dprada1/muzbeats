import { useEffect, useState, useRef } from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";
import LazyBeatCard from "@/components/beatcards/store/LazyBeatCard";
import type { Beat } from "@/types/Beat";
import { useSearch } from "@/context/SearchContext";
import PageHeader from "@/components/PageHeader/PageHeader";
import NProgress from "nprogress";
import 'nprogress/nprogress.css';
import BeatCardSkeleton from "@/components/beatcards/store/BeatCardSkeleton";
import { SkeletonTheme } from "react-loading-skeleton";
import { apiUrl, transformBeatsAssets } from "@/api/api";
import { validatedFetch, BeatSchema, z, type Beat as ValidatedBeat } from "@/api/apiValidation";
import { truncateForDisplay } from "@/validation/validation";
import { deduplicateRequest } from "@/utils/rateLimiting";

export default function StorePage() {
    const [beats, setBeats] = useState<Beat[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { searchQuery, setBeats: setVisibleBeats } = useSearch();
    const isMobile = useIsMobile();
    
    // Request cancellation for rate limiting
    // Store the current abort controller so we can cancel it when a new request starts
    const requestCancellerRef = useRef<{ controller: AbortController | null }>({ controller: null });

    useEffect(() => {
        setIsLoading(true);
        setError(null); // Clear previous errors
        NProgress.start();
        
        const url = searchQuery.trim() 
            ? apiUrl(`/api/beats?q=${encodeURIComponent(searchQuery.trim())}`)
            : apiUrl('/api/beats');

        // Create abort controller for this specific request
        const abortController = new AbortController();
        // Track if this specific request was cancelled
        let isCancelled = false;
        
        // Cancel previous request if it exists
        if (requestCancellerRef.current.controller) {
            requestCancellerRef.current.controller.abort();
        }
        // Store this controller for potential cancellation
        requestCancellerRef.current.controller = abortController;
        
        // Use deduplication to prevent duplicate requests
        if (import.meta.env.DEV) {
            console.log('Fetching beats from:', url);
        }
        
        deduplicateRequest(url, async () => {
            return validatedFetch(url, z.array(BeatSchema), {
                signal: abortController.signal,
            });
        })
            .then((data: ValidatedBeat[]) => {
                // Check if this request was cancelled by cleanup or new request
                if (isCancelled || abortController.signal.aborted) {
                    if (import.meta.env.DEV) {
                        console.log('Request was cancelled, ignoring response');
                    }
                    return;
                }
                
                if (import.meta.env.DEV) {
                    console.log('Received beats:', data.length);
                }
                
                // Transform relative asset paths to full URLs
                // Type assertion is safe because ValidatedBeat matches Beat structure
                const transformedBeats = transformBeatsAssets(data) as Beat[];
                setBeats(transformedBeats);
                setVisibleBeats(transformedBeats);
                setError(null); // Clear error on success
            })
            .catch((error) => {
                // Ignore aborted requests (they're expected when cancelling)
                if (error.name === 'AbortError' || error.message === 'Request was cancelled') {
                    if (import.meta.env.DEV) {
                        console.log('Request was aborted (expected)');
                    }
                    return;
                }
                
                // Only set error if request wasn't aborted and wasn't cancelled
                if (!isCancelled && !abortController.signal.aborted) {
                    console.error('Failed to fetch beats:', error.message);
                    setBeats([]);
                    setVisibleBeats([]);
                    // Set user-friendly error message
                    setError('Unable to connect to the server. Please check your connection and try again.');
                }
            })
            .finally(() => {
                // Always update loading state if this request wasn't cancelled
                if (!isCancelled) {
                    setIsLoading(false);
                    NProgress.done();
                }
            });
        
        // Cleanup: cancel request when component unmounts or searchQuery changes
        return () => {
            isCancelled = true; // Mark this request as cancelled
            abortController.abort();
            // Clear the stored controller if it's this one
            if (requestCancellerRef.current.controller === abortController) {
                requestCancellerRef.current.controller = null;
            }
        };
    }, [searchQuery, setVisibleBeats]);

    // Truncate search query for display (keep full query for API calls)
    // Show full query in tooltip if truncated
    // Use responsive truncation: shorter on mobile, longer on desktop
    const getSubtitle = () => {
        if (isLoading) return "Loading...";
        
        // Show error message if server connection failed
        if (error) {
            return "Error"; // Error will be shown separately
        }
        
        if (!searchQuery) return `All beats (${beats.length})`;
        
        // Use responsive truncation: shorter on mobile (30), longer on desktop (60)
        const truncateThreshold = isMobile ? 30 : 60;
        const displayQuery = truncateForDisplay(searchQuery, truncateThreshold);
        const isTruncated = searchQuery.length > truncateThreshold;
        
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

            {/* Error message when server is down */}
            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                    <p className="text-red-400 text-sm font-medium">
                        {error}
                    </p>
                </div>
            )}

            <div className="flex flex-col gap-3 sm:gap-4">
                <SkeletonTheme baseColor="#1e1e1e" highlightColor="#2c2c2c">
                    {isLoading && beats.length === 0 && !error
                        ? Array.from({ length: 8 }).map((_, i) => <BeatCardSkeleton key={i} />)
                        : !error && beats.map((beat: Beat) => (
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
