import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * useVisibilityGate
 * Lazily marks a card "visible" when its wrapper enters the viewport (with a pre-load margin).
 * If the beat is currently active, it is considered visible immediately (skips IO setup).
 *
 * @param isActive   Whether this beat is the one playing in the global player.
 * @param wrapperRef Ref to the card/waveform container element (may be null before mount).
 * @param opts       Optional tuning for the small-screen query and root margins.
 * @returns          Boolean flag indicating the card should initialize its expensive bits.
 */
export function useVisibilityGate(
    isActive: boolean,
    wrapperRef: RefObject<HTMLElement | null>,
    opts?: { smallQuery?: string; marginSmall?: string; marginLarge?: string }
): boolean {
    const [isVisible, setVisible] = useState(false);

    // If this beat is active, mark visible and skip setting up IntersectionObserver
    useEffect(() => {
        if (isActive) { setVisible(true); return; }

        const el = wrapperRef.current;
        if (!el) return;

        const smallQuery = opts?.smallQuery ?? '(max-width: 480px)';
        const rootMargin = window.matchMedia(smallQuery).matches
            ? (opts?.marginSmall ?? '400px')
            : (opts?.marginLarge ?? '200px');

        const io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
        }, { rootMargin });

        io.observe(el);
        return () => io.disconnect();
    }, [isActive, wrapperRef, opts?.smallQuery, opts?.marginSmall, opts?.marginLarge]);

    return isVisible;
}
