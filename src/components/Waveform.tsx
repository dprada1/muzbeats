import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { usePlayer } from '../context/PlayerContext';
import type { Beat } from '../types/Beat';

const fmt = (t = 0) => {
	const m = Math.floor(t / 60);
	const s = Math.round(t % 60).toString().padStart(2, '0');
	return `${m}:${s}`;
};

export default function Waveform({ beat }: { beat: Beat }) {
	const wrapperRef = useRef<HTMLDivElement>(null);       // observed node
	const wavesurferRef = useRef<WaveSurfer | null>(null); // WS instance

	const { audio, currentBeat, play } = usePlayer();
	const isActive = currentBeat?.id === beat.id;

	const [isVisible, setVisible] = useState(false); // IO callback sets true
	const [time, setTime] = useState(0);
	const [dur, setDur] = useState(0);

	useEffect(() => {
		const el = wrapperRef.current;
		if (!el) return;

		const io = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting) {
			setVisible(true);
			io.disconnect(); // load once, then stop observing
			}
		},
		{ rootMargin: '200px' } // preload a bit before entering viewport
		);

		io.observe(el);
		return () => io.disconnect();
	}, []);

	useEffect(() => {
		if (!isVisible || !wrapperRef.current) return;

		if (!wavesurferRef.current) {
			wavesurferRef.current = WaveSurfer.create({
				container: wrapperRef.current,
				waveColor: '#888',
				progressColor: '#fff',
				cursorColor: 'transparent',
				barWidth: 2,
				height: 64,
				interact: true,
			});
			wavesurferRef.current.setMuted(true);
			
			// Show duration
			wavesurferRef.current.on('decode', (duration: number) => {
				setDur(duration);
				setTime(0);
			});
			wavesurferRef.current.load(beat.audio); // decode happens here
		}

		return () => {
			wavesurferRef.current?.destroy();
			wavesurferRef.current = null;
		};
	}, [isVisible, beat.audio]);

	useEffect(() => {
		const ws = wavesurferRef.current;
		if (!audio || !ws) return;

		if (isActive) {
			const tick = () => {
				setTime(audio.currentTime);
				if (audio.duration) {
					ws.seekTo(audio.currentTime / audio.duration);
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
			ws.seekTo(0);
			setTime(0);
		}
	}, [isActive, audio]);

	useEffect(() => {
		if (!isActive || !audio || !wavesurferRef.current) return;

		const ws = wavesurferRef.current;
		const onSeek = (sec: number) => {
			if (!isActive) {
				/* load & play the clicked beat if it isn’t already active */
				play(beat);
				return;
			} else {
				audio.currentTime = sec;
				if (audio.paused) audio.play().catch(() => null);
			}
		};
		ws.on('interaction', onSeek);
		return () => ws.un('interaction', onSeek);
	}, [isActive, audio]);

	return (
		<div ref={wrapperRef} className="relative w-full h-16 rounded">
		{/* show badges only after WS exists (when visible) */}
		{wavesurferRef.current && (
			<>
			<span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 z-20 text-[11px] bg-black/75 text-gray-200 px-1 rounded">
				{fmt(time)}
			</span>
			<span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 z-20 text-[11px] bg-black/75 text-gray-200 px-1 rounded">
				{fmt(dur)}
			</span>
			</>
		)}
		</div>
	);
}
