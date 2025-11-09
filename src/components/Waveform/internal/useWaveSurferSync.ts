import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type WaveSurfer from 'wavesurfer.js';

type SyncParams = {
    wsRef: RefObject<WaveSurfer | null>;
    audio: HTMLAudioElement | null;
    isActive: boolean;
    beatId: string;
    beatAudioUrl: string;
    positions: Record<string, number>;
    setPosition: (id: string, t: number) => void;
    duration: number;
    setTime: (t: number) => void;
    setDur: (d: number) => void;
};

// Track active state to prevent race conditions in tickSync
type ActiveStateRef = { current: boolean };

/**
 * tickSync
 * Keeps UI and WaveSurfer cursor in sync with the global <audio>, a few times per second.
 * - Updates left time badge and caches resume position.
 * - Seeks WS (muted) to match <audio> using a clamped 0..1 ratio.
 * - Dev-guards rare seek failures and stale refs.
 * - Only updates position if the beat is still active AND the audio source matches.
 */
function tickSync(
    wsRef: RefObject<WaveSurfer | null>,
    ws: WaveSurfer,
    audio: HTMLAudioElement,
    beatId: string,
    beatAudioUrl: string,
    setPosition: (id: string, t: number) => void,
    setTime: (t: number) => void,
    isActiveRef: ActiveStateRef
): void {
    // Only update position if this beat is still active
    // This prevents race conditions when clicking waveforms back and forth
    if (!isActiveRef.current) return;

    // CRITICAL: Check if the audio source matches this beat's audio file
    // This prevents Beat B from saving Beat A's time when switching beats
    if (audio.src && !audio.src.endsWith(beatAudioUrl)) {
        return;
    }

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
}

/**
 * metaSync
 * Sets the right-hand duration badge from <audio> metadata (initial and on updates).
 */
function metaSync(
    audio: HTMLAudioElement,
    setDur: (d: number) => void
): void {
    setDur(audio.duration || 0);
}

/**
 * useWaveSurferSync
 * Keeps the visual waveform and UI labels in sync with the global <audio> element.
 * - Inactive: seeks to the last cached position and exits (only if duration is valid).
 * - Active: on every `timeupdate`, updates the current time label, caches the resume
 *   point, and seeks the (muted) WaveSurfer cursor to match <audio>.
 * - Also sets the total duration on `loadedmetadata`.
 * 
 * IMPORTANT: When a beat becomes inactive, we only seek to its cached position if:
 * 1. The duration is valid (> 0)
 * 2. The cached position is valid (>= 0 and <= duration)
 * This prevents position "carry-over" when clicking waveforms back and forth.
 */
export function useWaveSurferSync({
    wsRef, audio, isActive, beatId, beatAudioUrl, positions, setPosition, duration, setTime, setDur
}: SyncParams): void {
    // Use a ref to track active state to prevent race conditions in tickSync
    // This ensures tickSync only updates positions when the beat is still active
    const isActiveRef = useRef(isActive);
    
    // Track the last known good position for this beat to prevent overwriting
    // when the beat becomes inactive due to another beat becoming active
    const lastKnownPositionRef = useRef<number | null>(null);
    
    // Update isActiveRef synchronously to prevent race conditions
    // This ensures tickSync can check the correct active state immediately
    const wasActive = isActiveRef.current;
    isActiveRef.current = isActive;
    
    useEffect(() => {
        // When beat becomes inactive, save its current position BEFORE any other updates
        // This prevents the position from being overwritten by another beat's time
        if (wasActive && !isActive) {
            // Beat is transitioning from active to inactive
            // Save the current position from the positions map (which should be the last
            // position saved by tickSync when this beat was active)
            // This ensures we capture the position before it potentially gets overwritten
            const currentPos = positions[beatId] ?? 0;
            if (Number.isFinite(currentPos) && currentPos >= 0) {
                // Save to the ref for immediate use when rendering the inactive beat
                lastKnownPositionRef.current = currentPos;
            }
        }
    }, [isActive, beatId, positions, wasActive]);

    useEffect(() => {
        const ws = wsRef.current;
        if (!audio || !ws) return;

        // Inactive card: jump to last cached position and bail
        // Use the last known position if available, otherwise fall back to positions map
        if (!isActive) {
            // Use the last known position if we have one, otherwise use the positions map
            // This prevents reading a position that was overwritten by another beat
            const last = lastKnownPositionRef.current !== null 
                ? lastKnownPositionRef.current 
                : (positions[beatId] ?? 0);
            
            // Only seek if we have a valid duration and the cached position is valid
            if (duration > 0 && last >= 0 && last <= duration) {
                try { 
                    ws.seekTo(last / duration); 
                } catch { 
                    /* ignore */ 
                }
            }
            setTime(last);
            return;
        }

        // Active beat: clear the last known position ref since we're now active
        lastKnownPositionRef.current = null;

        // Prime UI, then wire listeners using extracted helpers
        const tick = () => tickSync(wsRef, ws, audio, beatId, beatAudioUrl, setPosition, setTime, isActiveRef);
        const meta = () => metaSync(audio, setDur);

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
    }, [isActive, audio, beatId, setPosition, duration, wsRef, setTime, setDur]);
}
