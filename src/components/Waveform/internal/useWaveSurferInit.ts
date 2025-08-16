import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type WaveSurfer from 'wavesurfer.js';
import { createWaveSurfer } from '../loader';
import type { Beat } from '@/types/Beat';
import type { WSInternals } from './wsInternals';

type InitParams = {
    isVisible: boolean;
    wrapperRef: RefObject<HTMLDivElement | null>;
    beat: Beat;
    isActive: boolean;
    audio: HTMLAudioElement | null;
    buffers: Record<string, AudioBuffer>;
    positions: Record<string, number>;
    setBuffer: (id: string, buf: AudioBuffer) => void;
    onReady: (dur: number, now: number) => void;
    containerSize?: string; // ← triggers destroy/recreate when breakpoint bucket changes
};

/**
 * useWaveSurferInit
 * Creates/reuses WaveSurfer when visible, restores playhead, caches decoded buffer,
 * and DESTROYS/Recreates the instance if layoutKey changes (fixes height on breakpoint).
 *
 * @returns {RefObject<WaveSurfer|null>} ref to the WaveSurfer instance
 */
export function useWaveSurferInit({
    isVisible, wrapperRef, beat, isActive, audio,
    buffers, positions, setBuffer, onReady, containerSize,
}: InitParams): RefObject<WaveSurfer | null> {
    //console.log("useWaveSurferInit.ts ran!")
    const wsRef = useRef<WaveSurfer | null>(null);

    useEffect(() => {
        if (!isVisible || !wrapperRef.current || wsRef.current) return;

        // Tear down any existing instance before building for this layoutKey
        /*
        if (wsRef.current) {
            wsRef.current.destroy();
            wsRef.current = null;
        }
        */

        const el = wrapperRef.current;
        const ws = createWaveSurfer(el) as WaveSurfer;
        wsRef.current = ws;

        (ws as any).setMuted?.(true);

        const cached = buffers[beat.id];
        if (cached) {
            const wsi = ws as unknown as WSInternals;
            if (wsi.backend) {
                wsi.backend.buffer = cached;
                wsi.drawBuffer?.();
            }
            const total = cached.duration;
            const last = positions[beat.id] ?? 0;
            const now  = isActive && audio ? Math.min(audio.currentTime, total) : last;

            onReady(total, now);
            ws.seekTo(total > 0 ? now / total : 0);

            return () => { wsRef.current?.destroy(); wsRef.current = null; };
        }

        const handleReady = () => {
            const buf = (ws as any)?.backend?.buffer as AudioBuffer | undefined;
            if (buf) setBuffer(beat.id, buf);

            const total = ws.getDuration();
            const last = positions[beat.id] ?? 0;
            const now  = isActive && audio ? Math.min(audio.currentTime, total) : last;

            onReady(total, now);
            ws.seekTo(total > 0 ? now / total : 0);
        };

        (ws as any).on?.('ready', handleReady);
        ws.load(beat.audio);

        /*
        return () => {
            (ws as any).un?.('ready', handleReady);
            wsRef.current?.destroy();
            wsRef.current = null;
        };
        */
        return;
    // include layoutKey so we rebuild once per breakpoint change
    }, [isVisible, wrapperRef, beat.id, beat.audio, isActive, audio, buffers, setBuffer, onReady, containerSize]);

    return wsRef;
}
