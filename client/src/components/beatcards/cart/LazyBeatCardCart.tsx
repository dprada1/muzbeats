import { useEffect, useState } from "react";
import { useInView } from "@/hooks/useInView";
import { preloadImage } from "@/utils/preload";
import BeatCardCart from "./BeatCardCart";
import BeatCardCartSkeleton from "./BeatCardCartSkeleton";
import type { Beat } from "@/types/Beat";

type Props = { beat: Beat; rootMargin?: string };

export default function LazyBeatCardCart({ beat, rootMargin = "600px 0px" }: Props) {
    const { ref, inView } = useInView<HTMLDivElement>({ rootMargin, threshold: 0.01, once: true });
    const [coverReady, setCoverReady] = useState(false);

    useEffect(() => {
        if (!inView) return;
        let cancelled = false;
        preloadImage(beat.cover)
            .then(() => !cancelled && setCoverReady(true))
            .catch(() => {
                // If image fails to load, still mark as ready to avoid blocking forever
                if (!cancelled) setCoverReady(true);
            });
        return () => { cancelled = true; };
    }, [inView, beat.cover]);

    // Reset state when beat changes
    useEffect(() => {
        setCoverReady(false);
    }, [beat.id]);

    return (
        <div ref={ref} className="relative">
            {/* Skeleton visible until cover ready */}
            {!coverReady && <BeatCardCartSkeleton />}

            {inView && (
                <div
                    aria-hidden={!coverReady}
                    className={!coverReady ? "absolute inset-0 opacity-0 pointer-events-none" : ""}
                >
                    <BeatCardCart beat={beat} />
                </div>
            )}
        </div>
    );
}

