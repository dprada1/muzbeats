import { useEffect, useState } from "react";
import { useInView } from "@/hooks/useInView";
import { preloadImage } from "@/utils/preload";
import BeatCardStore from "./BeatCardStore";
import BeatCardStoreSkeleton from "./BeatCardStoreSkeleton";
import type { Beat } from "@/types/Beat";

/**
 * Store-list beat card with viewport-gated loading and a skeleton until ready.
 *
 * Mounts only a sentinel + skeleton until the card enters the IntersectionObserver
 * (including a 600px rootMargin). Once `inView`, mounts BeatCardStore behind the
 * skeleton (opacity 0) so the waveform can load, preloads the cover, and swaps to
 * the real card when both `coverReady` and `waveReady` are true. Cover preload
 * failures still set `coverReady` so a bad image cannot trap the skeleton forever
 * (BeatCoverImage handles the visual fallback).
 *
 * Used by StorePage. BeatDetail renders BeatCardStore directly (no lazy wrapper).
 * Cart uses LazyBeatCardCart instead.
 *
 * @param beat - Catalog beat to render once in view and assets have settled
 */
export default function LazyBeatCardStore({ beat }: { beat: Beat }) {
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
            {!allReady && <BeatCardStoreSkeleton />}

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
