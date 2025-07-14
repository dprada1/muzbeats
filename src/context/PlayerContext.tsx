import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import type { Beat } from '../types/Beat';

interface PlayerContextType {
	currentBeat: Beat | null;
	isPlaying: boolean;
	play: (beat: Beat) => void;
	pause: () => void;
	toggle: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
	const [currentBeat, setCurrentBeat] = useState<Beat | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	useEffect(() => {
		if (!audioRef.current) {
			audioRef.current = new Audio();
		}

		const audio = audioRef.current;
		audio.onended = () => setIsPlaying(false);
	}, []);

	const play = (beat: Beat) => {
		if (!audioRef.current) return;

		const audio = audioRef.current;
		if (currentBeat?.audio !== beat.audio) {
			audio.src = beat.audio;
			setCurrentBeat(beat);
		}

		audio.play();
		setIsPlaying(true);
	};

	const pause = () => {
		if (!audioRef.current) return;
		audioRef.current.pause();
		setIsPlaying(false);
	};

	const toggle = () => {
		if (!audioRef.current) return;
		isPlaying ? pause() : play(currentBeat!);
	};

	return (
		<PlayerContext.Provider value={{ currentBeat, isPlaying, play, pause, toggle }}>
		{children}
		</PlayerContext.Provider>
	);
}

export function usePlayer() {
	const context = useContext(PlayerContext);
	if (!context) {
		throw new Error('usePlayer must be used within a PlayerProvider');
	}
	return context;
}
