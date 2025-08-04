import { useEffect, useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useSearch } from '@/context/SearchContext';
import type { Beat } from '@/types/Beat';

/** Value shape provided by PlayerBarContext */
export interface PlayerBarContextType {
    /** The currently loaded beat, or null if none */
    currentBeat: Beat | null;
    /** Is audio actively playing? */
    isPlaying: boolean;
    /** Toggle play/pause on the current track */
    togglePlay: () => void;
    /** Is loop mode enabled? */
    isLoop: boolean;
    /** Toggle loop mode */
    toggleLoop: () => void;
    /** Playback head in seconds */
    currentTime: number;
    /** Track duration in seconds */
    duration: number;
    /** Current volume 0–1 */
    volume: number;
    /** Set volume 0–1 */
    setVolume: (v: number) => void;
    /** Is muted? */
    isMuted: boolean;
    /** Toggle mute/unmute, storing/restoring last volume */
    toggleMute: () => void;
    /** No track is loaded into the player */
    noTrackLoaded: boolean;
    /** Can we skip backward? (false if at first track or none) */
    canSkipPrevious: boolean;
    /** Can we skip forward? (false if at last track or none) */
    canSkipNext: boolean;
    /** Skip to previous track */
    skipPrevious: () => void;
    /** Skip to next track */
    skipNext: () => void;
    /** Seek playhead to time (seconds) */
    seekTo: (t: number) => void;
}

/**
 * Encapsulates all PlayerBar logic:
 * • syncing time & duration  
 * • volume & mute handling  
 * • skip & loop controls  
 * • context‐aware disabling  
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
