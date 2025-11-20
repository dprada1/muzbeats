# Search System Architecture

## Overview

The MuzBeats search system is a sophisticated two-layer architecture that parses natural language queries and converts them into optimized SQL database queries. This system was migrated from client-side filtering to backend database queries for better performance and scalability.

## Why Backend Search?

### Previous Approach (Client-Side)

**How it worked:**
- Frontend fetched ALL beats from API
- Client-side JavaScript filtered results
- Used `filterBeats()` function with parsed search params

**Problems:**
- ❌ Fetched all 63 beats even when searching for 1
- ❌ Doesn't scale (imagine 10,000 beats)
- ❌ Slow on mobile devices
- ❌ Wasted bandwidth
- ❌ Duplicate search logic (frontend + backend)

### Current Approach (Backend)

**How it works:**
- Frontend sends search query to API
- Backend parses query and builds SQL
- Database filters using indexes
- Only matching beats sent to client

**Benefits:**
- ✅ Only matching beats transferred
- ✅ Scales to millions of beats
- ✅ Fast (database indexes)
- ✅ Efficient bandwidth usage
- ✅ Single source of truth (backend)

## Architecture

### Two-Layer System

```
User Query: "pierre 160 C#min"
    │
    ▼
┌─────────────────────────────────────┐
│  Layer 1: Query Parsing              │
│  (searchParser.ts)                   │
│  - Extracts BPM: [160]               │
│  - Extracts Keys: ["C#min"]           │
│  - Extracts Keywords: ["pierre"]      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Layer 2: SQL Query Building              │
│  (searchQueryBuilder.ts)            │
│  - Adds enharmonic equivalents      │
│  - Builds WHERE clauses             │
│  - Parameterizes queries            │
└──────────────┬──────────────────────┘
               │
               ▼
         PostgreSQL
```

## Layer 1: Query Parsing

### File: `server/src/utils/searchParser.ts`

**Purpose:** Parse raw query string into structured `SearchParams` object.

**Input:** `"pierre 160 C#min"`

**Output:**
```typescript
{
  bpmValues: [160],
  bpmRanges: [],
  keys: ["C#min"],
  queryTokens: ["pierre"]
}
```

### Parsing Logic

1. **Tokenization**
   - Splits query on whitespace
   - Preserves special characters (#, ♯, ♭, -, –, —)

2. **BPM Detection**
   - Exact: `160`, `160bpm` → `bpmValues: [160]`
   - Range: `150-170` → `bpmRanges: [[150, 170]]`

3. **Key Detection**
   - Patterns: `Cm`, `CM`, `C min`, `C#min`, `C sharp minor`
   - Case-sensitive: `CM` = major, `Cm` = minor
   - Normalizes to: `cmin`, `cmaj`, etc.

4. **Keyword Extraction**
   - Remaining tokens become keywords
   - Searches in beat titles

### Why This Approach?

**Natural Language Parsing:**
- Users can type naturally: "pierre 160 C#min"
- No need for separate input fields
- Familiar search experience

**Flexible Syntax:**
- Supports multiple formats: `160`, `160bpm`, `150-170`
- Handles variations: `C min`, `Cmin`, `Cm`
- Case-sensitive keys: `CM` vs `Cm`

## Layer 2: SQL Query Building

### File: `server/src/utils/searchQueryBuilder.ts`

**Purpose:** Convert `SearchParams` into SQL WHERE clauses.

### Key Features

#### 1. Enharmonic Equivalent Expansion

**What it does:**
- Takes search key: `"amin"`
- Looks up equivalents: `["cmaj", "b#maj"]`
- Searches for all variants

**Example:**
```typescript
// User searches: "Am"
// System expands to: ["amin", "cmaj", "b#maj"]
// SQL searches for all three
```

**Why:**
- Musicians use different key names
- "A minor" and "C major" are the same notes
- Better search results

#### 2. Symbol Normalization

**Problem:** Database uses `♯` (Unicode), users type `#` (ASCII)

**Solution:**
- Converts `#` → `♯` for database matching
- Tries both patterns to catch all variations
- Handles both symbols seamlessly

#### 3. Space Handling

**Problem:** Database has `"C min"` (with space), user types `"Cmin"` (no space)

**Solution:**
- Multiple SQL patterns:
  - Exact match: `REPLACE(key, ' ', '') = 'cmin'`
  - With space: `key LIKE '%c min%'`
  - Without space: `REPLACE(key, ' ', '') LIKE '%cmin%'`

#### 4. Parameterized Queries

**Security:**
- All user input uses `$1`, `$2`, etc. placeholders
- Prevents SQL injection
- Type-safe parameter binding

**Example:**
```sql
-- ❌ BAD (SQL injection vulnerable)
WHERE bpm = ${userInput}

-- ✅ GOOD (parameterized)
WHERE bpm = $1
-- params: [userInput]
```

## Database Query Structure

### Generated SQL Example

**Query:** `?q=pierre 160 C#min`

**Generated SQL:**
```sql
SELECT id, title, key, bpm, price, audio_path, cover_path 
FROM beats 
WHERE (
  -- BPM match
  bpm = ANY($1::int[])
) AND (
  -- Key match (with enharmonic equivalents)
  (LOWER(REPLACE(key, ' ', '')) = $2 OR ...)
) AND (
  -- Title keyword match
  LOWER(title) LIKE $3 AND ...
)
ORDER BY created_at DESC
```

**Parameters:**
```javascript
[160, 'c#min', '%pierre%']
```

## Enharmonic Key Matching

### What Are Enharmonic Equivalents?

**Enharmonic Keys:**
- Same pitches, different names
- Example: C# = Db (same notes, different spelling)

**Relative Keys:**
- Share the same notes, different tonal center
- Example: C major = A minor (same notes, different root)

### Implementation

**File:** `server/src/utils/keyUtils.ts`

**Lookup Table:**
```typescript
const ENHARMONIC_MAP = {
  "amin": ["cmaj", "b#maj"],
  "cmaj": ["b#maj", "amin"],
  "cmin": ["ebmaj"],
  // ... more mappings
};
```

**Usage:**
```typescript
getEnharmonicEquivalents("amin")
// Returns: ["cmaj", "b#maj"]
```

**Why This Matters:**
- User searches "Am" → finds C major beats too
- More comprehensive results
- Better user experience

## Case Sensitivity

### Key Quality Notation

**Problem:** Need to distinguish `CM` (major) from `Cm` (minor)

**Solution:**
- Check uppercase `M` FIRST (before lowercase `m`)
- Case-sensitive regex patterns
- Normalize after detection

**Flow:**
1. Input: `"CM"`
2. Match uppercase `M` → `"cmaj"`
3. Input: `"Cm"`
4. Match lowercase `m` → `"cmin"`

**Why This Order?**
- If we check lowercase first, `CM` would match `m` (case-insensitive)
- Checking uppercase first ensures correct interpretation

## Performance Optimizations

### Database Indexes

**Created Indexes:**
```sql
CREATE INDEX idx_beats_bpm ON beats(bpm);
CREATE INDEX idx_beats_key ON beats(key);
CREATE INDEX idx_beats_price ON beats(price);
```

**Why:**
- Fast filtering on indexed columns
- BPM filtering uses index (very fast)
- Key filtering uses index (very fast)

### Query Optimization

**Connection Pooling:**
- Reuses database connections
- Max 20 concurrent connections
- 30s idle timeout

**Parameterized Queries:**
- Prepared statements (faster)
- SQL injection safe
- Type-safe

## Frontend Integration

### How Frontend Uses Backend Search

**File:** `client/src/pages/StorePage.tsx`

**Before (Client-Side):**
```typescript
// ❌ Old way
fetch("/api/beats")
  .then(beats => filterBeats(beats, searchParams))
```

**After (Backend):**
```typescript
// ✅ New way
const apiUrl = searchQuery 
  ? `/api/beats?q=${encodeURIComponent(searchQuery)}`
  : '/api/beats';
fetch(apiUrl)
  .then(beats => setBeats(beats)) // Already filtered!
```

**Benefits:**
- Less code in frontend
- Faster (database does the work)
- Scales better

## Search Query Examples

### Simple Queries

```bash
# Keyword only
?q=pierre
→ Finds all beats with "pierre" in title

# BPM only
?q=160
→ Finds all beats with BPM = 160

# Key only
?q=Cm
→ Finds all C minor beats (and enharmonic equivalents)

# Combined
?q=pierre 160 C#min
→ Finds beats matching ALL criteria
```

### Advanced Queries

```bash
# BPM range
?q=150-170
→ Finds beats with BPM between 150 and 170

# Multiple keys
?q=Cm Am
→ Finds C minor OR A minor beats

# Complex
?q=shoreline 95-105 Bmin
→ Finds Shoreline beats, 95-105 BPM, B minor key
```

## Future Enhancements

### Potential Improvements

1. **Full-Text Search**
   - PostgreSQL full-text search for better title matching
   - Ranking by relevance
   - Fuzzy matching

2. **Search History**
   - Track popular searches
   - Suggest completions
   - Analytics

3. **Advanced Filters**
   - Price range
   - Date range
   - Multiple keys (AND/OR logic)

4. **Search Result Ranking**
   - Relevance scoring
   - Popularity weighting
   - Recency boost

---

**Last Updated**: November 2025
**Status**: ✅ Implemented and Production-Ready

