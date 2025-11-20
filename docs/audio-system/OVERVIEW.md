# Audio System Overview

## 🎯 Purpose

The audio system provides synchronized audio playback and waveform visualization across multiple beat cards. It uses a **single HTML5 `<audio>` element** for playback and **WaveSurfer.js** instances for visual waveforms.

## 🏗️ Architecture

### Core Principle: Single Audio Source

**Why?**
- Browser audio APIs are resource-intensive
- Multiple `<audio>` elements cause performance issues
- Single source ensures consistent playback state

**Implementation:**
- One `<audio>` element managed by `PlayerContext`
- All waveforms sync to this single audio source
- Waveforms are visual-only (muted)

### Component Hierarchy

```
App
└─ PlayerProvider (context)
   ├─ PlayerBar (fixed bottom bar)
   │  └─ usePlayerBar (syncs time, volume, controls)
   │
   └─ Beat Cards (multiple)
      └─ Waveform (per card)
         └─ useWaveform (orchestrates WaveSurfer)
            ├─ useWaveSurferInit (creates/destroys WS)
            ├─ useWaveSurferSync (syncs with <audio>)
            └─ useWaveSurferInteraction (click/drag to seek)
```

## 🔄 Data Flow

### Playback Flow

1. **User clicks play on a beat card**
   - `PlayerContext.play(beat)` is called
   - `<audio>.src` is set to beat's audio URL
   - `<audio>.play()` starts playback

2. **Active waveform syncs**
   - `useWaveSurferSync` listens to `<audio>` `timeupdate` events
   - Updates WaveSurfer cursor position
   - Updates time badges

3. **Inactive waveforms show cached position**
   - Each beat remembers its last playhead position
   - Inactive waveforms display this cached position
   - No active sync (saves resources)

### Seeking Flow

1. **User clicks/drags waveform**
   - `useWaveSurferInteraction` handles the event
   - Calculates target time from click position
   - If inactive: starts playback, then seeks
   - If active: seeks immediately
   - Updates cached position

2. **Audio element seeks**
   - `<audio>.currentTime` is set
   - `timeupdate` events fire
   - Waveform cursor updates

## 📦 Key Components

### PlayerContext (`context/PlayerContext.tsx`)

**Responsibility:** Manages the single `<audio>` element and playback state.

**Key Features:**
- Creates one `<audio>` element on mount
- Tracks current beat and playing state
- Handles play/pause/toggle
- Keyboard shortcuts (Space, MediaPlayPause)
- Loop functionality

**API:**
```typescript
{
  currentBeat: Beat | null;
  isPlaying: boolean;
  audio: HTMLAudioElement | null;
  play: (beat: Beat, startTime?: number) => void;
  pause: () => void;
  toggle: () => void;
  toggleLoop: () => void;
}
```

### WaveformContext (`context/WaveformContext.tsx`)

**Responsibility:** Caches decoded audio buffers and playhead positions.

**Why Cache?**
- Decoding audio is expensive
- Caching allows instant waveform rendering
- Positions allow resume-from-where-you-left-off

**Cached Data:**
- `buffers`: Map of beat ID → AudioBuffer (decoded audio)
- `positions`: Map of beat ID → number (last playhead position in seconds)

### Waveform Component (`components/Waveform/index.tsx`)

**Responsibility:** Renders a waveform visualization for a single beat.

**Features:**
- Lazy loads WaveSurfer when visible
- Shows time badges (current/total)
- Handles visibility via IntersectionObserver (parent component)

### useWaveform Hook (`components/Waveform/useWaveform.ts`)

**Responsibility:** Orchestrates all waveform functionality.

**Composition:**
- `useWaveSurferInit` - Creates/destroys WaveSurfer instance
- `useWaveSurferSync` - Syncs with `<audio>` or shows cached position
- `useWaveSurferInteraction` - Handles click/drag to seek

## 🎨 WaveSurfer Integration

### Initialization

**When:** WaveSurfer is created when:
- Beat card becomes visible (IntersectionObserver)
- OR beat becomes active (currently playing)

**Configuration:**
```typescript
{
  waveColor: '#888',      // Gray waveform
  progressColor: '#fff',  // White progress
  cursorColor: 'transparent', // No cursor (we sync manually)
  barWidth: 2,
  barRadius: 2,
  barGap: 1,
  interact: true,         // Allow clicking/dragging
  normalize: true,        // Normalize audio levels
}
```

### Caching Strategy

**Audio Buffer Caching:**
1. First load: Decode audio → store in `WaveformContext.buffers`
2. Subsequent loads: Use cached buffer → instant rendering
3. No network request, no decoding

**Position Caching:**
1. User seeks or plays → save position to `WaveformContext.positions`
2. Card becomes inactive → waveform shows cached position
3. Card becomes active → syncs with `<audio>` time

## 🔄 Synchronization

### Active Beat Synchronization

**How it works:**
- `useWaveSurferSync` listens to `<audio>` `timeupdate` events
- Updates WaveSurfer cursor: `ws.seekTo(audio.currentTime / duration)`
- Updates time badges
- Saves position to cache

**Frequency:** ~4 times per second (browser's `timeupdate` rate)

### Inactive Beat Display

**How it works:**
- Waveform shows cached position from `positions[beatId]`
- No event listeners (saves resources)
- Updates only when beat becomes active

## 🎯 Design Decisions

### Why Single Audio Element?

**Problem:** Multiple `<audio>` elements cause:
- High memory usage
- Browser throttling issues
- Inconsistent playback state

**Solution:** One `<audio>` element, multiple visual waveforms

**Trade-off:**
- ✅ Better performance
- ✅ Consistent state
- ❌ More complex synchronization

### Why Cache Audio Buffers?

**Problem:** Decoding audio is expensive:
- Network request
- Audio decoding
- Waveform rendering

**Solution:** Cache decoded `AudioBuffer` objects

**Trade-off:**
- ✅ Instant rendering on subsequent views
- ✅ Better UX
- ❌ Memory usage (acceptable for reasonable number of beats)

### Why Cache Positions?

**Problem:** Users want to resume where they left off

**Solution:** Save playhead position per beat

**Trade-off:**
- ✅ Better UX
- ✅ Minimal memory cost
- ❌ Slightly more complex state management

### Why Lazy Load Waveforms?

**Problem:** Rendering all waveforms at once is expensive

**Solution:** Only render visible waveforms (IntersectionObserver)

**Trade-off:**
- ✅ Better performance
- ✅ Faster initial load
- ❌ Slight delay when scrolling

## 🐛 Common Issues & Solutions

### Waveform Not Syncing

**Cause:** WaveSurfer instance not created or destroyed

**Solution:** Check `isVisible` prop and IntersectionObserver

### Audio Not Playing

**Cause:** Browser autoplay policy or missing audio file

**Solution:** Ensure user interaction before `audio.play()`

### Position Not Cached

**Cause:** `setPosition` not called on seek

**Solution:** Check `useWaveSurferInteraction` and `useWaveSurferSync`

## 📝 Key Files

- `context/PlayerContext.tsx` - Audio playback management
- `context/WaveformContext.tsx` - Buffer and position caching
- `components/Waveform/useWaveform.ts` - Main waveform orchestrator
- `components/Waveform/internal/useWaveSurferInit.ts` - WaveSurfer lifecycle
- `components/Waveform/internal/useWaveSurferSync.ts` - Audio synchronization
- `components/Waveform/internal/useWaveSurferInteraction.ts` - User interaction
- `components/PlayerBar/usePlayerBar.tsx` - Player bar state management

---

**Last Updated**: November 2025

