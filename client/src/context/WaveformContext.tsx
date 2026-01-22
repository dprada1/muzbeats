import React, { createContext, useContext, useRef } from 'react';

type AudioBufferMap = Record<string, AudioBuffer>;
type PositionMap    = Record<string, number>;

interface WaveformCache {
    buffers:     AudioBufferMap;
    setBuffer:   (id: string, buf: AudioBuffer) => void;
    positions:   PositionMap;
    setPosition: (id: string, pos: number) => void;
    clearCache:  () => void;
}

const WaveformCacheContext = createContext<WaveformCache>({
    buffers:     {},
    setBuffer:   () => {},
    positions:   {},
    setPosition: () => {},
    clearCache:  () => {},
});

/**
 * Maximum number of AudioBuffers to cache (LRU eviction)
 * Each buffer is ~10-50MB depending on audio length/quality.
 * 15 buffers = ~150-750MB max memory usage for waveform cache.
 */
const MAX_CACHED_BUFFERS = 15;

export const WaveformCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const buffersRef = useRef<AudioBufferMap>({});
    const positionsRef = useRef<PositionMap>({});
    // Track access order for LRU eviction (oldest first)
    const accessOrderRef = useRef<string[]>([]);

    const setBuffer = (id: string, buf: AudioBuffer) => {
        const buffers = buffersRef.current;
        const accessOrder = accessOrderRef.current;
        
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
            const lruId = accessOrder.shift();
            if (lruId) {
                delete buffers[lruId];
                delete positionsRef.current[lruId];
                if (import.meta.env.DEV) {
                    console.log(`[WaveformCache] Evicted: ${lruId.slice(0, 8)}... | Size: ${accessOrder.length + 1}/${MAX_CACHED_BUFFERS}`);
                }
            }
        }
        
        // Add new buffer to end (most recently used)
        buffers[id] = buf;
        accessOrder.push(id);
        if (import.meta.env.DEV) {
            console.log(`[WaveformCache] Added: ${id.slice(0, 8)}... | Size: ${accessOrder.length}/${MAX_CACHED_BUFFERS}`);
        }
    };

    const setPosition = (id: string, pos: number) => {
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
                setBuffer,
                positions: positionsRef.current,
                setPosition,
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
