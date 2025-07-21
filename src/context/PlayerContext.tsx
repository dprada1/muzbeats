import {
    createContext,
    useContext,
    useRef,
    useState,
    useEffect,
    type ReactNode,
} from 'react';
import type { Beat } from '../types/Beat';

interface PlayerContextType {
	currentBeat: Beat | null;
    isPlaying: boolean;
    audio: HTMLAudioElement | null;
	isLoop: boolean;
    play: (beat: Beat) => void;
    pause: () => void;
    toggle: () => void;
	toggleLoop: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
    const [currentBeat, setCurrentBeat] = useState<Beat | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
	const [isLoop, setIsLoop] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Create the lone <audio> element exactly once
    useEffect(() => {
		/* create the single <audio> once */
		if (!audioRef.current) audioRef.current = new Audio();
		const audio = audioRef.current;
	
		/* sync UI ↔ hardware media keys / OS controls */
		const onPlay  = () => setIsPlaying(true);
		const onPause = () => setIsPlaying(false);
	
		audio.addEventListener('play', onPlay);
		audio.addEventListener('pause', onPause);
		audio.addEventListener('ended', onPause); // reset at end
	
		/* optional: keyboard Space + MediaPlayPause key */
		const key = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement).tagName;
			const typing =
				tag === 'INPUT' ||
				tag === 'TEXTAREA' ||
				(e.target as HTMLElement).isContentEditable;
		
			if (e.code === 'Space' && !typing) {
				e.preventDefault();
				toggle();
			}
		  	if (e.code === 'MediaPlayPause') toggle();
		};
		window.addEventListener('keydown', key);
	
		return () => {
			audio.removeEventListener('play', onPlay);
			audio.removeEventListener('pause', onPause);
			audio.removeEventListener('ended', onPause);
			window.removeEventListener('keydown', key);
		};
	}, []);

    const play = (beat: Beat) => {
		if (!audioRef.current) return;

		const audio = audioRef.current;

		// Load the file only if we switched tracks
		if (currentBeat?.audio !== beat.audio) {
			audio.src = beat.audio;
			audio.loop = isLoop;
			setCurrentBeat(beat);
		}

		audio.play().catch(console.error);
		setIsPlaying(true);
    };

    const pause = () => {
		if (audioRef.current) {
			audioRef.current.pause();
			setIsPlaying(false);
		}
    };

    const toggle = () => {
		if (!audioRef.current || !currentBeat) return;
		isPlaying ? pause() : play(currentBeat);
    };

	const toggleLoop = () => {
		if (!audioRef.current) return;
		const next = !isLoop;
		audioRef.current.loop = next;
		setIsLoop(next);
	}

    return (
		<PlayerContext.Provider
			value={{
			currentBeat,
			isPlaying,
			isLoop,
			audio: audioRef.current,
			play,
			pause,
			toggle,
			toggleLoop,
			}}
		>
			{children}
		</PlayerContext.Provider>
    );
}

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
    return ctx;
}
