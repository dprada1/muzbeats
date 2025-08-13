import { useEffect } from 'react';
import type { RefObject } from 'react';
import type WaveSurfer from 'wavesurfer.js';

/**
 * useWaveSurferResize
 * Reads the wrapper’s current clientHeight and applies it to WaveSurfer on live size changes.
 * Uses setOptions({ height }) when available and falls back to renderer/draw calls to repaint.
 */
export function useWaveSurferResize(
    wsRef: RefObject<WaveSurfer | null>,
    wrapperRef: RefObject<HTMLDivElement | null>
): void {
    useEffect(() => {
        const el = wrapperRef.current;
        const ws = wsRef.current;
        if (!el || !ws) return;

        let prevW = -1;
        let prevH = -1;

        const apply = (h: number) => {
            try {
                // Preferred: update height option (supported on WS v7+)
                (ws as any).setOptions?.({ height: h });
                // Best-effort repaints across builds
                (ws as any).renderer?.setHeight?.(h);
                (ws as any).renderer?.updateSize?.();
                (ws as any).drawBuffer?.();
                (ws as any).renderer?.draw?.();
            } catch {
                /* ignore */
            }
        };

        const sync = () => {
            // Use the wrapper’s real size as source of truth
            const w = Math.round(el.clientWidth);
            const h = Math.round(el.clientHeight);
            if (w === prevW && h === prevH) return;
            prevW = w; prevH = h;
            if (h > 0) apply(h);
        };

        // Initial sync
        sync();

        // Element-driven resize (layout shifts)
        const ro = new ResizeObserver(() => sync());
        ro.observe(el);

        // Window-driven resize/orientation (some layouts skip RO briefly)
        let raf: number | null = null;
        const onWin = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => { raf = null; sync(); });
        };
        window.addEventListener('resize', onWin);
        window.addEventListener('orientationchange', onWin);

        return () => {
            ro.disconnect();
            window.removeEventListener('resize', onWin);
            window.removeEventListener('orientationchange', onWin);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [wsRef, wrapperRef]);
}
