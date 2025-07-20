import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { usePlayer } from '../context/PlayerContext';
import type { Beat } from '../types/Beat';

/* helper to format mm:ss ------------------------------------------------- */
const fmt = (t = 0) => {
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function WaveformMuted({ beat }: { beat: Beat }) {
  /* refs ----------------------------------------------------------------- */
  const wrapperRef = useRef<HTMLDivElement>(null);   // «relative» wrapper
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  /* context -------------------------------------------------------------- */
  const { audio, currentBeat } = usePlayer();
  const isActive = currentBeat?.id === beat.id;

  /* local time state ----------------------------------------------------- */
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  /* create + load + keep muted ------------------------------------------ */
  useEffect(() => {
    if (!wrapperRef.current) return;

    if (!wavesurferRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: wrapperRef.current,    // ⬅️ container = wrapper
        waveColor: '#888',
        progressColor: 'white',
        cursorColor: 'transparent',
        barWidth: 2,
        height: 64,
        interact: true,
      });
      wavesurferRef.current.setMuted(true);
    }

    wavesurferRef.current.load(beat.audio);

    return () => {
      wavesurferRef.current?.destroy();
      wavesurferRef.current = null;
    };
  }, [beat.audio]);

  /* mirror <audio> progress --------------------------------------------- */
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!audio || !ws) return;

    if (isActive) {
      /* sync badges */
      const tick = () => setTime(audio.currentTime);
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
      ws.seekTo(0);
      setTime(0);
    }
  }, [isActive, audio]);

  /* click / drag to seek ------------------------------------------------- */
  useEffect(() => {
    if (!isActive || !audio || !wavesurferRef.current) return;
    const ws = wavesurferRef.current;
    const onSeek = (newSec: number) => (audio.currentTime = newSec);
    ws.on('interaction', onSeek);
    return () => ws.un('interaction', onSeek);
  }, [isActive, audio]);

  /* --------------------------------------------------------------------- */
  return (
    <div ref={wrapperRef} className="relative w-full h-16 rounded">
      {/* time badges ---------------------------------------------------- */}
      <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[11px] bg-black/75 z-20 text-gray-200 px-1">
        {fmt(time)}
      </span>
      <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[11px] bg-black/75 z-20 text-gray-200 px-1">
        {fmt(dur)}
      </span>
    </div>
  );
}
