# Search Parser Overview

## 🎯 Purpose

The search parser converts natural language queries into structured search parameters and builds optimized SQL queries for the database. It supports BPM filtering, musical key matching (with enharmonic equivalents), and keyword search.

## 🏗️ Architecture

### Two-Layer System

```
User Query: "pierre 160 C#min"
    │
    ▼
┌─────────────────────────────────────┐
│  Layer 1: Query Parsing             │
│  (searchParser.ts)                  │
│  - Tokenizes input                  │
│  - Extracts BPM, keys, keywords     │
│  - Normalizes key notation          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Layer 2: SQL Query Building         │
│  (searchQueryBuilder.ts)            │
│  - Adds enharmonic equivalents      │
│  - Builds WHERE clauses              │
│  - Parameterizes queries             │
└──────────────┬──────────────────────┘
               │
               ▼
         PostgreSQL
```

**Why Two Layers?**
- **Separation of Concerns:** Parsing logic separate from SQL logic
- **Testability:** Can test parsing independently
- **Flexibility:** Could swap SQL builder for different database

## 📝 Query Syntax

### Supported Formats

**BPM:**
- Exact: `160`, `160bpm`
- Range: `150-170`, `150–170` (en-dash), `150—170` (em-dash)

**Keys:**
- Short: `Cm`, `CM`, `C#m`, `Cb`
- Full: `C min`, `C major`, `C# minor`
- Spelled: `C sharp minor`, `A flat major`
- Case-sensitive: `CM` = major, `Cm` = minor

**Keywords:**
- Any text not matching BPM or key patterns
- Searches in beat titles
- Multiple keywords = AND condition (all must match)

**Combined:**
```
pierre 160 C#min
→ Keywords: ["pierre"]
→ BPM: [160]
→ Keys: ["C#min"]
```

## 🔄 Processing Flow

### Step 1: Tokenization

**Input:** `"pierre 160 C#min"`

**Process:**
1. Replace non-word characters (except `#`, `♯`, `♭`, `-`, `–`, `—`) with spaces
2. Split on whitespace
3. Filter empty tokens

**Output:** `["pierre", "160", "C#min"]`

### Step 2: BPM Parsing

**Patterns:**
- Range: `/^(\d+)[\-\u2013\u2014](\d+)$/` → `bpmRanges`
- Exact: `/^(\d+)(?:bpm)?$/i` → `bpmValues`

**Validation:**
- BPM must be 1-299
- Range: min < max, both valid

**Example:**
- `"160"` → `bpmValues: [160]`
- `"150-170"` → `bpmRanges: [[150, 170]]`

### Step 3: Key Parsing

**Patterns (in order):**
1. Single token: `"Cm"`, `"C#min"`, `"CM"`
2. Two tokens: `"C min"`, `"C# maj"`
3. Three tokens: `"C sharp minor"`

**Normalization:**
- `♯` → `#`
- `♭` → `b`
- `major` → `maj`
- `minor` → `min`
- `CM` → `cmaj` (uppercase M = major)
- `Cm` → `cmin` (lowercase m = minor)
- Remove spaces, lowercase

**Example:**
- `"C#min"` → `keys: ["c#min"]`
- `"A flat major"` → `keys: ["abmaj"]`

### Step 4: Keyword Extraction

**Process:**
- Remaining tokens (not used for BPM or keys) become keywords
- Lowercased for case-insensitive search

**Example:**
- `"pierre 160 C#min"` → `queryTokens: ["pierre"]`

### Step 5: SQL Query Building

**Input:** `SearchParams` from parsing

**Process:**
1. **BPM Filtering:**
   - Exact values: `bpm = ANY($1::int[])`
   - Ranges: `(bpm >= $2 AND bpm <= $3)`

2. **Key Filtering:**
   - Normalize each key
   - Get enharmonic equivalents
   - Build multiple SQL patterns:
     - Exact match (no space)
     - Match with space
     - Handle `#` vs `♯` symbols
   - OR all patterns together

3. **Keyword Filtering:**
   - Each token: `LOWER(title) LIKE $N`
   - AND all tokens together

**Output:** SQL WHERE clause with parameterized values

## 🎹 Enharmonic Key Matching

### What Are Enharmonic Equivalents?

**Enharmonic Keys:**
- Same pitches, different names
- Example: C# = Db (same notes, different spelling)

**Relative Keys:**
- Share the same notes, different tonal center
- Example: C major = A minor (same notes, different root)

### Implementation

**Location:** `server/src/utils/keyUtils.ts`

**Lookup Table:**
```typescript
const ENHARMONIC_MAP = {
  "amin": ["cmaj", "b#maj"],
  "cmaj": ["b#maj", "amin"],
  "c#min": ["emaj", "dbmin"],
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

## 🔍 SQL Query Construction

### Key Matching Patterns

The SQL builder uses multiple patterns to match keys:

1. **Exact match (no space):**
   ```sql
   LOWER(REPLACE(key, ' ', '')) = $1
   ```
   Matches: `"cmin"` in database

2. **Match with space:**
   ```sql
   LOWER(key) LIKE $2
   ```
   Matches: `"C min"` in database

3. **Handle both # and ♯:**
   ```sql
   LOWER(REPLACE(key, ' ', '')) LIKE $3
   LOWER(REPLACE(REPLACE(key, ' ', ''), '♯', '#')) LIKE $4
   ```
   Matches: Both `"c#min"` and `"c♯min"` in database

**Why Multiple Patterns?**
- Database may have keys with/without spaces
- Database uses `♯` symbol, users type `#`
- Need to catch all variations

### Parameterized Queries

**Security:**
- All user input uses `$1`, `$2`, etc. placeholders
- Prevents SQL injection
- Type-safe parameter binding

**Example:**
```typescript
// ❌ BAD (SQL injection vulnerable)
WHERE title LIKE '%${userInput}%'

// ✅ GOOD (parameterized)
WHERE title LIKE $1
// params: [`%${userInput}%`]
```

## 🎯 Design Decisions

### Why Case-Sensitive Key Matching?

**Problem:** Need to distinguish `CM` (major) from `Cm` (minor)

**Solution:** Check uppercase `M` FIRST (before lowercase `m`)

**Why This Order?**
- If we check lowercase first, `CM` would match `m` (case-insensitive)
- Checking uppercase first ensures correct interpretation

### Why Normalize Keys?

**Problem:** Users type keys in many formats:
- `"C#min"`, `"C♯min"`, `"C sharp minor"`, `"C# minor"`

**Solution:** Normalize to consistent format: `"c#min"`

**Benefits:**
- Consistent matching
- Easier enharmonic lookup
- Simpler SQL queries

### Why Cache Enharmonic Equivalents?

**Problem:** Calculating enharmonic equivalents on-the-fly is complex

**Solution:** Pre-computed lookup table

**Benefits:**
- Fast lookups
- Easy to maintain
- Can add more mappings easily

## 📊 Performance Considerations

### Database Indexes

**Created Indexes:**
- `idx_beats_bpm` - Fast BPM filtering
- `idx_beats_key` - Fast key filtering

**Why:**
- WHERE clauses on indexed columns are fast
- Essential for search performance

### Query Optimization

**Connection Pooling:**
- Reuses database connections
- Max 20 concurrent connections

**Parameterized Queries:**
- Prepared statements (faster)
- SQL injection safe
- Query plan caching

## 📝 Key Files

- `server/src/utils/searchParser.ts` - Query parsing
- `server/src/utils/searchQueryBuilder.ts` - SQL query building
- `server/src/utils/keyUtils.ts` - Key normalization and enharmonic mapping
- `server/src/types/SearchParams.ts` - Type definitions

---

**Last Updated**: November 2025

