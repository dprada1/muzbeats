import { useEffect, useState } from 'react';
import BeatCard from '../components/BeatCard';
import type { Beat } from '../types/Beat';

export default function StorePage() {
	const [beats, setBeats] = useState<Beat[]>([]);

	useEffect(() => {
		fetch('/assets/data.json')
		.then(res => res.json())
		.then(data => setBeats(data))
		.catch(console.error);
	}, []);

	return (
		<div className="flex flex-col gap-4 max-w-2xl mx-auto">
		{beats.map(beat => (
			<BeatCard
			key={beat.id}
			beat={beat}
			onAddToCart={(b) => console.log("Add to cart", b.title)}
			/>
		))}
		</div>
	);
}
