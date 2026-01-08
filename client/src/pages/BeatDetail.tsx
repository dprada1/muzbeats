import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Beat } from '@/types/Beat';
import BeatCard from '@/components/beatcards/store/BeatCardStore';
import PageHeader from '@/components/PageHeader/PageHeader';
import { apiUrl, transformBeatAssets } from '@/api/api';
import { isValidBeatId } from '@/validation/validation';
import { validatedFetch, BeatSchema } from '@/api/apiValidation';

export default function BeatDetail() {
    const { beatId } = useParams<{ beatId: string }>();
    const [beat, setBeat] = useState<Beat | null | undefined>(undefined);

    useEffect(() => {
        if (!beatId) {
            setBeat(null);
            return;
        }

        // Validate beatId format before making API call
        if (!isValidBeatId(beatId)) {
            console.error('Invalid beat ID format:', beatId);
            setBeat(null);
            return;
        }

        validatedFetch(apiUrl(`/api/beats/${beatId}`), BeatSchema)
            .then((data) => {
                // Transform relative asset paths to full URLs
                setBeat(transformBeatAssets(data));
            })
            .catch((error) => {
                // Handle 404 (beat not found) and validation errors gracefully
                // All errors result in setting beat to null (not found)
                if (import.meta.env.DEV && !error.message.includes('404')) {
                    console.error('Error fetching beat:', error);
                }
                setBeat(null);
            });
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
