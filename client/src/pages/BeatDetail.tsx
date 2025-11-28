import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Beat } from '@/types/Beat';
import BeatCard from '@/components/beatcards/store/BeatCardStore';
import PageHeader from '@/components/PageHeader/PageHeader';

export default function BeatDetail() {
    const { beatId } = useParams<{ beatId: string }>();
    const [beat, setBeat] = useState<Beat | null | undefined>(undefined);

    useEffect(() => {
        if (!beatId) {
            setBeat(null);
            return;
        }

        fetch(`/api/beats/${beatId}`)
            .then((res) => {
                if (!res.ok) {
                    if (res.status === 404) {
                        return null;
                    }
                    throw new Error('Failed to fetch beat');
                }
                return res.json();
            })
            .then((data: Beat | null) => {
                setBeat(data ?? null);
            })
            .catch((error) => {
                console.error('Error fetching beat:', error);
                setBeat(null);
            });
    }, [beatId]);

    // still loading?
    if (beat === undefined) {
        return <p className="p-4">Loading…</p>;
    }

    // invalid or not found
    if (beat === null) {
        return <p className="p-4 text-center text-gray-400">Beat not found.</p>;
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
