import { useEffect } from 'react';
import type { RefObject } from 'react';
import type WaveSurfer from 'wavesurfer.js';

type SyncParams = {
    wsRef: RefObject<WaveSurfer | null>;
    audio: HTMLAudioElement | null;
    isActive: boolean;
    beatId: string;
    positions: Record<string, number>;
    setPosition: (id: string, t: number) => void;
    dur: number;
    setTime: (t: number) => void;
    setDur: (d: number) => void;
};

/**
 * useWaveSurferSync
 * Keeps the visual waveform and UI labels in sync with the global <audio> element.
 * - Inactive: seeks to the last cached position and exits.
 * - Active: on every `timeupdate`, updates the current time label, caches the resume
 *   point, and seeks the (muted) WaveSurfer cursor to match <audio>.
 * - Also sets the total duration on `loadedmetadata`.
 */
export function useWaveSurferSync({
    wsRef, audio, isActive, beatId, positions, setPosition, dur, setTime, setDur
}: SyncParams): void {
    useEffect(() => {
        const ws = wsRef.current;
        if (!audio || !ws) return;

        // Inactive card: jump to last cached position and bail
        if (!isActive) {
            const last = positions[beatId] ?? 0;
            if (dur > 0) {
                try { ws.seekTo(last / dur); } catch { /* ignore */ }
            }
            setTime(last);
            return;
        }

        /**
         * tick()
         * Keeps the UI and WaveSurfer cursor in sync with the global <audio>.
         * - Updates the left time badge and cached resume position (a few times/sec).
         * - Seeks the muted WaveSurfer instance to match <audio> using a clamped 0..1 ratio.
         */
        const tick = () => {
            const t = audio.currentTime || 0;
            if (Number.isFinite(t) && t >= 0) {
                setTime(t);
                setPosition(beatId, t);
            }

            const total = audio.duration;
            if (!Number.isFinite(total) || total <= 0) return;

            // Wavesurfer expects 0..1; clamp to avoid tiny float drift past the ends
            const ratio = Math.min(1, Math.max(0, t / total));
            if (wsRef.current === ws) {
                try {
                    ws.seekTo(ratio);
                } catch (e) {
                    if ((import.meta as any)?.env?.DEV) {
                        console.warn('[Waveform] seekTo failed', { beatId, t, total, ratio, e });
                    }
                }
            }
        };

        /**
         * meta()
         * Sets the right-hand duration badge from <audio> metadata.
         * Called immediately and on 'loadedmetadata' to reflect the latest total duration.
         */
        const meta = () => setDur(audio.duration || 0);

        // Prime UI, then wire listeners
        tick();
        meta();
        audio.addEventListener('timeupdate', tick);
        audio.addEventListener('loadedmetadata', meta);

        return () => {
            audio.removeEventListener('timeupdate', tick);
            audio.removeEventListener('loadedmetadata', meta);
        };
        // positions is ref-backed (stable identity); safe to omit from deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, audio, beatId, setPosition, dur, wsRef, setTime, setDur]);
}
