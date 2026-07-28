import { useEffect, useState } from 'react';

/** Soft fallback when a beat cover 404s — same asset used across store cards and player bar. */
export const FALLBACK_COVER = '/assets/images/skimask.png';

type BeatCoverImageProps = {
    src: string | null | undefined;
    alt: string;
    className?: string;
};

/**
 * Cover image that swaps to skimask on load failure so BeatCard and PlayerBar stay in sync.
 */
export default function BeatCoverImage({ src, alt, className = '' }: BeatCoverImageProps) {
    const resolvedSrc = src && src.length > 0 ? src : FALLBACK_COVER;
    const [coverSrc, setCoverSrc] = useState<string>(resolvedSrc);

    useEffect(() => {
        setCoverSrc(resolvedSrc);
    }, [resolvedSrc]);

    return (
        <img
            src={coverSrc}
            alt={alt}
            onError={() => {
                if (coverSrc !== FALLBACK_COVER) {
                    setCoverSrc(FALLBACK_COVER);
                }
            }}
            className={className}
        />
    );
}
