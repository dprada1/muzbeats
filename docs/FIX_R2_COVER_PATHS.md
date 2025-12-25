# Fix R2 Cover Path Mismatch

## Problem

Covers are in R2 at:
- `images/covers/used/<beat_id>.webp` ❌

But database has:
- `cover_path = /assets/images/covers/<beat_id>.webp` ✅

When `getR2Url()` processes this, it creates:
- R2 URL: `https://r2.dev/images/covers/<beat_id>.webp` ❌ (file doesn't exist here)

## Solution: Move Files in R2

Move covers from `images/covers/used/` to `images/covers/` to match database structure.

### Option 1: Use the Script (Recommended)

```bash
# Set your R2 endpoint
export R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com

# Run the script
./scripts/fix-r2-cover-paths.sh
```

### Option 2: Manual AWS CLI Commands

```bash
# List files in used/ folder
aws s3 ls s3://muzbeats-media-public/images/covers/used/ \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  --recursive

# Move all files (example for one file)
aws s3 mv \
  s3://muzbeats-media-public/images/covers/used/fa17ccfb-9f5a-4c0f-a70b-2af3b16c0fd5.webp \
  s3://muzbeats-media-public/images/covers/fa17ccfb-9f5a-4c0f-a70b-2af3b16c0fd5.webp \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com

# Or use a loop to move all
for file in $(aws s3 ls s3://muzbeats-media-public/images/covers/used/ \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  --recursive | awk '{print $4}'); do
  filename=$(basename "$file")
  aws s3 mv \
    "s3://muzbeats-media-public/images/covers/used/${filename}" \
    "s3://muzbeats-media-public/images/covers/${filename}" \
    --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
done
```

### Option 3: Re-upload from Local

If you prefer to re-upload:

```bash
# Upload from local used/ folder directly to covers/ in R2
aws s3 sync server/public/assets/images/covers/used/ \
  s3://muzbeats-media-public/images/covers/ \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  --exclude "*.DS_Store"
```

This will:
- Upload files from `server/public/assets/images/covers/used/<beat_id>.webp`
- To R2 at `images/covers/<beat_id>.webp` ✅

## Verify After Moving

```bash
# Check files are now in the right place
aws s3 ls s3://muzbeats-media-public/images/covers/ \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  --recursive | wc -l

# Should show ~90 files (one per beat with cover)

# Test a specific cover URL
curl -I https://<R2_PUBLIC_URL>/images/covers/<beat_id>.webp
# Should return 200 OK
```

## After Fixing

1. **Refresh staging site**: Hard refresh (Cmd+Shift+R) to clear cache
2. **Check browser console**: Should see images loading from R2 URLs
3. **Verify speed**: Should load much faster now

## Why This Happened

The local folder structure has `covers/used/` to organize files, but:
- Database uses flat structure: `/assets/images/covers/<beat_id>.webp`
- R2 should match: `images/covers/<beat_id>.webp`
- The `used/` folder is just for local organization, not for R2

