# Fix Staging Cover Images

## Problem
New beats' cover arts don't load on staging (but old ones do).

## Root Cause
The cover images are stored locally but haven't been uploaded to R2 with the correct structure. The database paths need to match the R2 structure.

**Correct structure:**
- **Database**: `/assets/images/covers/<beat_id>.webp`
- **R2**: `images/covers/<beat_id>.webp`
- **Local files**: `server/public/assets/images/covers/<beat_id>.webp`

Note: The `used/` folder was only for organization and has been removed.

## Solution (3 Steps)

### Step 1: Upload Covers to R2 (Flat Structure)

The covers need to be uploaded to R2 WITHOUT the "used" folder. The `used/` folder is only for local organization.

```bash
# Export R2 credentials (get from 1Password or Cloudflare Dashboard)
export R2_ENDPOINT=https://a9eba83c23486e01c5a44f9ff5fd697d.r2.cloudflarestorage.com
export AWS_ACCESS_KEY_ID=<your_r2_access_key>
export AWS_SECRET_ACCESS_KEY=<your_r2_secret_key>

# Upload covers to R2 (flat structure)
./scripts/upload-covers-flat.sh
```

**What this does:**
- Uploads from: `server/public/assets/images/covers/<beat_id>.webp`
- To R2: `images/covers/<beat_id>.webp`

**Verify upload:**
```bash
# List files in R2 to confirm they're at the correct location
aws s3 ls s3://muzbeats-media-public/images/covers/ \
  --endpoint-url $R2_ENDPOINT \
  --recursive | head -10

# Should show: images/covers/<uuid>.webp
# NOT: images/covers/used/<uuid>.webp
```

### Step 2: Update Staging Database Paths

Get your staging DATABASE_URL from Railway Dashboard:
1. Go to Railway Dashboard → Your Project → Staging service
2. Click **Variables** tab
3. Copy the `DATABASE_URL` value

Then update the database:

```bash
cd server

# Dry run first (see what will change)
DATABASE_URL="<paste-staging-db-url>" npm run update-covers

# Apply changes
DATABASE_URL="<paste-staging-db-url>" npm run update-covers -- --apply
```

**What this does:**
- Sets all `cover_path` values to: `/assets/images/covers/<beat_id>.webp`
- This matches the R2 structure (after getR2Url() transforms it)

### Step 3: Test Staging

```bash
# Test a cover URL directly (replace with actual beat_id)
curl -I https://pub-5a7451abfd304586ac4e34f6f8fa8e40.r2.dev/images/covers/0087e976-adcb-4028-b5c1-13aae633fc73.webp

# Should return: 200 OK
```

Then visit staging and hard refresh:
- Visit: https://staging.prodmuz.com/store
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Verify cover images load for all beats

## Why This Works

The flow is:
1. **Database stores**: `/assets/images/covers/<beat_id>.webp`
2. **getR2Url() transforms**:
   - Removes leading `/` → `assets/images/covers/<beat_id>.webp`
   - Removes `assets/` → `images/covers/<beat_id>.webp`
3. **Final R2 URL**: `https://pub-xxx.r2.dev/images/covers/<beat_id>.webp`

So R2 must have files at: `images/covers/<beat_id>.webp` (flat structure, no "used" folder).

## Troubleshooting

### Issue: "aws command not found"
Install AWS CLI:
```bash
brew install awscli
```

### Issue: Cover still showing skimask.png
1. Check database paths are correct:
   ```bash
   DATABASE_URL="<staging-db-url>" psql -c "SELECT id, cover_path FROM beats LIMIT 5"
   ```
   Should show: `/assets/images/covers/<uuid>.webp`

2. Check R2 file exists:
   ```bash
   curl -I https://<R2_PUBLIC_URL>/images/covers/<beat_id>.webp
   ```
   Should return: `200 OK`

3. Check environment variables in Railway:
   - `R2_PUBLIC_URL` should be set
   - `NODE_ENV` should be `production` or `staging`

### Issue: Beats loading slowly
This is likely a caching/CDN issue. After uploading to R2:
1. Clear Cloudflare cache (if using Cloudflare CDN)
2. Hard refresh the browser
3. Wait a few minutes for CDN to propagate

## Files Changed
- ✅ `server/src/db/update-cover-paths.ts` - Fixed default prefix (removed "/used")
- ✅ `scripts/upload-covers-flat.sh` - Created new script for flat upload
- ✅ `FIX_STAGING_COVERS.md` - This guide

## Summary
The issue was that the database and R2 structure were misaligned. We had:
- ❌ DB: `/assets/images/covers/used/<beat_id>.webp`
- ❌ R2: Not uploaded yet (or in wrong location)

Now we have:
- ✅ DB: `/assets/images/covers/<beat_id>.webp`
- ✅ R2: `images/covers/<beat_id>.webp`

This matches the expected structure for `getR2Url()` to work correctly.

