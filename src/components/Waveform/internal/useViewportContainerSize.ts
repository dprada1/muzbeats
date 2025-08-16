import { useEffect, useState } from 'react';

export type ContainerSize = 'compact' | 'regular';

/**
 * useViewportContainerSize
 * Mirrors Tailwind's `sm` breakpoint. Returns `'compact'` below 640px,
 * `'regular'` at 640px and above. No ResizeObserver—just matchMedia.
 */
export function useViewportContainerSize(): ContainerSize {
    const pick = () =>
        typeof window !== 'undefined' &&
        window.matchMedia('(max-width: 639px)').matches
            ? 'compact'
            : 'regular';

    const [size, setSize] = useState<ContainerSize>(pick);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(max-width: 639px)');
        const onChange = () => setSize(mq.matches ? 'compact' : 'regular');
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    console.log(size);

    return size;
}
