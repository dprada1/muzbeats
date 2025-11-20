# Search Query Syntax Reference

Complete reference for search query syntax and examples.

## Basic Syntax

The search parser supports natural language queries with three types of filters:

1. **BPM** - Beats per minute (exact or range)
2. **Keys** - Musical keys (with enharmonic matching)
3. **Keywords** - Text search in titles

## BPM Syntax

### Exact BPM

**Format:** `NUMBER` or `NUMBERbpm`

**Examples:**
- `160` - Exact 160 BPM
- `160bpm` - Exact 160 BPM (with suffix)
- `120` - Exact 120 BPM

**Validation:**
- Must be between 1 and 299
- Decimal values are rounded to integers

### BPM Range

**Format:** `MIN-MAX` or `MIN–MAX` or `MIN—MAX`

**Examples:**
- `150-170` - BPM between 150 and 170
- `150–170` - Same (en-dash)
- `150—170` - Same (em-dash)
- `90-110` - BPM between 90 and 110

**Validation:**
- Min must be > 0
- Max must be < 300
- Min must be < Max

### Multiple BPM Values

**Examples:**
- `160 180` - Beats with BPM 160 OR 180
- `100-110 120` - Beats with BPM 100-110 OR 120

## Key Syntax

### Short Format

**Format:** `NOTE[ACCIDENTAL][QUALITY]`

**Examples:**
- `Cm` - C minor (lowercase m = minor)
- `CM` - C major (uppercase M = major)
- `C#m` - C# minor
- `Cb` - C flat (defaults to both major and minor)

**Accidentals:**
- `#` or `♯` - Sharp
- `b` or `♭` - Flat

**Quality:**
- `m` or `min` - Minor
- `M` or `maj` - Major
- No quality = both major and minor

### Full Format

**Format:** `NOTE[ACCIDENTAL] QUALITY`

**Examples:**
- `C min` - C minor
- `C major` - C major
- `C# minor` - C# minor
- `A flat major` - A flat major

### Spelled Format

**Format:** `NOTE ACCIDENTAL_WORD QUALITY`

**Examples:**
- `C sharp minor` - C# minor
- `A flat major` - Ab major
- `B sharp minor` - B# minor

**Accidental Words:**
- `sharp` or `♯` → `#`
- `flat` or `♭` → `b`

**Quality Words:**
- `major` or `maj` → major
- `minor` or `min` → minor

### Case Sensitivity

**Important:** Case matters for single-letter quality!

- `CM` → C **major** (uppercase M)
- `Cm` → C **minor** (lowercase m)
- `cM` → C **major** (note case doesn't matter, only quality)
- `cM` → C **major** (same as above)

## Keyword Syntax

**Format:** Any text that doesn't match BPM or key patterns

**Examples:**
- `pierre` - Search for "pierre" in title
- `shoreline` - Search for "shoreline" in title
- `dark trap` - Search for both "dark" AND "trap" in title

**Behavior:**
- Case-insensitive
- Multiple keywords = AND condition (all must match)
- Searches in beat titles only

## Combined Queries

You can combine all three types in any order:

**Examples:**
- `pierre 160 C#min` - Pierre beats, 160 BPM, C# minor key
- `160 pierre C#min` - Same (order doesn't matter)
- `C#min 160 pierre` - Same (order doesn't matter)

**Processing Order:**
1. BPM tokens are extracted first
2. Key tokens are extracted second
3. Remaining tokens become keywords

## Enharmonic Matching

When searching by key, the system automatically includes enharmonic and relative equivalents:

**Examples:**
- `Am` → Also matches: C major, B# major (relative keys)
- `C#min` → Also matches: E major, Db minor (enharmonic/relative)
- `C major` → Also matches: A minor, B# major (relative keys)

**Why:**
- Musicians use different key names
- "A minor" and "C major" are the same notes
- Better search results

## Examples

### Simple Queries

```
pierre
→ Keywords: ["pierre"]
→ Finds all beats with "pierre" in title

160
→ BPM: [160]
→ Finds all beats with BPM 160

Cm
→ Keys: ["cmin"]
→ Finds all C minor beats (and enharmonic equivalents)
```

### Complex Queries

```
pierre 160 C#min
→ Keywords: ["pierre"]
→ BPM: [160]
→ Keys: ["c#min"]
→ Finds Pierre beats, 160 BPM, C# minor (or enharmonic equivalents)

shoreline 95-105 Bmin
→ Keywords: ["shoreline"]
→ BPM: [95-105]
→ Keys: ["bmin"]
→ Finds Shoreline beats, 95-105 BPM, B minor

dark aggressive trap 150
→ Keywords: ["dark", "aggressive", "trap"]
→ BPM: [150]
→ Finds beats with all three keywords AND BPM 150
```

### Edge Cases

```
150-170 bpm
→ BPM: [150-170]
→ "bpm" is ignored (part of range pattern)

C sharp minor
→ Keys: ["c#min"]
→ Three-token key pattern

CM
→ Keys: ["cmaj"]
→ Uppercase M = major

Cm
→ Keys: ["cmin"]
→ Lowercase m = minor
```

## API Usage

### Query Parameter

**Endpoint:** `GET /api/beats?q=QUERY`

**Example:**
```bash
GET /api/beats?q=pierre%20160%20C%23min
```

**URL Encoding:**
- Space → `%20`
- `#` → `%23`
- Other special characters encoded automatically

### Response

**Success:**
```json
[
  {
    "id": "...",
    "title": "Pierre Bourne Type Beat - \"Bright\"",
    "key": "E maj",
    "bpm": 160,
    ...
  }
]
```

**Empty Results:**
```json
[]
```

---

**Last Updated**: November 2025

