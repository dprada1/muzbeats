# Staging Cover Images Fix - Summary

## What Was Fixed

### Problem
- **Staging**: New beats' cover arts don't load (showing fallback skimask.png)
- **Localhost**: Works perfectly
- **Root cause**: Database paths and R2 structure were misaligned

### Solution Applied

1. **Updated database structure** (localhost and will be applied to staging)
   - Changed from: `/assets/images/covers/used/<beat_id>.webp`
   - Changed to: `/assets/images/covers/<beat_id>.webp`

2. **Reorganized local files**
   - Moved all covers from `server/public/assets/images/covers/used/` to `server/public/assets/images/covers/`
   - Removed the `used/` subdirectory (was only for organization)

3. **Created upload script**
   - New script: `scripts/upload-covers-flat.sh`
   - Uploads covers to R2 with correct flat structure

4. **Updated code**
   - Fixed `server/src/db/update-cover-paths.ts` default prefix
   - Updated from: `/assets/images/covers/used`
   - Updated to: `/assets/images/covers`

## Files Changed

### Modified Files
- ✅ `server/src/db/update-cover-paths.ts` - Fixed default prefix
- ✅ `scripts/upload-covers-flat.sh` - Created new upload script
- ✅ `FIX_STAGING_COVERS.md` - Step-by-step fix guide
- ✅ `STAGING_FIX_SUMMARY.md` - This summary

### Database Changes
- ✅ Updated all 95 beats in localhost database
- ⏳ Staging database needs to be updated (instructions below)

### File System Changes
- ✅ Moved 90 cover files from `covers/used/` to `covers/`
- ✅ Removed empty `used/` directory

## Next Steps for Staging

### Step 1: Upload Covers to R2

You need to upload the cover images to R2. Get your R2 credentials from 1Password or Cloudflare Dashboard.

```bash
# Set R2 credentials
export R2_ENDPOINT=https://a9eba83c23486e01c5a44f9ff5fd697d.r2.cloudflarestorage.com
export AWS_ACCESS_KEY_ID=<your_access_key>
export AWS_SECRET_ACCESS_KEY=<your_secret_key>

# Upload covers to R2
./scripts/upload-covers-flat.sh
```

**Verify the upload:**
```bash
# Should show ~90 files at images/covers/<uuid>.webp
aws s3 ls s3://muzbeats-media-public/images/covers/ \
  --endpoint-url $R2_ENDPOINT \
  --recursive | wc -l
```

### Step 2: Update Staging Database

Get your staging DATABASE_URL from Railway Dashboard:
1. Go to Railway → Your Project → Staging service
2. Click **Variables** tab
3. Copy `DATABASE_URL`

Then run:
```bash
cd server
DATABASE_URL="<paste-staging-db-url>" npm run update-covers -- --apply
```

This will update all cover_path values to the correct format.

### Step 3: Verify Staging

1. Visit https://staging.prodmuz.com/store
2. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Verify all beat covers load correctly

**Test a cover URL directly:**
```bash
curl -I https://pub-5a7451abfd304586ac4e34f6f8fa8e40.r2.dev/images/covers/0087e976-adcb-4028-b5c1-13aae633fc73.webp
# Should return: 200 OK
```

## How It Works Now

### Path Transformation Flow

1. **Database stores**: `/assets/images/covers/<beat_id>.webp`

2. **Backend (beatsService.ts)** calls `getR2Url()`:
   - In **local dev** (no R2_PUBLIC_URL): Returns original path → served by Express static middleware
   - In **staging/prod** (R2_PUBLIC_URL set): Transforms to R2 URL

3. **getR2Url() transformation**:
   ```
   Input:  /assets/images/covers/<beat_id>.webp
   Step 1: Remove leading / → assets/images/covers/<beat_id>.webp
   Step 2: Remove 'assets/' → images/covers/<beat_id>.webp
   Output: https://pub-xxx.r2.dev/images/covers/<beat_id>.webp
   ```

4. **Frontend receives**:
   - Local: `/assets/images/covers/<beat_id>.webp` (served by Express)
   - Staging/Prod: `https://pub-xxx.r2.dev/images/covers/<beat_id>.webp` (served by R2)

### Why This Structure?

- **Flat structure** in R2 matches the database paths after transformation
- **No `used/` folder** in R2 or database paths (was only for local organization)
- **Consistent** across local, staging, and production environments

## Verification Checklist

### Localhost ✅
- [x] Database paths updated to `/assets/images/covers/<beat_id>.webp`
- [x] Files moved to `server/public/assets/images/covers/<beat_id>.webp`
- [x] All 90 beats show correct covers
- [x] No fallback skimask.png images

### Staging ⏳
- [ ] Covers uploaded to R2 at `images/covers/<beat_id>.webp`
- [ ] Database paths updated to `/assets/images/covers/<beat_id>.webp`
- [ ] All beats show correct covers on staging.prodmuz.com
- [ ] R2_PUBLIC_URL environment variable is set in Railway

### Production ⏳
- [ ] Same steps as staging (to be done after staging is verified)

## Troubleshooting

### Issue: "aws command not found"
```bash
brew install awscli
```

### Issue: Covers still showing skimask.png on staging
1. Check R2 files exist:
   ```bash
   curl -I https://pub-xxx.r2.dev/images/covers/<beat_id>.webp
   ```
2. Check database paths:
   ```bash
   DATABASE_URL="<staging-url>" psql -c "SELECT id, cover_path FROM beats LIMIT 3"
   ```
3. Check Railway environment variables:
   - `R2_PUBLIC_URL` should be set
   - `NODE_ENV` should be `production` or `staging`

### Issue: Localhost covers not loading
This shouldn't happen since we moved the files, but if it does:
1. Check files exist: `ls server/public/assets/images/covers/*.webp | wc -l` (should be 90)
2. Check database: `psql -d muzbeats_dev -c "SELECT cover_path FROM beats LIMIT 3"`
3. Restart the server

## Related Documentation

- `FIX_STAGING_COVERS.md` - Detailed step-by-step instructions
- `docs/COVERS_WORKFLOW.md` - Original workflow (now outdated, needs update)
- `docs/VERIFY_R2_COVER_STRUCTURE.md` - R2 structure verification
- `docs/STAGING_COVER_FIX.md` - Previous fix attempt (now superseded)

## Summary

The fix involved aligning three things:
1. **Database paths**: `/assets/images/covers/<beat_id>.webp`
2. **Local files**: `server/public/assets/images/covers/<beat_id>.webp`
3. **R2 files**: `images/covers/<beat_id>.webp`

All three now use a flat structure (no `used/` folder), which makes the path transformation in `getR2Url()` work correctly.

**Status**: Localhost is fully working. Staging needs R2 upload + database update (instructions above).

