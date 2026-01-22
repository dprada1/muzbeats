import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import type { Beat } from '@/types/Beat';
import BeatCard from '@/components/beatcards/store/BeatCardStore';
import PageHeader from '@/components/PageHeader/PageHeader';
import { apiUrl, transformBeatAssets } from '@/api/api';
import { isValidBeatId } from '@/validation/validation';
import { validatedFetch, BeatSchema } from '@/api/apiValidation';
import { deduplicateRequest } from '@/utils/rateLimiting';

export default function BeatDetail() {
    const { beatId } = useParams<{ beatId: string }>();
    const [beat, setBeat] = useState<Beat | null | undefined>(undefined);
    
    // Request cancellation for rate limiting
    const requestCancellerRef = useRef<{ controller: AbortController | null }>({ controller: null });

    useEffect(() => {
        if (!beatId) {
            setBeat(null);
            return;
        }

        // Validate beatId format before making API call
        if (!isValidBeatId(beatId)) {
            if (import.meta.env.DEV) {
                console.error('Invalid beat ID format:', beatId);
            }
            setBeat(null);
            return;
        }

        const url = apiUrl(`/api/beats/${beatId}`);
        
        // Create abort controller for this specific request
        const abortController = new AbortController();
        let isCancelled = false;
        
        // Cancel previous request if it exists
        if (requestCancellerRef.current.controller) {
            requestCancellerRef.current.controller.abort();
        }
        // Store this controller for potential cancellation
        requestCancellerRef.current.controller = abortController;
        
        // Use deduplication to prevent duplicate requests
        deduplicateRequest(url, async () => {
            return validatedFetch(url, BeatSchema, {
                signal: abortController.signal,
            });
        })
            .then((data) => {
                // Check if request was aborted or cancelled
                if (abortController.signal.aborted || isCancelled) {
                    return;
                }
                
                // Transform relative asset paths to full URLs
                setBeat(transformBeatAssets(data));
            })
            .catch((error) => {
                // Ignore aborted requests
                if (error.name === 'AbortError' || error.message === 'Request was cancelled' || isCancelled) {
                    return;
                }
                
                // Handle 404 (beat not found) and validation errors gracefully
                // All errors result in setting beat to null (not found)
                if (import.meta.env.DEV && !error.message.includes('404')) {
                    console.error('Error fetching beat:', error);
                }
                setBeat(null);
            });
        
        // Cleanup: cancel request when component unmounts or beatId changes
        return () => {
            isCancelled = true;
            abortController.abort();
            // Clear the stored controller if it's this one
            if (requestCancellerRef.current.controller === abortController) {
                requestCancellerRef.current.controller = null;
            }
        };
    }, [beatId]);

    // still loading?
    if (beat === undefined) {
        return (
            <div className="pt-12 flex flex-col gap-2 sm:gap-6 max-w-3xl mx-auto">
                <PageHeader title="Shared Beat" subtitle="Loading..." />
            </div>
        );
    }

    // invalid or not found
    if (beat === null) {
        return (
            <div className="pt-12 flex flex-col gap-2 sm:gap-6 max-w-3xl mx-auto">
                <PageHeader title="Shared Beat" subtitle="Beat not found." />
            </div>
        );
    }

    // valid beat!
    return (
        <div className="pt-12 flex flex-col gap-2 sm:gap-6 max-w-3xl mx-auto">
            <PageHeader title="Shared Beat" subtitle="Showing 1 result" />

            <div className="flex flex-col gap-3 sm:gap-4">
                <BeatCard beat={beat} />
            </div>
        </div>
    );
}
