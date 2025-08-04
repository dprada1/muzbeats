import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Beat } from '@/types/Beat';
import PlayerBar from '@/components/PlayerBar';
import BeatCard from '@/components/BeatCard/BeatCard';

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
    <div className="pt-12 p-6 max-w-3xl mx-auto space-y-6">
      <BeatCard beat={beat} />
      <PlayerBar />
    </div>
  );
}
