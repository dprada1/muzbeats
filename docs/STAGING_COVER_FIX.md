# Fix Staging Cover Images Not Loading

## Problem
After updating cover_paths in staging DB, images don't load and site is slow (15-20s).

## Root Causes

1. **NODE_ENV check**: `getR2Url()` only returns R2 URLs when `NODE_ENV === 'production'`
   - Staging might have `NODE_ENV=staging` or not set
   - This causes backend to return relative paths instead of R2 URLs

2. **Images not in R2**: Covers might not be uploaded to R2 at the correct paths
   - DB has: `/assets/images/covers/<beat_id>.webp`
   - R2 needs: `images/covers/<beat_id>.webp`

3. **R2_PUBLIC_URL not set**: Staging might not have `R2_PUBLIC_URL` configured

## Solutions

### Solution 1: Fix NODE_ENV Check (Recommended)

Update `server/src/utils/r2.ts` to also check for staging environment:

```typescript
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.env.NODE_ENV === 'staging' ||
                     !!process.env.R2_PUBLIC_URL; // If R2 is configured, use it
```

### Solution 2: Set NODE_ENV in Staging

In Railway Dashboard → Staging service → Variables:
- Add: `NODE_ENV=production` (or `NODE_ENV=staging` and update code)

### Solution 3: Verify R2 Configuration

Check staging has:
- `R2_PUBLIC_URL` set (e.g., `https://pub-xxxxx.r2.dev`)

### Solution 4: Upload Covers to R2

Make sure covers are in R2 at the correct paths:

```bash
# Upload used covers (90 beats)
aws s3 sync server/public/assets/images/covers/used/ \
  s3://muzbeats-media-public/images/covers/ \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
  --exclude "*.DS_Store"
```

This uploads files like:
- Local: `server/public/assets/images/covers/used/<beat_id>.webp`
- R2: `images/covers/<beat_id>.webp` ✅

## Quick Fix Steps

1. **Check staging environment variables:**
   - Railway Dashboard → Staging service → Variables
   - Verify `R2_PUBLIC_URL` is set
   - Optionally set `NODE_ENV=production`

2. **Verify covers are in R2:**
   ```bash
   aws s3 ls s3://muzbeats-media-public/images/covers/ \
     --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
     --recursive | wc -l
   ```
   Should show ~90 files

3. **Test a cover URL directly:**
   ```bash
   curl -I https://<R2_PUBLIC_URL>/images/covers/<beat_id>.webp
   ```
   Should return `200 OK`

4. **Update code to handle staging** (if needed):
   - Modify `getR2Url()` to also work in staging environment

