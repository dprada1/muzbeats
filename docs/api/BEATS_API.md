# Beats API Documentation

## Base URL

```
http://localhost:3000/api/beats
```

## Endpoints

### GET /api/beats

Get all beats with optional search/filtering.

#### Query Parameters

**Option 1: Raw Query String**
- `q` (string): Raw search query that gets parsed
  - Example: `?q=pierre 160 C#min`
  - Supports: keywords, BPM values/ranges, musical keys

**Option 2: Individual Parameters**
- `bpm` (number): Exact BPM value
  - Example: `?bpm=160`
- `bpmMin` (number): Minimum BPM for range
  - Example: `?bpmMin=150&bpmMax=170`
- `bpmMax` (number): Maximum BPM for range
- `key` (string): Musical key
  - Example: `?key=C%20maj` (URL encoded)
- `search` (string): Keyword search in title
  - Example: `?search=pierre`

#### Examples

```bash
# Get all beats
GET /api/beats

# Search with raw query
GET /api/beats?q=pierre%20160%20C%23min

# Filter by BPM
GET /api/beats?bpm=160

# Filter by BPM range
GET /api/beats?bpmMin=150&bpmMax=170

# Filter by key
GET /api/beats?key=C%20maj

# Keyword search
GET /api/beats?search=pierre

# Combined filters
GET /api/beats?bpm=160&key=C%20maj&search=pierre
```

#### Response

**Success (200 OK)**
```json
[
  {
    "id": "a25dc205-c23c-485b-9291-236a8ef93fed",
    "title": "Pierre Bourne Type Beat - \"Bright\"",
    "key": "E maj",
    "bpm": 160,
    "price": 4.99,
    "audio": "/assets/beats/mp3/pierre_bourne__bright_Emaj_160.mp3",
    "cover": "/assets/images/pierre_bourne/82.webp"
  },
  ...
]
```

**Error (500 Internal Server Error)**
```json
{
  "error": "Failed to fetch beats"
}
```

#### Search Query Syntax

The `q` parameter supports a natural language-like syntax:

- **Keywords**: Any text (searches in title)
  - Example: `pierre`, `shoreline`, `internet money`
  
- **BPM Values**: Exact BPM
  - Example: `160`, `160bpm`
  
- **BPM Ranges**: Range of BPMs
  - Example: `150-170`, `150–170` (en-dash), `150—170` (em-dash)
  
- **Musical Keys**: Key notation
  - Example: `Cm`, `CM`, `C min`, `C#min`, `C sharp minor`
  - Case-sensitive: `CM` = major, `Cm` = minor
  - Supports enharmonic equivalents (A min includes C maj beats)

**Combined Example:**
```
?q=pierre 160 C#min
```
This searches for:
- Title contains "pierre"
- BPM equals 160
- Key is C# minor (or enharmonic equivalents)

#### Enharmonic Key Matching

When searching by key, the API automatically includes enharmonic and relative equivalents:

- **A minor** → Also matches: C major, B# major
- **C major** → Also matches: A minor, B# major
- **C# minor** → Also matches: E major, Db minor

This provides better search results for musicians who may use different key names.

---

### GET /api/beats/:id

Get a single beat by ID.

#### Path Parameters

- `id` (UUID, required): The beat's unique identifier

#### Example

```bash
GET /api/beats/a25dc205-c23c-485b-9291-236a8ef93fed
```

#### Response

**Success (200 OK)**
```json
{
  "id": "a25dc205-c23c-485b-9291-236a8ef93fed",
  "title": "Pierre Bourne Type Beat - \"Bright\"",
  "key": "E maj",
  "bpm": 160,
  "price": 4.99,
  "audio": "/assets/beats/mp3/pierre_bourne__bright_Emaj_160.mp3",
  "cover": "/assets/images/pierre_bourne/82.webp"
}
```

**Not Found (404 Not Found)**
```json
{
  "error": "Beat not found"
}
```

**Bad Request (400 Bad Request)**
```json
{
  "error": "Beat ID is required"
}
```

---

## Response Types

### Beat Object

```typescript
{
  id: string;        // UUID
  title: string;     // Beat title
  key: string;       // Musical key (e.g., "C maj", "A min")
  bpm: number;       // Beats per minute (0-300)
  price: number;     // Price in USD
  audio: string;     // Path to audio file
  cover: string;     // Path to cover image
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK` - Success
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses follow this format:
```json
{
  "error": "Error message description"
}
```

## Performance Considerations

### Database Indexing

The following indexes are created for optimal query performance:

- `idx_beats_bpm` - Fast BPM filtering
- `idx_beats_key` - Fast key filtering  
- `idx_beats_price` - Fast price sorting/filtering

### Query Optimization

- All queries use parameterized statements (SQL injection safe)
- Database connection pooling (max 20 connections)
- Results ordered by `created_at DESC` (newest first)

### Caching

Currently no caching is implemented. Future enhancements:
- Redis cache for frequently accessed beats
- Query result caching
- CDN for static assets

## Rate Limiting

Currently no rate limiting is implemented. Future enhancement:
- Implement `express-rate-limit` middleware
- Protect against abuse
- Different limits for different endpoints

---

**Last Updated**: November 2025

