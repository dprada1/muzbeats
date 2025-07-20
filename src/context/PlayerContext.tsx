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
    /** the single global <audio> element (read-only) */
    audio: HTMLAudioElement | null;
    play: (beat: Beat) => void;
    pause: () => void;
    toggle: () => void;
  }
  
  const PlayerContext = createContext<PlayerContextType | undefined>(undefined);
  
  export function PlayerProvider({ children }: { children: ReactNode }) {
    const [currentBeat, setCurrentBeat] = useState<Beat | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
  
    /* create the lone <audio> element exactly once */
    useEffect(() => {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        /* when a track finishes, flip state */
        audioRef.current.onended = () => setIsPlaying(false);
      }
    }, []);
  
    const play = (beat: Beat) => {
      if (!audioRef.current) return;
  
      const audio = audioRef.current;
  
      /* load the file only if we switched tracks */
      if (currentBeat?.audio !== beat.audio) {
        audio.src = beat.audio;
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
  
    return (
      <PlayerContext.Provider
        value={{
          currentBeat,
          isPlaying,
          audio: audioRef.current,
          play,
          pause,
          toggle,
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
  