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
    onReady: (dur: number, now: number) => void; // upstream sets setDur + setTime
};

/**
 * useWaveSurferInit
 * Creates a WaveSurfer instance when the card becomes visible, reuses a cached
 * decoded AudioBuffer if available (instant draw), restores the playhead to either
 * the global <audio> time (if active) or the last cached position, and caches new
 * buffers on first decode. Destroys the instance on unmount.
 *
 * @returns Ref to the WaveSurfer instance (null until created).
 */
export function useWaveSurferInit({
    isVisible, wrapperRef, beat, isActive, audio,
    buffers, positions, setBuffer, onReady,
}: InitParams): RefObject<WaveSurfer | null> {
    const wsRef = useRef<WaveSurfer | null>(null);

    useEffect(() => {
        // create only when visible, node exists, and no instance yet
        if (!isVisible || !wrapperRef.current || wsRef.current) return;

        const el = wrapperRef.current;
        const ws = createWaveSurfer(el) as WaveSurfer;
        wsRef.current = ws;

        // App uses the global <audio> for sound; WaveSurfer stays muted when supported.
        (ws as any).setMuted?.(true);

        const cached = buffers[beat.id];
        if (cached) {
            // Reuse decoded buffer → instant draw (private access quarantined)
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
            return;
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

        return () => { (ws as any).un?.('ready', handleReady); };
    }, [isVisible, wrapperRef, beat.id, beat.audio, isActive, audio, buffers, positions, setBuffer, onReady]);

    // destroy instance when the parent unmounts
    useEffect(() => {
        return () => { wsRef.current?.destroy(); wsRef.current = null; };
    }, []);

    return wsRef;
}
