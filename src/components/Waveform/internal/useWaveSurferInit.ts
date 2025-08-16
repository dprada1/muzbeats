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
    containerSize?: 'compact' | 'regular';
};

/**
 * useWaveSurferInit
 * Creates/reuses WaveSurfer when visible, restores playhead, caches decoded buffer,
 * and DESTROYS/Recreates the instance if containerSize changes (fixes height on breakpoint).
 *
 * @returns {RefObject<WaveSurfer|null>} ref to the WaveSurfer instance
 */
export function useWaveSurferInit({
    isVisible, wrapperRef, beat, isActive, audio,
    buffers, positions, setBuffer, onReady, containerSize,
}: InitParams): RefObject<WaveSurfer | null> {
    const wsRef = useRef<WaveSurfer | null>(null);

    useEffect(() => {
        // Skip WS instantiation if not visible or instance already exists
        if (!isVisible || wsRef.current) { console.log("Skipped waveform creation for", beat.title); return; }

        // Instantiate WS
        console.log("Creating waveform for", beat.title);
        const wrapperEl = wrapperRef.current;
        if (!wrapperEl) return;

        const ws = createWaveSurfer(wrapperEl);
        wsRef.current = ws;
        ws.setMuted?.(true); // PlayerBar drives audio; WS is visual only

        // ---- Cached path: hydrate instantly, no network/decode ----
        const cached = buffers[beat.id];
        if (cached) {
            const wsi = ws as unknown as WSInternals; // minimal internal touch
            if (wsi.backend) {
                wsi.backend.buffer = cached;
                wsi.drawBuffer?.();
            }

            const duration = cached.duration;           // seconds
            const savedTime = positions[beat.id] ?? 0;  // seconds

            // If this is the active beat, follow the global <audio> time.
            // Otherwise, resume from our saved position.
            const startTime  = isActive && audio ? Math.min(audio.currentTime, duration) : savedTime;

            onReady(duration, startTime); // Update time badges in UI
            ws.seekTo(duration > 0 ? startTime / duration : 0);

            // cleanup (Strict Mode safe)
            return () => {
                wsRef.current?.destroy();
                wsRef.current = null;
            };
        }

        const handleReady = () => {
            const buf = (ws as any)?.backend?.buffer as AudioBuffer | undefined;
            if (buf) setBuffer(beat.id, buf);

            const duration = ws.getDuration();
            const savedTime = positions[beat.id] ?? 0;
            const startTime  = isActive && audio ? Math.min(audio.currentTime, duration) : savedTime;

            onReady(duration, startTime);
            ws.seekTo(duration > 0 ? startTime / duration : 0);
        };

        (ws as any).on?.('ready', handleReady);
        ws.load(beat.audio);

        return () => {
            console.log("cleanup for", beat.title);
            ws.un('ready', handleReady);
            wsRef.current?.destroy();
            wsRef.current = null;
        };
    }, [isVisible]);

    useEffect(() => {
        const ws = wsRef.current;
        const wrapperEl = wrapperRef.current;
        if (!ws || !wrapperEl) return;
        requestAnimationFrame(() => {
            ws.setOptions?.({ height: wrapperEl.clientHeight }); // height adapts
        });
    }, [containerSize]);

    return wsRef;
}
