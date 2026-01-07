import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * useVisibilityGate
 * Lazily marks a card "visible" when its wrapper enters the viewport (with a pre-load margin).
 * If the beat is currently active, it is considered visible immediately (skips IO setup).
 *
 * @param isActive   Whether this beat is the one playing in the global player.
 * @param wrapperRef Ref to the card/waveform container element (may be null before mount).
 * @returns          Boolean flag indicating the card should initialize its expensive bits.
 */
export function useVisibilityGate(
    isActive: boolean,
    wrapperRef: RefObject<HTMLElement | null>,
): boolean {
    const [isVisible, setVisible] = useState(false);

    // If this beat is active, mark visible and skip setting up IntersectionObserver
    useEffect(() => {
        // Beat's waveform is in playerbar, force visible and skip IO setup
        if (isActive) {
            setVisible(true);
            return;
        }

        const wrapperEl = wrapperRef.current;
        if (!wrapperEl) return;

        const io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setVisible(true);
                io.disconnect();
            }
        }, { rootMargin: '300px' });

        io.observe(wrapperEl);

        return () => {
            io.disconnect();
        };
    }, [isActive, wrapperRef]);

    return isVisible;
}
