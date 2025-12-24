# Quick Fix for Staging Cover Images

## TL;DR

Staging covers don't load because:
1. Images aren't uploaded to R2 yet
2. Database paths need updating

## Fix in 3 Steps (5 minutes)

### Step 1: Upload Covers to R2

```bash
# Set credentials (get from 1Password or Cloudflare Dashboard)
export R2_ENDPOINT=https://a9eba83c23486e01c5a44f9ff5fd697d.r2.cloudflarestorage.com
export AWS_ACCESS_KEY_ID=<your_key>
export AWS_SECRET_ACCESS_KEY=<your_secret>

# Upload (from project root)
./scripts/upload-covers-flat.sh
```

**Expected output**: "✅ All 90 files are in R2!"

### Step 2: Update Staging Database

```bash
# Get DATABASE_URL from Railway Dashboard → Staging service → Variables
cd server
DATABASE_URL="<paste-staging-db-url>" npm run update-covers -- --apply
```

**Expected output**: "✅ Done. Updated cover_path for 95 beats."

### Step 3: Test

Visit https://staging.prodmuz.com/store and hard refresh (`Cmd+Shift+R`).

All beat covers should now load! 🎉

## Troubleshooting

### "aws command not found"
```bash
brew install awscli
```

### Still showing skimask.png?
1. Check R2 file exists:
   ```bash
   curl -I https://pub-5a7451abfd304586ac4e34f6f8fa8e40.r2.dev/images/covers/0087e976-adcb-4028-b5c1-13aae633fc73.webp
   ```
   Should return `200 OK`

2. Check Railway environment variables:
   - `R2_PUBLIC_URL` must be set
   - `NODE_ENV` should be `production` or `staging`

3. Hard refresh browser (clear cache)

## What Changed?

**Before:**
- ❌ DB: `/assets/images/covers/used/<beat_id>.webp`
- ❌ R2: Not uploaded

**After:**
- ✅ DB: `/assets/images/covers/<beat_id>.webp`
- ✅ R2: `images/covers/<beat_id>.webp`

The flat structure (no `used/` folder) matches what `getR2Url()` expects.

## Need More Details?

See `STAGING_FIX_SUMMARY.md` for complete explanation.

