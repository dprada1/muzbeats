import { useEffect } from 'react';
import type { RefObject } from 'react';
import type WaveSurfer from 'wavesurfer.js';
import type { Beat } from '@/types/Beat';

type InteractionParams = {
    wsRef: RefObject<WaveSurfer | null>;
    audio: HTMLAudioElement | null;
    isActive: boolean;
    beat: Beat;
    play: (beat: Beat) => void;
    setPosition: (id: string, t: number) => void;
    getDur: () => number; // accessor to compute seconds from progress if needed
};

/**
 * useWaveSurferInteraction
 * Wires user interaction on the waveform to control the global <audio>:
 * - Clicking/dragging seeks to a specific second.
 * - If the card is inactive, starts that beat and then seeks.
 * - Handles both 'interaction' (no args) and 'seek' (progress ratio) variants.
 * - Updates the resume-position cache when the user scrubs.
 */
export function useWaveSurferInteraction({
    wsRef, audio, isActive, beat, play, setPosition, getDur
}: InteractionParams): void {
    useEffect(() => {
        const ws = wsRef.current;
        if (!ws || !audio) return;

        // Unified “start or seek” action
        const startOrSeek = (sec: number) => {
            setPosition(beat.id, sec); // keep resume point fresh

            if (!isActive) {
                // Start this beat, then jump to the chosen second
                play(beat);
                try { audio.currentTime = sec; } catch { /* ignore */ }
                return;
            }
            // already active: just seek (and resume if paused)
            audio.currentTime = sec;
            if (audio.paused) audio.play().catch(() => null);
        };

        // Some WS builds emit 'interaction' with no args: read seconds from WS
        const onInteraction = () => {
            const s = (ws as any).getCurrentTime?.() ?? 0;
            const sec = Number.isFinite(s) && s >= 0 ? s : 0;
            startOrSeek(sec);
        };

        // Some emit 'seek' with a progress ratio (0..1): convert to seconds
        const onSeek = (progress: number) => {
            const d = getDur();
            if (!Number.isFinite(progress) || !Number.isFinite(d) || d <= 0) return;
            const sec = Math.min(d, Math.max(0, progress * d));
            startOrSeek(sec);
        };

        (ws as any).on?.('interaction', onInteraction);
        (ws as any).on?.('seek', onSeek);

        return () => {
            (ws as any).un?.('interaction', onInteraction);
            (ws as any).un?.('seek', onSeek);
        };
    }, [wsRef, audio, isActive, beat, play, setPosition, getDur]);
}
