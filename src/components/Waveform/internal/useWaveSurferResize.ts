import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * useLayoutBucket
 * Derives a coarse layout key ('xs' | 'sm' | 'md' | 'lg') from the wrapper element's clientWidth.
 * Updates only when crossing thresholds (via ResizeObserver), so you can remount expensive internals
 * exactly once per meaningful layout change (e.g., desktop ↔ mobile).
 *
 * @param {RefObject<HTMLElement|null>} wrapperRef
 *        Ref to the waveform/container element (may be null before mount).
 * @returns {'xs' | 'sm' | 'md' | 'lg'} Current width bucket key.
 */
export type LayoutKey = 'xs' | 'sm' | 'md' | 'lg';

export function useLayoutBucket(wrapperRef: RefObject<HTMLElement | null>): LayoutKey {
    const pick = (w: number): LayoutKey =>
        w <= 420 ? 'xs' : w <= 640 ? 'sm' : w <= 768 ? 'md' : 'lg';

    const [bucket, setBucket] = useState<LayoutKey>(() =>
        pick(typeof window !== 'undefined' ? window.innerWidth : 0)
    );

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        let current: LayoutKey = pick(el.clientWidth);
        setBucket(current);

        const ro = new ResizeObserver(() => {
            const next: LayoutKey = pick(el.clientWidth);
            if (next !== current) {
                current = next;
                setBucket(next);
            }
        });

        ro.observe(el);
        return () => ro.disconnect();
    }, [wrapperRef]);

    return bucket;
}
