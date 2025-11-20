# Database Schema Documentation

## Overview

MuzBeats uses PostgreSQL as its primary database. The schema is designed to be simple, scalable, and production-ready. Currently, only the `beats` table exists, with plans for `orders`, `order_items`, and `downloads` tables in the future.

## Database Connection

### Configuration

**File:** `server/src/config/database.ts`

**Connection Pool Settings:**
- **Host**: `localhost` (development) or from `DB_HOST` env var
- **Port**: `5432` (default) or from `DB_PORT` env var
- **Database**: `muzbeats_dev` (development) or from `DB_NAME` env var
- **User**: `postgres` (default) or from `DB_USER` env var
- **Password**: From `DB_PASSWORD` env var (empty for default postgres user)
- **Max Connections**: 20
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 2 seconds

**Why Connection Pooling?**
- Reuses connections instead of creating new ones
- Limits concurrent connections (prevents database overload)
- Handles connection failures gracefully
- Industry standard for production applications

## Current Schema

### beats Table

**Purpose:** Stores all beat metadata and file paths.

**Schema:**
```sql
CREATE TABLE beats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

**Column Descriptions:**

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto-generated, unique |
| `title` | VARCHAR(255) | Beat title | Required, max 255 chars |
| `key` | VARCHAR(50) | Musical key | Required, e.g., "C maj", "A min" |
| `bpm` | INTEGER | Beats per minute | Required, 1-299 |
| `price` | DECIMAL(10,2) | Price in USD | Required, >= 0 |
| `audio_path` | VARCHAR(500) | Path to audio file | Required, e.g., "/assets/beats/mp3/..." |
| `cover_path` | VARCHAR(500) | Path to cover image | Required, e.g., "/assets/images/..." |
| `created_at` | TIMESTAMP | Creation timestamp | Auto-set on insert |
| `updated_at` | TIMESTAMP | Last update timestamp | Auto-set on insert/update |

**Design Decisions:**

1. **UUID Primary Key**
   - **Why?** Globally unique, no collisions across databases
   - **Why?** Better for distributed systems
   - **Why?** More secure (harder to guess/scan)
   - **Alternative considered:** Auto-increment integer (rejected - less flexible)

2. **VARCHAR Lengths**
   - **title (255)**: Standard length, covers most titles
   - **key (50)**: Handles longest key names like "C sharp minor"
   - **audio_path (500)**: Handles long file paths
   - **cover_path (500)**: Same as audio_path

3. **BPM Constraint (1-299)**
   - **Why?** Prevents invalid data
   - **Why?** Realistic range for music (most beats are 60-200 BPM)
   - **Why?** Database-level validation (can't be bypassed)

4. **Price DECIMAL(10,2)**
   - **Why?** Precise currency calculations
   - **Why?** Avoids floating-point errors
   - **Format:** 10 digits total, 2 after decimal (e.g., 99999999.99)

5. **Timestamps**
   - **Why?** Track when beats were added
   - **Why?** Useful for sorting (newest first)
   - **Why?** Audit trail for future features

### Indexes

**Created Indexes:**
```sql
CREATE INDEX idx_beats_bpm ON beats(bpm);
CREATE INDEX idx_beats_key ON beats(key);
CREATE INDEX idx_beats_price ON beats(price);
```

**Why These Indexes?**

1. **idx_beats_bpm**
   - Used for BPM filtering in search
   - Makes `WHERE bpm = 160` queries fast
   - Essential for BPM range queries

2. **idx_beats_key**
   - Used for key filtering in search
   - Makes `WHERE key LIKE '%C min%'` queries fast
   - Important for enharmonic matching

3. **idx_beats_price**
   - Prepared for future price sorting/filtering
   - Makes `ORDER BY price` queries fast
   - Useful for price range filters

**Index Trade-offs:**
- ✅ Faster queries
- ✅ Better search performance
- ❌ Slightly slower inserts (negligible)
- ❌ Uses extra disk space (minimal)

**Why Not Index Everything?**
- Indexes have overhead
- Only index columns used in WHERE/ORDER BY
- Title not indexed (full-text search would use different approach)

## Data Migration

### Migration Script

**File:** `server/src/db/migrate-json-to-db.ts`

**Purpose:** Import beats from `data.json` into PostgreSQL.

**How it works:**
1. Reads `server/public/assets/data.json`
2. Checks if `beats` table exists (creates if not)
3. For each beat:
   - Checks if ID already exists (skips if found)
   - Inserts new beat with UUID casting
4. Reports results (inserted, skipped, errors)

**Why this approach?**
- Idempotent (safe to run multiple times)
- Preserves existing data
- Handles errors gracefully
- Provides detailed feedback

**Usage:**
```bash
cd server
npm run migrate
```

### Setup Script

**File:** `server/src/db/setup-table.ts`

**Purpose:** Create fresh `beats` table with schema and indexes.

**When to use:**
- Setting up new database
- Resetting development database
- Testing schema changes

**Usage:**
```bash
cd server
npx tsx src/db/setup-table.ts
```

## Future Schema (Planned)

### orders Table

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email VARCHAR(255) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Track customer orders (guest checkout).

**Design Decisions:**
- **UUID ID**: Consistent with beats table
- **customer_email**: For guest checkout (no user accounts)
- **status**: Enum-like constraint for data integrity
- **stripe_payment_intent_id**: Link to Stripe payment

### order_items Table

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  beat_id UUID NOT NULL REFERENCES beats(id) ON DELETE RESTRICT,
  price_at_purchase DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Track individual items in each order.

**Design Decisions:**
- **price_at_purchase**: Store price at time of purchase (prices may change)
- **CASCADE delete**: If order deleted, items deleted too
- **RESTRICT delete**: Can't delete beat if it's in an order
- **quantity**: Usually 1, but allows for future bulk purchases

### downloads Table (Optional)

```sql
CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  beat_id UUID NOT NULL REFERENCES beats(id) ON DELETE RESTRICT,
  download_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Track secure download links for purchased beats.

**Design Decisions:**
- **download_token**: Secure random token for download URL
- **expires_at**: Download links expire after X days
- **download_count**: Track how many times downloaded
- **max_downloads**: Limit downloads per purchase

## Query Patterns

### Common Queries

**Get all beats:**
```sql
SELECT id, title, key, bpm, price, audio_path, cover_path 
FROM beats 
ORDER BY created_at DESC;
```

**Get beat by ID:**
```sql
SELECT id, title, key, bpm, price, audio_path, cover_path 
FROM beats 
WHERE id = $1::uuid;
```

**Search with filters:**
```sql
SELECT id, title, key, bpm, price, audio_path, cover_path 
FROM beats 
WHERE bpm = ANY($1::int[])
  AND LOWER(key) LIKE $2
  AND LOWER(title) LIKE $3
ORDER BY created_at DESC;
```

### Performance Considerations

**Parameterized Queries:**
- Always use `$1`, `$2`, etc. placeholders
- Never concatenate user input into SQL
- Prevents SQL injection
- Allows query plan caching

**Example:**
```typescript
// ✅ GOOD
await pool.query('SELECT * FROM beats WHERE id = $1', [beatId]);

// ❌ BAD (SQL injection vulnerable)
await pool.query(`SELECT * FROM beats WHERE id = '${beatId}'`);
```

## Database Maintenance

### Backup Strategy

See `docs/BACKUP_STRATEGY.md` for detailed backup procedures.

**Quick Backup:**
```bash
pg_dump -U postgres muzbeats_dev > backup.sql
```

**Restore:**
```bash
psql -U postgres muzbeats_dev < backup.sql
```

### Migration Strategy

**Current Approach:**
- Manual SQL scripts in `server/src/db/`
- Run migrations manually
- No migration framework yet

**Future Approach:**
- Consider `node-pg-migrate` or Prisma migrations
- Version-controlled migrations
- Automatic migration on deploy

## Environment Variables

**Required:**
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: muzbeats)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (default: empty)

See `docs/ENV_SETUP.md` for detailed setup instructions.

---

**Last Updated**: November 2025
**Database Version**: 1.0

