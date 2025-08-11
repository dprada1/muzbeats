import { useEffect, useRef, useState } from 'react';
import type WaveSurfer from 'wavesurfer.js';
import { usePlayer } from '@/context/PlayerContext';
import { useWaveformCache } from '@/context/WaveformContext';
import { createWaveSurfer } from './loader';
import type { Beat } from '@/types/Beat';

export interface UseWaveformResult {
    /** DOM ref for where to mount WaveSurfer */
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    /** Current playback time (s) */
    time: number;
    /** Track duration (s) */
    dur: number;
}

export default function useWaveform(beat: Beat): UseWaveformResult {
    const wrapperRef    = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);

    const { audio, currentBeat, play } = usePlayer();
    const isActive = currentBeat?.id === beat.id;

    const { buffers, setBuffer, positions, setPosition } = useWaveformCache();

    const [isVisible, setVisible] = useState(false);
    const [time, setTime]         = useState(0);
    const [dur, setDur]           = useState(0);

    // Lazy‐load when in view or if active
    useEffect(() => {
        if (isActive) {
            setVisible(true);
            return;
        }
        const el = wrapperRef.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    io.disconnect();
                }
            },
            { rootMargin: window.matchMedia('(max-width: 480px').matches ? '400px' : '200px' }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [isActive]);

    // Initialize or reuse buffer + restore position
    useEffect(() => {
        if (!isVisible || !wrapperRef.current) return;
        if (!wavesurferRef.current) {
            const ws: any = createWaveSurfer(wrapperRef.current);
            wavesurferRef.current = ws;
            ws.setMuted(true);

            if (buffers[beat.id]) {
                // reuse cached AudioBuffer
                (ws.backend as any).buffer = buffers[beat.id]!;
                ws.drawBuffer();
                const total = buffers[beat.id]!.duration;
                setDur(total);
                const last = positions[beat.id] ?? 0;
                const now  = isActive && audio
                    ? Math.min(audio.currentTime, total)
                    : last;
                ws.seekTo(total > 0 ? now / total : 0);
                setTime(now);

            } else {
                ws.on('ready', () => {
                    const buf = (ws.backend as any)?.buffer as AudioBuffer;
                    if (buf) setBuffer(beat.id, buf);

                    const total = ws.getDuration();
                    setDur(total);
                    const last = positions[beat.id] ?? 0;
                    const now  = isActive && audio
                        ? Math.min(audio.currentTime, total)
                        : last;
                    ws.seekTo(total > 0 ? now / total : 0);
                    setTime(now);
                });
                ws.load(beat.audio);
            }
        }

        return () => {
            wavesurferRef.current?.destroy();
            wavesurferRef.current = null;
        };
    }, [isVisible, beat.audio, beat.id, buffers, positions, setBuffer]);

    // Sync playhead & cache position in real time
    useEffect(() => {
        const ws = wavesurferRef.current;
        if (!audio || !ws) return;

        if (isActive) {
            const tick = () => {
                const t = audio.currentTime;
                setTime(t);
                setPosition(beat.id, t);
                if (audio.duration) {
                    ws.seekTo(t / audio.duration);
                }
            };
            const meta = () => setDur(audio.duration || 0);

            tick();
            meta();
            audio.addEventListener('timeupdate', tick);
            audio.addEventListener('loadedmetadata', meta);
            return () => {
                audio.removeEventListener('timeupdate', tick);
                audio.removeEventListener('loadedmetadata', meta);
            };
        } else {
            const last = positions[beat.id] ?? 0;
            ws.seekTo(dur > 0 ? last / dur : 0);
            setTime(last);
        }
    }, [isActive, audio, setPosition, beat.id, positions, dur]);

    // Click‐to‐seek support via WaveSurfer interaction event
    useEffect(() => {
        const ws = wavesurferRef.current;
        if (!isActive || !audio || !ws) return;

        const onSeek = (sec: number) => {
            if (!isActive) {
                play(beat);
            } else {
                audio.currentTime = sec;
                if (audio.paused) audio.play().catch(() => null);
            }
        };
        ws.on('interaction', onSeek);
        return () => {
            ws.un('interaction', onSeek);
        };
    }, [isActive, audio, play, beat]);

    return { wrapperRef, time, dur };
}
