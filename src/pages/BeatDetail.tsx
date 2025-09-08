import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Beat } from '@/types/Beat';
import BeatCard from '@/components/beatcards/store/BeatCardStore';

export default function BeatDetail() {
	const { beatId } = useParams<{ beatId: string }>();
	const [beat, setBeat] = useState<Beat | null | undefined>(undefined);

	useEffect(() => {
		fetch('/assets/data.json')
		.then(res => res.json() as Promise<Beat[]>)
		.then(allBeats => {
			const found = allBeats.find(b => b.id === beatId);
			setBeat(found ?? null);
		})
		.catch(() => setBeat(null));
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
		<div className="flex flex-col gap-3 sm:gap-4 pt-12">
			<BeatCard beat={beat} />
		</div>
	);
}
