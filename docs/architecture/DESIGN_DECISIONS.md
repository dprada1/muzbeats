# Design Decisions & Rationale

This document explains the key design decisions made during the renovation of MuzBeats from a file-based system to a modern, database-backed architecture. Each decision includes the reasoning, alternatives considered, and trade-offs.

## 🏗️ Architecture Decisions

### Monorepo Structure

**Decision:** Keep client and server in a single repository.

**Why:**
- **Shared Types**: TypeScript types can be shared between client and server
- **Easier Development**: Single git repository, single workspace
- **Coordinated Deployment**: Easier to deploy both together
- **Simpler Dependencies**: One place to manage all dependencies

**Alternatives Considered:**
- Separate repositories (rejected - more complex, harder to coordinate)
- Monorepo tools like Turborepo (considered - not needed yet, adds complexity)

**Trade-offs:**
- ✅ Simpler for small team
- ✅ Easier to maintain
- ❌ Can become complex as project grows
- ❌ All code in one place (but this is fine for our scale)

---

### TypeScript Everywhere

**Decision:** Use TypeScript for both frontend and backend.

**Why:**
- **Type Safety**: Catches errors at compile time
- **Better IDE Support**: Autocomplete, refactoring, navigation
- **Self-Documenting**: Types serve as documentation
- **Shared Types**: Can share types between client and server

**Alternatives Considered:**
- JavaScript (rejected - no type safety)
- JSDoc types (rejected - less powerful than TypeScript)

**Trade-offs:**
- ✅ Type safety prevents bugs
- ✅ Better developer experience
- ✅ Easier refactoring
- ❌ Slightly more setup
- ❌ Compilation step (but worth it)

---

### PostgreSQL over SQLite

**Decision:** Use PostgreSQL for the database.

**Why:**
- **Production Ready**: Industry standard for production apps
- **Scalability**: Handles millions of records efficiently
- **Features**: Full SQL support, indexes, constraints
- **Future-Proof**: Can add complex features (full-text search, JSON columns, etc.)

**Alternatives Considered:**
- SQLite (rejected - not suitable for production, limited concurrency)
- MongoDB (rejected - relational data fits better in PostgreSQL)

**Trade-offs:**
- ✅ Production-ready
- ✅ Excellent performance
- ✅ Rich feature set
- ❌ Requires installation (but worth it)
- ❌ More complex than SQLite (but more powerful)

---

### Raw SQL over ORM

**Decision:** Use `pg` (node-postgres) directly instead of an ORM like Prisma or TypeORM.

**Why:**
- **Full Control**: Complete control over SQL queries
- **Performance**: No ORM overhead, direct SQL
- **Simplicity**: Less abstraction, easier to understand
- **Learning**: Better understanding of SQL
- **Flexibility**: Can write complex queries easily

**Alternatives Considered:**
- Prisma (considered - good but adds complexity)
- TypeORM (rejected - too much magic, harder to debug)
- Sequelize (rejected - older, less TypeScript-friendly)

**Trade-offs:**
- ✅ Full control over queries
- ✅ Better performance
- ✅ Easier to debug
- ❌ More SQL to write
- ❌ No automatic migrations (but we have scripts)

**When to Reconsider:**
- If we need complex relationships (many-to-many, etc.)
- If team grows and needs more structure
- If we want automatic migrations

---

### UUID Primary Keys

**Decision:** Use UUID instead of auto-increment integers for primary keys.

**Why:**
- **Globally Unique**: No collisions across databases
- **Distributed Systems**: Works well if we scale horizontally
- **Security**: Harder to guess/scan (can't enumerate IDs)
- **Future-Proof**: Better for microservices architecture

**Alternatives Considered:**
- Auto-increment integers (rejected - less flexible, easier to guess)
- ULID (considered - good alternative, but UUID is more standard)

**Trade-offs:**
- ✅ Globally unique
- ✅ More secure
- ✅ Better for distributed systems
- ❌ Slightly larger storage (16 bytes vs 8 bytes)
- ❌ Not sequential (but we don't need that)

---

### Connection Pooling

**Decision:** Use connection pooling (max 20 connections).

**Why:**
- **Performance**: Reuses connections instead of creating new ones
- **Resource Management**: Limits concurrent connections
- **Standard Practice**: Industry standard for production
- **Handles Load**: Better under concurrent requests

**Configuration:**
- Max 20 connections (enough for development, can increase in production)
- 30s idle timeout (closes unused connections)
- 2s connection timeout (fails fast if DB is down)

**Alternatives Considered:**
- Single connection (rejected - too slow, doesn't scale)
- Unlimited connections (rejected - can overwhelm database)

**Trade-offs:**
- ✅ Better performance
- ✅ Handles concurrent requests
- ✅ Resource efficient
- ❌ Slightly more complex (but standard)

---

## 🔍 Search System Decisions

### Backend Search over Client-Side

**Decision:** Move search filtering from client to backend.

**Why:**
- **Scalability**: Can't fetch 10,000 beats to filter in browser
- **Performance**: Database indexes are much faster
- **Bandwidth**: Only matching beats transferred
- **Single Source of Truth**: Search logic in one place

**Migration Process:**
- Started with client-side filtering (worked for 63 beats)
- Migrated to backend when we added database
- Frontend now just sends query and displays results

**Trade-offs:**
- ✅ Scales to millions of beats
- ✅ Much faster
- ✅ Less bandwidth
- ❌ Slightly more complex backend (but worth it)

---

### Two-Layer Search Architecture

**Decision:** Separate query parsing from SQL building.

**Why:**
- **Separation of Concerns**: Parser doesn't know about SQL
- **Testability**: Can test parser independently
- **Flexibility**: Could swap SQL builder for different database
- **Maintainability**: Easier to understand and modify

**Structure:**
1. `searchParser.ts` - Parses natural language → SearchParams
2. `searchQueryBuilder.ts` - Converts SearchParams → SQL

**Alternatives Considered:**
- Single function (rejected - too complex, harder to test)
- More layers (rejected - over-engineering for our needs)

**Trade-offs:**
- ✅ Clean separation
- ✅ Easy to test
- ✅ Easy to modify
- ❌ Slightly more files (but better organization)

---

### Enharmonic Key Matching

**Decision:** Include enharmonic and relative key equivalents in search.

**Why:**
- **User Experience**: Musicians use different key names
- **Better Results**: "A minor" and "C major" are the same notes
- **Industry Standard**: Music software does this
- **Comprehensive**: More beats match user intent

**Implementation:**
- Lookup table maps keys to equivalents
- SQL query searches for all variants
- Example: "Am" → searches ["amin", "cmaj", "b#maj"]

**Alternatives Considered:**
- No enharmonic matching (rejected - worse UX)
- More complex music theory (rejected - over-engineering)

**Trade-offs:**
- ✅ Better search results
- ✅ Better user experience
- ❌ Slightly more complex queries (but worth it)
- ❌ More database lookups (but indexes make it fast)

---

### Case-Sensitive Key Matching

**Decision:** Distinguish `CM` (major) from `Cm` (minor) based on case.

**Why:**
- **Musical Convention**: Uppercase M = major, lowercase m = minor
- **User Expectation**: Musicians expect this behavior
- **Precision**: More accurate search results

**Implementation:**
- Check uppercase `M` FIRST (before lowercase `m`)
- Case-sensitive regex patterns
- Normalize after detection

**Alternatives Considered:**
- Case-insensitive (rejected - loses precision)
- Always default to minor (rejected - wrong for major keys)

**Trade-offs:**
- ✅ Accurate results
- ✅ Matches user expectations
- ❌ Slightly more complex parsing (but necessary)

---

## 🎨 Frontend Decisions

### React Context API

**Decision:** Use Context API for state management instead of Redux or Zustand.

**Why:**
- **Simplicity**: Built into React, no extra dependencies
- **Sufficient**: Our state needs are simple (search, cart, player)
- **Lightweight**: No boilerplate
- **Learning**: Easier for new developers

**Alternatives Considered:**
- Redux (rejected - overkill for our needs)
- Zustand (considered - good but not needed yet)
- Prop drilling (rejected - too messy)

**Trade-offs:**
- ✅ Simple and lightweight
- ✅ No extra dependencies
- ✅ Easy to understand
- ❌ Can become messy with many contexts (but we're fine)

**When to Reconsider:**
- If state becomes very complex
- If we need time-travel debugging
- If we need middleware

---

### Lazy Loading with IntersectionObserver

**Decision:** Use IntersectionObserver for lazy loading beat cards.

**Why:**
- **Performance**: Only loads cards when visible
- **Bandwidth**: Saves data on mobile
- **User Experience**: Faster initial page load
- **Modern API**: Built into browsers

**Implementation:**
- `LazyBeatCard` component
- Uses IntersectionObserver API
- Loads when card enters viewport

**Alternatives Considered:**
- Load all at once (rejected - slow with many beats)
- Pagination (considered - but lazy loading is better UX)

**Trade-offs:**
- ✅ Better performance
- ✅ Better UX
- ✅ Saves bandwidth
- ❌ Slightly more complex (but standard practice)

---

## 🗄️ Database Decisions

### Indexes on bpm, key, and price

**Decision:** Create indexes on frequently queried columns.

**Why:**
- **Performance**: Makes WHERE clauses fast
- **Search**: Essential for search functionality
- **Future-Proof**: Price index for future sorting/filtering

**Indexes Created:**
- `idx_beats_bpm` - For BPM filtering
- `idx_beats_key` - For key filtering
- `idx_beats_price` - For price sorting (future)

**Trade-offs:**
- ✅ Much faster queries
- ✅ Essential for search
- ❌ Slightly slower inserts (negligible)
- ❌ Uses disk space (minimal)

---

### CHECK Constraints

**Decision:** Use database CHECK constraints for data validation.

**Why:**
- **Data Integrity**: Prevents invalid data at database level
- **Cannot Bypass**: Even if application has bugs
- **Self-Documenting**: Schema shows what's valid

**Constraints:**
- `bpm > 0 AND bpm < 300` - Realistic BPM range
- `price >= 0` - Can't have negative prices

**Alternatives Considered:**
- Application-level validation only (rejected - can be bypassed)
- No validation (rejected - bad data)

**Trade-offs:**
- ✅ Data integrity guaranteed
- ✅ Self-documenting
- ❌ Slightly more complex schema (but worth it)

---

## 🔄 Migration Decisions

### Gradual Migration Strategy

**Decision:** Keep `data.json` as backup, migrate to database.

**Why:**
- **Safety**: Can rollback if needed
- **Reference**: Easy to see original data
- **Testing**: Can compare results

**Process:**
1. Created database schema
2. Wrote migration script
3. Imported all beats
4. Updated service to use database
5. Kept JSON as backup

**Alternatives Considered:**
- Delete JSON immediately (rejected - too risky)
- Dual-write (rejected - unnecessary complexity)

**Trade-offs:**
- ✅ Safe migration
- ✅ Easy rollback
- ❌ Extra file (but small, worth it)

---

## 📦 Technology Choices

### Express.js

**Decision:** Use Express.js for the backend framework.

**Why:**
- **Most Popular**: Largest ecosystem
- **Mature**: Battle-tested, stable
- **Flexible**: Can add any middleware
- **Well-Documented**: Easy to find help

**Alternatives Considered:**
- Fastify (considered - faster but smaller ecosystem)
- Koa (considered - more modern but less popular)
- NestJS (rejected - too opinionated, overkill)

**Trade-offs:**
- ✅ Large ecosystem
- ✅ Well-documented
- ✅ Flexible
- ❌ Not the fastest (but fast enough)

---

### Vite

**Decision:** Use Vite for frontend build tool.

**Why:**
- **Fast**: Instant HMR, fast builds
- **Modern**: ES modules, modern tooling
- **Simple**: Less configuration than Webpack
- **Popular**: Growing adoption

**Alternatives Considered:**
- Create React App (rejected - deprecated, slow)
- Webpack (rejected - more complex, slower)
- Next.js (rejected - overkill, adds complexity)

**Trade-offs:**
- ✅ Very fast development
- ✅ Modern tooling
- ✅ Simple configuration
- ❌ Newer (but stable enough)

---

### Tailwind CSS

**Decision:** Use Tailwind CSS for styling.

**Why:**
- **Fast Development**: Utility classes, no CSS files
- **Consistent**: Design system built-in
- **Small Bundle**: Purges unused styles
- **Modern**: Industry standard

**Alternatives Considered:**
- CSS Modules (rejected - more verbose)
- Styled Components (rejected - runtime overhead)
- Plain CSS (rejected - too verbose, no design system)

**Trade-offs:**
- ✅ Fast development
- ✅ Consistent design
- ✅ Small bundle
- ❌ Learning curve (but worth it)

---

## 🔐 Security Decisions

### Environment Variables

**Decision:** Store secrets in `.env` file, gitignored.

**Why:**
- **Security**: Never commit secrets
- **Flexibility**: Different values per environment
- **Standard Practice**: Industry standard approach

**Implementation:**
- `.env` file (gitignored)
- `.env.example` template (committed)
- `dotenv` package loads variables

**Alternatives Considered:**
- Hardcode (rejected - insecure)
- Config files (rejected - can be committed by mistake)

**Trade-offs:**
- ✅ Secure
- ✅ Flexible
- ✅ Standard practice
- ❌ Need to remember to create `.env` (but documented)

---

### Parameterized Queries

**Decision:** Always use parameterized SQL queries.

**Why:**
- **Security**: Prevents SQL injection
- **Performance**: Query plan caching
- **Type Safety**: Proper type handling

**Implementation:**
- All queries use `$1`, `$2`, etc. placeholders
- Never concatenate user input
- Type-safe parameter binding

**Alternatives Considered:**
- String concatenation (rejected - SQL injection vulnerable)
- Query builders (considered - but parameterized is fine)

**Trade-offs:**
- ✅ Secure
- ✅ Fast
- ✅ Type-safe
- ❌ Slightly more verbose (but necessary)

---

## 📊 Performance Decisions

### Connection Pooling

**Decision:** Use connection pooling (max 20 connections).

**Why:**
- **Performance**: Reuses connections
- **Resource Management**: Limits connections
- **Standard Practice**: Industry standard

**Configuration:**
- Max 20 (enough for development)
- 30s idle timeout
- 2s connection timeout

**Trade-offs:**
- ✅ Better performance
- ✅ Handles concurrent requests
- ✅ Resource efficient
- ❌ Need to tune for production (but 20 is fine for now)

---

### Database Indexes

**Decision:** Index bpm, key, and price columns.

**Why:**
- **Search Performance**: Essential for WHERE clauses
- **Sorting Performance**: Fast ORDER BY
- **Standard Practice**: Index frequently queried columns

**Trade-offs:**
- ✅ Much faster queries
- ✅ Essential for search
- ❌ Slightly slower inserts (negligible)
- ❌ Uses disk space (minimal, worth it)

---

## 🎯 Future Considerations

### When to Reconsider Decisions

**ORM (Prisma/TypeORM):**
- If we need complex relationships
- If team grows and needs more structure
- If we want automatic migrations

**State Management (Redux/Zustand):**
- If state becomes very complex
- If we need time-travel debugging
- If we need middleware

**Microservices:**
- If we need to scale independently
- If we have multiple teams
- If we need different deployment schedules

**Caching (Redis):**
- If database becomes a bottleneck
- If we have high traffic
- If we need session storage

---

**Last Updated**: November 2025  
**Version**: 2.0 (Renovated Architecture)

