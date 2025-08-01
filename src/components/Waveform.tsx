import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { usePlayer } from '@/context/PlayerContext';
import { useWaveformCache } from '@/context/WaveformContext';
import type { Beat } from '@/types/Beat';
import { formatTime } from '@/utils/formatTime';

export default function Waveform({ beat }: { beat: Beat }) {
    const wrapperRef     = useRef<HTMLDivElement>(null);
    const wavesurferRef  = useRef<any>(null);

    const { audio, currentBeat, play } = usePlayer();
    const isActive = currentBeat?.id === beat.id;

    const { buffers, setBuffer, positions, setPosition } = useWaveformCache();

    const [isVisible, setVisible] = useState(false);
    const [time, setTime]         = useState(0);
    const [dur, setDur]           = useState(0);

    // Lazy-load when in view
    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                setVisible(true);
                io.disconnect();
                }
            },
            { rootMargin: '200px' }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // Initialize or load + cache buffer & restore position
    useEffect(() => {
        if (!isVisible || !wrapperRef.current) return;
        if (!wavesurferRef.current) {
            const ws: any = WaveSurfer.create({
                container:     wrapperRef.current,
                waveColor:     '#888',
                progressColor: '#fff',
                cursorColor:   'transparent',
                barWidth:      2,
                height:        wrapperRef.current.clientHeight || 64,
                interact:      true,
                normalize:     true,
            });

            wavesurferRef.current = ws;
            ws.setMuted(true);

            if (buffers[beat.id]) {
                // Use cached buffer
                (ws.backend as any).buffer = buffers[beat.id]!;
                ws.drawBuffer();
                // restore duration & last position
                const total = buffers[beat.id].duration;
                setDur(total);
                const last = positions[beat.id] ?? 0;
                ws.seekTo(last / total);
                setTime(last);
            } else {
                ws.on('ready', () => {
                const buf = (ws.backend as any)?.buffer as AudioBuffer;
                if (buf) {
                    setBuffer(beat.id, buf);
                }
                // set initial duration/time
                const total = ws.getDuration();
                setDur(total);
                setTime(0);
                });
                ws.load(beat.audio);
            }
        }

        return () => {
            wavesurferRef.current?.destroy();
            wavesurferRef.current = null;
        };
    }, [isVisible, beat.audio, beat.id, buffers, positions, setBuffer]);

    // Sync playhead & cache position
    useEffect(() => {
        const ws: any = wavesurferRef.current;
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
            ws.seekTo(last / dur);
            setTime(last);
        }
    }, [isActive, audio, setPosition, beat.id]);

    // Click-to-seek behavior
    useEffect(() => {
        const ws: any = wavesurferRef.current;
        if (!isActive || !audio || !ws) return;

        const onSeek = (sec: number) => {
            if (!isActive) {
                play(beat);
            } else {
                audio.currentTime = sec;
                if (audio.paused) {
                    audio.play().catch(() => null);
                }
            }
        };
        ws.on('interaction', onSeek);
        return () => {
        ws.un('interaction', onSeek);
        };
    }, [isActive, audio, play, beat]);

    return (
        <div ref={wrapperRef} className="relative w-full h-16 rounded">
            {wavesurferRef.current && (
                <>
                <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 z-20 text-[11px] bg-black/75 text-gray-200 px-1 rounded">
                    {formatTime(time)}
                </span>
                <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 z-20 text-[11px] bg-black/75 text-gray-200 px-1 rounded">
                    {formatTime(dur)}
                </span>
                </>
            )}
        </div>
    );
}
