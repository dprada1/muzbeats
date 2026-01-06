import { useEffect, useState } from "react";
import { useInView } from "@/hooks/useInView";
import { preloadImage } from "@/utils/preload";
import BeatCardStore from "./BeatCardStore";
import BeatCardSkeleton from "./BeatCardSkeleton";
import type { Beat } from "@/types/Beat";

export default function LazyBeatCard({ beat }: { beat: Beat }) {
    const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.01, once: true });
    const [coverReady, setCoverReady] = useState(false);
    const [waveReady, setWaveReady] = useState(false);
    const allReady = coverReady && waveReady;

    useEffect(() => {
        if (!inView) return;
        
        let cancelled = false;
        preloadImage(beat.cover).then(() => !cancelled && setCoverReady(true)).catch(() => {
            // If image fails to load, still mark as ready to avoid blocking forever
            if (!cancelled) setCoverReady(true);
        });
        return () => { cancelled = true; };
    }, [inView, beat.cover]);

    // Reset states when beat changes
    useEffect(() => {
        setCoverReady(false);
        setWaveReady(false);
    }, [beat.id]);

    return (
        <div ref={ref} className="relative">
            {/* Skeleton visible until both ready */}
            {!allReady && <BeatCardSkeleton />}

            {inView && (
                <div 
                    aria-hidden={!allReady} 
                    className={!allReady ? "absolute inset-0 opacity-0 pointer-events-none" : ""}
                >
                    <BeatCardStore 
                        beat={beat} 
                        onWaveformReady={() => setWaveReady(true)} 
                    />
                </div>
            )}
        </div>
    );
}
