import React, { createContext, useContext, useRef } from 'react';

type AudioBufferMap = Record<string, AudioBuffer>;
type PositionMap    = Record<string, number>;

interface WaveformCache {
    buffers: AudioBufferMap;
    setBuffer: (id: string, buf: AudioBuffer) => void;
    positions: PositionMap;
    setPosition: (id: string, pos: number) => void;
}

const WaveformCacheContext = createContext<WaveformCache>({
    buffers: {},
    setBuffer: () => {},
    positions: {},
    setPosition: () => {},
});

export const WaveformCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const buffersRef   = useRef<AudioBufferMap>({});
    const positionsRef = useRef<PositionMap>({});

    const setBuffer   = (id: string, buf: AudioBuffer) => {
        buffersRef.current[id] = buf;
    };
    const setPosition = (id: string, pos: number) => {
        positionsRef.current[id] = pos;
    };

    return (
        <WaveformCacheContext.Provider
            value={{
                buffers:   buffersRef.current,
                setBuffer,
                positions: positionsRef.current,
                setPosition,
            }}
        >
            {children}
        </WaveformCacheContext.Provider>
    );
};

export function useWaveformCache() {
    return useContext(WaveformCacheContext);
}
