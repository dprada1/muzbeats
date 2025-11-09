import { useEffect, useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useSearch } from '@/context/SearchContext';
import type { Beat } from '@/types/Beat';

export interface PlayerBarContextType {
    currentBeat: Beat | null;
    isPlaying: boolean;
    togglePlay: () => void;
    isLoop: boolean;
    toggleLoop: () => void;
    currentTime: number;
    duration: number;
    /** Current volume 0–1 */
    volume: number;
    setVolume: (v: number) => void;
    isMuted: boolean;
    /** Toggle mute/unmute, storing/restoring last volume */
    toggleMute: () => void;
    noTrackLoaded: boolean;
    canSkipPrevious: boolean;
    canSkipNext: boolean;
    skipPrevious: () => void;
    skipNext: () => void;
    seekTo: (t: number) => void;
}

/**
 * Encapsulates all PlayerBar logic:
 * - syncing time & duration  
 * - volume & mute handling  
 * - skip & loop controls  
 * - context‐aware disabling  
 */
export default function usePlayerBar(): PlayerBarContextType {
    const { currentBeat, isPlaying, toggle, isLoop, toggleLoop, play, audio } = usePlayer();
    const { beats } = useSearch();

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration]       = useState(0);
    const [volume, setVolume]           = useState(audio?.volume ?? 1);
    const [isMuted, setIsMuted]         = useState(audio?.muted ?? false);
    const [lastVolume, setLastVolume]   = useState(volume);

    // Sync playhead time and duration
    useEffect(() => {
        if (!audio) return;
        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onLoadedMeta = () => setDuration(audio.duration);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onLoadedMeta);
        onTimeUpdate();
        onLoadedMeta();
        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('loadedmetadata', onLoadedMeta);
        };
    }, [audio]);

    // Sync volume to audio element
    useEffect(() => {
        if (audio) audio.volume = volume;
    }, [volume, audio]);

    // Sync muted flag to audio element
    useEffect(() => {
        if (audio) audio.muted = isMuted;
    }, [isMuted, audio]);

    // Seek helper
    const seekTo = (t: number) => {
        if (audio) audio.currentTime = t;
    };

    // Find this track's index in the playlist
    const index = currentBeat
        ? beats.findIndex(b => b.id === currentBeat.id)
        : -1;
    const canSkipPrevious = index > 0;
    const canSkipNext     = index !== -1 && index < beats.length - 1;

    // Skip helpers
    const skipPrevious = () => {
        if (canSkipPrevious) play(beats[index - 1]);
    };
    const skipNext = () => {
        if (canSkipNext) play(beats[index + 1]);
    };

    // Mute/unmute with restore
    const toggleMute = () => {
        if (!audio) return;
        if (!isMuted) {
            setLastVolume(volume);
            setVolume(0);
            setIsMuted(true);
        } else {
            setVolume(lastVolume);
            setIsMuted(false);
        }
    };

    return {
        currentBeat,
        isPlaying,
        togglePlay: toggle,
        isLoop,
        toggleLoop,
        currentTime,
        duration,
        volume,
        setVolume,
        isMuted,
        toggleMute,
        noTrackLoaded: !currentBeat,
        canSkipPrevious,
        canSkipNext,
        skipPrevious,
        skipNext,
        seekTo,
    };
}
