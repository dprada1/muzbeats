import React, { createContext, useContext, useRef } from 'react';

type AudioBufferMap = Record<string, AudioBuffer>;
type PositionMap    = Record<string, number>;

interface WaveformCache {
    buffers: AudioBufferMap;
    cacheAudioBuffer: (id: string, buf: AudioBuffer) => void;
    positions: PositionMap;
    saveResumePosition: (id: string, pos: number) => void;
    clearCache: () => void;
}

const WaveformCacheContext = createContext<WaveformCache>({
    buffers: {},
    cacheAudioBuffer: () => {},
    positions: {},
    saveResumePosition: () => {},
    clearCache: () => {},
});

/**
 * Maximum number of AudioBuffers to cache (LRU eviction).
 * Each decoded buffer is typically ~10–50MB+ depending on length/channels.
 * 10 buffers ≈ a few hundred MB worst case for the shared cache alone.
 */
const MAX_CACHED_BUFFERS = 10;

export const WaveformCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const buffersRef = useRef<AudioBufferMap>({});
    const positionsRef = useRef<PositionMap>({});
    // Track access order for LRU eviction (oldest first)
    const accessOrderRef = useRef<string[]>([]);

    const cacheAudioBuffer = (id: string, buf: AudioBuffer) => {
        const buffers: AudioBufferMap = buffersRef.current;
        const accessOrder: string[] = accessOrderRef.current;
        
        // If buffer already exists, move it to end (most recently used)
        if (buffers[id]) {
            const index = accessOrder.indexOf(id);
            if (index > -1) {
                accessOrder.splice(index, 1);
            }
            accessOrder.push(id);
            buffers[id] = buf;
            return;
        }
        
        // If cache is full, remove least recently used (first in array)
        if (accessOrder.length >= MAX_CACHED_BUFFERS) {
            const LRUId = accessOrder.shift();
            if (LRUId) {
                delete buffers[LRUId];
                delete positionsRef.current[LRUId];
                if (import.meta.env.DEV) {
                    console.log(`[WaveformCache] Evicted: ${LRUId.slice(0, 8)}... | Size: ${accessOrder.length + 1}/${MAX_CACHED_BUFFERS}`);
                }
            }
            // accessOrder was originally empty, skip
        }
        
        // Add new buffer to end (most recently used)
        buffers[id] = buf;
        accessOrder.push(id);
        if (import.meta.env.DEV) {
            console.log(`[WaveformCache] Added: ${id.slice(0, 8)}... | Size: ${accessOrder.length}/${MAX_CACHED_BUFFERS}`);
        }
    };

    const saveResumePosition = (id: string, pos: number) => {
        positionsRef.current[id] = pos;
    };

    const clearCache = () => {
        buffersRef.current = {};
        positionsRef.current = {};
        accessOrderRef.current = [];
    };

    return (
        <WaveformCacheContext.Provider
            value={{
                buffers:   buffersRef.current,
                cacheAudioBuffer,
                positions: positionsRef.current,
                saveResumePosition,
                clearCache,
            }}
        >
            {children}
        </WaveformCacheContext.Provider>
    );
};

export function useWaveformCache() {
    return useContext(WaveformCacheContext);
}
