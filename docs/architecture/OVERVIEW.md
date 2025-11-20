# MuzBeats Architecture Overview

## 🎯 Project Vision

MuzBeats is a modern, scalable music beat store application that allows users to browse, search, and purchase music beats. The project has been renovated from a simpler file-based system to a modern, database-backed architecture that can scale to production.

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   React App  │  │  Waveform    │  │   Search     │     │
│  │   (Vite)     │  │  Player      │  │   Parser     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘            │
│                            │                                 │
│                    HTTP/REST API                             │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                    Express Server (Node.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Routes      │→ │ Controllers  │→ │  Services    │     │
│  │  /api/beats  │  │  (HTTP)      │  │  (Business) │     │
│  └──────────────┘  └──────────────┘  └──────┬───────┘     │
│                                               │              │
│  ┌──────────────┐  ┌──────────────┐          │              │
│  │  Search      │  │  Static      │          │              │
│  │  Parser      │  │  Files       │          │              │
│  └──────────────┘  └──────────────┘          │              │
└──────────────────────────────────────────────┼──────────────┘
                                               │
                                               │ SQL Queries
                                               │
┌──────────────────────────────────────────────▼──────────────┐
│                  PostgreSQL Database                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   beats      │  │   orders     │  │  downloads    │     │
│  │   table      │  │   (future)   │  │  (future)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

### Monorepo Organization

**Why Monorepo?**
- Single repository for easier development
- Shared types between client and server
- Easier deployment coordination
- Simplified dependency management

```
muzbeats/
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route pages
│   │   ├── context/     # React Context providers
│   │   ├── utils/       # Utility functions
│   │   └── types/       # TypeScript types
│   └── package.json
│
├── server/              # Express backend (TypeScript)
│   ├── src/
│   │   ├── config/      # Configuration (database, etc.)
│   │   ├── controllers/  # HTTP request handlers
│   │   ├── routes/      # API route definitions
│   │   ├── services/    # Business logic
│   │   ├── utils/       # Utility functions
│   │   ├── types/       # TypeScript types
│   │   └── db/          # Database scripts
│   ├── public/          # Static assets (served by Express)
│   └── package.json
│
└── docs/                # Documentation
    ├── architecture/    # System design docs
    ├── api/            # API documentation
    └── ...
```

## 🔄 Data Flow

### Search Flow (Example)

1. **User Input**: User types "pierre 160 C#min" in search bar
2. **Frontend**: `StorePage.tsx` sends `GET /api/beats?q=pierre%20160%20C%23min`
3. **Backend Route**: `beatsRoutes.ts` → `getAllBeatsHandler`
4. **Controller**: `beatsController.ts` parses query parameters
5. **Parser**: `searchParser.ts` extracts:
   - Keywords: ["pierre"]
   - BPM: [160]
   - Keys: ["C#min"]
6. **Service**: `beatsService.ts` calls `buildSearchQuery()`
7. **Query Builder**: `searchQueryBuilder.ts` builds SQL with:
   - Enharmonic equivalents for "C#min" → ["c#min", "emaj", "dbmin"]
   - WHERE clauses for title, BPM, and key matching
8. **Database**: PostgreSQL executes query and returns filtered results
9. **Response**: JSON array of matching beats sent to frontend
10. **Display**: React renders beat cards

### Why This Architecture?

**Separation of Concerns:**
- **Routes**: Define API endpoints
- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic (database queries)
- **Utils**: Reusable functions (parsing, query building)

**Benefits:**
- Easy to test each layer independently
- Clear responsibilities
- Easy to modify without breaking other parts
- Scalable as features grow

## 🗄️ Database Architecture

### Current Schema

**beats table:**
```sql
CREATE TABLE beats (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  key VARCHAR(50) NOT NULL,
  bpm INTEGER NOT NULL CHECK (bpm > 0 AND bpm < 300),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  audio_path VARCHAR(500) NOT NULL,
  cover_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Why UUID instead of auto-increment?**
- Globally unique (no collisions across databases)
- Better for distributed systems
- Can generate IDs client-side if needed
- More secure (harder to guess/scan)

**Why these indexes?**
- `idx_beats_bpm`: Fast BPM filtering
- `idx_beats_key`: Fast key filtering
- `idx_beats_price`: Fast price sorting/filtering

### Connection Pooling

**Why connection pooling?**
- Reuses database connections (faster)
- Limits concurrent connections (prevents overload)
- Handles connection failures gracefully
- Standard practice for production apps

**Configuration:**
- Max 20 connections
- 30s idle timeout
- 2s connection timeout

## 🔍 Search System Architecture

### Two-Layer Search System

**Layer 1: Query Parsing** (`searchParser.ts`)
- Parses raw query string: "pierre 160 C#min"
- Extracts: BPM values, BPM ranges, keys, keywords
- Normalizes musical notation

**Layer 2: SQL Query Building** (`searchQueryBuilder.ts`)
- Converts parsed query to SQL WHERE clauses
- Handles enharmonic equivalents
- Builds parameterized queries (SQL injection safe)

### Why Backend Search?

**Previous (Client-Side):**
- Fetched ALL beats (63+)
- Filtered in browser
- Doesn't scale (imagine 10,000 beats)

**Current (Backend):**
- Database filters before sending
- Only matching beats transferred
- Scales to millions of beats
- Uses database indexes for speed

### Enharmonic Key Matching

**What are enharmonic equivalents?**
- Same pitches, different names (C# = Db)
- Relative keys share notes (C major = A minor)

**Why include them?**
- Musicians search by different names
- "A minor" and "C major" are the same notes
- Better user experience (more results)

**Implementation:**
- Lookup table maps keys to equivalents
- SQL query searches for all variants
- Example: "Am" → searches ["amin", "cmaj", "b#maj"]

## 🎨 Frontend Architecture

### Component Structure

**Pages:**
- `StorePage.tsx` - Main beat store with search
- `CartPage.tsx` - Shopping cart
- `BeatDetail.tsx` - Single beat view

**Context Providers:**
- `SearchContext` - Search query state
- `CartContext` - Shopping cart state
- `PlayerContext` - Audio player state
- `WaveformContext` - Waveform visualization state

**Why Context API?**
- Avoids prop drilling
- Shared state across components
- Clean separation of concerns

### Performance Optimizations

**Lazy Loading:**
- `LazyBeatCard` - Only loads when visible
- Uses IntersectionObserver API
- Reduces initial load time

**Code Splitting:**
- Vite automatically splits code
- Routes loaded on demand
- Smaller initial bundle

## 🔐 Security Considerations

### Current Security Measures

1. **Environment Variables**
   - Secrets in `.env` (gitignored)
   - Never committed to repository
   - See `ENV_SETUP.md` for details

2. **SQL Injection Prevention**
   - Parameterized queries only
   - Never concatenate user input into SQL
   - All queries use `$1, $2, ...` placeholders

3. **CORS Configuration**
   - Currently allows all origins (development)
   - Should restrict in production

### Future Security Enhancements

- Rate limiting (prevent abuse)
- Input validation (Zod/Joi)
- Helmet.js (security headers)
- Request sanitization

## 🚀 Deployment Architecture (Future)

### Production Setup

```
┌─────────────┐
│   Vercel    │  Frontend (Static)
│   (CDN)     │  - React app
└─────────────┘
       │
       │ API calls
       │
┌─────────────┐
│   Railway   │  Backend (Node.js)
│   (Server)  │  - Express API
└──────┬──────┘
       │
       │ SQL
       │
┌─────────────┐
│   Railway   │  Database
│  PostgreSQL │  - Production DB
└─────────────┘
```

**Why this setup?**
- Vercel: Excellent for static React apps (CDN, fast)
- Railway: Easy PostgreSQL + Node.js deployment
- Separate services: Scale independently

## 📊 Technology Choices & Rationale

### Backend

**Express.js** - Why?
- Most popular Node.js framework
- Large ecosystem
- Well-documented
- Flexible and lightweight

**TypeScript** - Why?
- Type safety catches errors early
- Better IDE support
- Easier refactoring
- Self-documenting code

**PostgreSQL** - Why?
- Robust relational database
- Excellent for production
- Supports complex queries
- ACID compliance

**node-postgres (pg)** - Why?
- Official PostgreSQL client
- Lightweight (no ORM overhead)
- Full control over queries
- Good performance

### Frontend

**React** - Why?
- Most popular UI library
- Component-based architecture
- Large ecosystem
- Great developer experience

**Vite** - Why?
- Fast development server
- Instant HMR (Hot Module Replacement)
- Optimized production builds
- Modern tooling

**TypeScript** - Why?
- Same benefits as backend
- Type safety across full stack
- Shared types between client/server

**Tailwind CSS** - Why?
- Utility-first CSS
- Fast development
- Consistent design
- Small production bundle

## 🔄 Migration from File-Based to Database

### What Changed

**Before:**
- `data.json` file with all beats
- Read file on every request (or cached)
- Client-side filtering
- No scalability

**After:**
- PostgreSQL database
- SQL queries with indexes
- Backend filtering
- Scales to millions

### Why Migrate?

1. **Scalability**: Can't have 10,000 beats in a JSON file
2. **Performance**: Database indexes are much faster
3. **Features**: Can add orders, users, analytics
4. **Production Ready**: Industry standard approach

### Migration Process

1. Created database schema
2. Wrote migration script (`migrate-json-to-db.ts`)
3. Imported all 63 beats
4. Updated service to use database
5. Removed file-based logic
6. Kept `data.json` as backup

## 📝 Design Decisions Summary

| Decision | Why |
|----------|-----|
| Monorepo | Easier development, shared types |
| TypeScript | Type safety, better DX |
| PostgreSQL | Production-ready, scalable |
| Raw SQL (not ORM) | Full control, no magic |
| Backend search | Performance, scalability |
| UUID primary keys | Distributed-friendly, secure |
| Connection pooling | Performance, resource management |
| Context API | Clean state management |
| Lazy loading | Performance optimization |

## 🎯 Next Steps

See `BACKEND_ROADMAP.md` for detailed next steps:
- Stripe payment integration
- Order management
- Download system
- Email notifications

---

**Last Updated**: November 2025
**Version**: 2.0 (Renovated from file-based to database-backed)

