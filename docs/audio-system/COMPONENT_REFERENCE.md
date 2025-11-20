# Audio System Component Reference

Quick reference for developers working with the audio system.

## PlayerContext

**Location:** `client/src/context/PlayerContext.tsx`

**Usage:**
```typescript
import { usePlayer } from '@/context/PlayerContext';

function MyComponent() {
  const { currentBeat, isPlaying, play, pause } = usePlayer();
  
  return (
    <button onClick={() => play(beat)}>
      Play {beat.title}
    </button>
  );
}
```

**API:**
- `currentBeat: Beat | null` - Currently playing beat
- `isPlaying: boolean` - Whether audio is playing
- `isLoop: boolean` - Whether loop is enabled
- `audio: HTMLAudioElement | null` - The audio element (use sparingly)
- `play(beat: Beat, startTime?: number)` - Start playing a beat
- `pause()` - Pause playback
- `toggle()` - Toggle play/pause
- `toggleLoop()` - Toggle loop mode

## Waveform Component

**Location:** `client/src/components/Waveform/index.tsx`

**Usage:**
```typescript
import Waveform from '@/components/Waveform';

<Waveform 
  beat={beat} 
  isVisible={isVisible}
  onReady={() => console.log('Waveform loaded')}
/>
```

**Props:**
- `beat: Beat` - The beat to display
- `isVisible?: boolean` - Whether waveform should load (default: true)
- `onReady?: () => void` - Callback when waveform is ready

**Note:** `isVisible` should be controlled by IntersectionObserver in parent component.

## WaveformContext

**Location:** `client/src/context/WaveformContext.tsx`

**Usage:**
```typescript
import { useWaveformCache } from '@/context/WaveformContext';

function MyComponent() {
  const { buffers, setBuffer, positions, setPosition } = useWaveformCache();
  
  // Access cached buffer
  const buffer = buffers[beatId];
  
  // Save position
  setPosition(beatId, 45.2); // 45.2 seconds
}
```

**API:**
- `buffers: Record<string, AudioBuffer>` - Cached audio buffers
- `setBuffer(id: string, buffer: AudioBuffer)` - Cache a buffer
- `positions: Record<string, number>` - Cached playhead positions
- `setPosition(id: string, position: number)` - Save a position

## PlayerBar

**Location:** `client/src/components/PlayerBar/index.tsx`

**Usage:**
```typescript
import PlayerBar from '@/components/PlayerBar';

// In your layout
<PlayerBar />
```

**Features:**
- Fixed bottom bar
- Shows current beat metadata
- Playback controls (play/pause, skip, loop)
- Progress bar (seekable)
- Volume control
- Add to cart button

## Internal Hooks (Advanced)

### useWaveSurferInit

**Location:** `client/src/components/Waveform/internal/useWaveSurferInit.ts`

**Purpose:** Creates and manages WaveSurfer instance lifecycle.

**When to use:** Only if extending waveform functionality.

### useWaveSurferSync

**Location:** `client/src/components/Waveform/internal/useWaveSurferSync.ts`

**Purpose:** Synchronizes WaveSurfer cursor with `<audio>` element.

**When to use:** Only if modifying sync behavior.

### useWaveSurferInteraction

**Location:** `client/src/components/Waveform/internal/useWaveSurferInteraction.ts`

**Purpose:** Handles click/drag interactions on waveform.

**When to use:** Only if modifying interaction behavior.

---

**Last Updated**: November 2025

