import { useEffect, useRef, useState } from "react";

type InViewOptions = {
    root?: Element | null;
    rootMargin?: string;
    threshold?: number | number[];
    once?: boolean;
};

export function useInView<T extends Element = Element>({
    root = null,
    rootMargin = "600px 0px",
    threshold = 0.01,
    once = true,
}: InViewOptions = {}) {
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === "undefined") {
            setInView(true);
            return;
        }
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    if (once) obs.unobserve(entry.target);
                } else if (!once) {
                    setInView(false);
                }
            },
            { root, rootMargin, threshold }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [root, rootMargin, JSON.stringify(threshold), once]);

    return { ref, inView } as const;
}
