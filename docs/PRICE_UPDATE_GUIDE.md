# Price Update Guide

## Problem
Prices were inconsistent between `data.json` and the database, showing $4.99 in some places and $19.99 in others.

## Solution: Update Everything to $19.99

### Step 1: Update data.json (Source of Truth)

✅ **Already done!** All prices in `server/public/assets/data.json` have been updated from `4.99` to `19.99`.

### Step 2: Sync Local Database

Run this command to sync prices from `data.json` to your local database:

```bash
cd server
npx tsx src/db/sync-prices-from-json.ts
```

This will:
- Read all beats from `data.json`
- Update database prices to match `data.json` prices
- Report any beats that don't exist in the database

### Step 3: Sync Production Database (Railway)

**Option A: Using Railway's Public DATABASE_URL**

1. Get your Railway database public URL:
   - Go to Railway Dashboard → Your PostgreSQL service
   - Copy the **Public** `DATABASE_URL` (not the internal one)

2. Run the sync script locally against Railway:
   ```bash
   cd server
   DATABASE_URL="postgresql://user:password@host:port/dbname" npx tsx src/db/sync-prices-from-json.ts
   ```

**Option B: Using update-prices.ts (Faster, but doesn't sync from JSON)**

If you just want to set all prices to $19.99 without syncing from JSON:

```bash
cd server
DATABASE_URL="postgresql://user:password@host:port/dbname" npx tsx src/db/update-prices.ts 19.99
```

### Step 4: Verify

After syncing, verify prices in both environments:

**Local:**
```bash
cd server
psql -h localhost -U postgres -d muzbeats_dev -c "SELECT MIN(price), MAX(price), AVG(price), COUNT(*) FROM beats;"
```

**Production (Railway):**
- Check via your application at `https://prodmuz.com`
- Or query the database directly using Railway's database connection

---

## Why This Happened

1. **data.json** had prices at `4.99`
2. **Database** was updated to `19.99` using `update-prices.ts`
3. When new beats are seeded from `data.json`, they get `4.99` prices
4. This creates inconsistency

## Permanent Fix

✅ **data.json** is now the source of truth with all prices at `19.99`
✅ **sync-prices-from-json.ts** script ensures database matches `data.json`
✅ Future migrations will use the correct prices from `data.json`

---

## Quick Commands Reference

```bash
# Update all prices to 19.99 (quick method)
npx tsx src/db/update-prices.ts 19.99

# Sync prices from data.json to database (recommended)
npx tsx src/db/sync-prices-from-json.ts

# Sync production database (replace with your Railway DATABASE_URL)
DATABASE_URL="your_railway_url" npx tsx src/db/sync-prices-from-json.ts
```

