import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Beat } from '@/types/Beat';
import BeatCard from '@/components/beatcards/store/BeatCardStore';
import SearchCluster from '@/components/SearchBar/SearchCluster';

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
					Shared Beat
				</h1>
				<p className="text-base sm:text-lg text-zinc-400">
					Showing 1 result
				</p>
			</div>

			<div className="flex flex-col gap-3 sm:gap-4">
				<BeatCard beat={beat} />
			</div>
		</div>
	);
}
