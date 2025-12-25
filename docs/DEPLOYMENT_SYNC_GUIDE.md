# Deployment Sync Guide

This guide helps sync changes across localhost → staging → production.

## Current Issues Summary

### ✅ Localhost
- **Status**: Working perfectly
- **Beats**: 95 beats loaded
- **Cover arts**: Synced with YouTube (90 beats have covers, 5 newer beats don't)
- **Performance**: Fast loading
- **Email**: Working (via cloudflared tunnel)
- **Downloads**: Working

### ⚠️ Staging
- **Status**: Mostly working
- **Beats**: 95 beats (correct)
- **Cover arts**: Using skimask fallback (DB not synced with new cover paths)
- **Performance**: Good
- **Email**: Working
- **Downloads**: Working
- **Fix needed**: Update `cover_path` in staging DB

### ❌ Production
- **Status**: Multiple issues
- **Beats**: Only 63 beats (missing 32 beats)
- **Cover arts**: Not loading (R2 structure mismatch)
- **Performance**: Slow loading
- **Email**: Not sending
- **Downloads**: Working
- **Fixes needed**: 
  1. Import missing beats
  2. Update cover_paths
  3. Verify R2 structure
  4. Fix email configuration

---

## Step 1: Sync Staging DB Cover Paths

Staging DB needs to be updated with the new cover paths from localhost.

### Option A: Use Update Script with DATABASE_URL (Recommended)

**Get your staging DATABASE_URL from Railway Dashboard:**
1. Go to Railway Dashboard → Your project → Staging service
2. Click on **Variables** tab
3. Find `DATABASE_URL` and copy it

**Then run locally:**

```bash
cd server
DATABASE_URL="<paste-staging-db-url-here>" npm run update-covers -- --apply
```

This will connect to staging DB and update all cover_paths to `/assets/images/covers/<beat_id>.webp`.

### Option B: Export from Localhost, Import to Staging

```bash
# 1. Export cover paths from localhost DB
cd server
DATABASE_URL="postgresql://localhost:5432/muzbeats" \
  npm run update-covers -- --dry-run > /tmp/localhost_covers.txt

# 2. Get staging DATABASE_URL from Railway Dashboard, then:
DATABASE_URL="<staging-db-url>" npm run update-covers -- --apply
```

### Option C: Manual SQL Update (if scripts don't work)

```bash
# Connect to staging DB directly (get connection string from Railway)
psql "<staging-db-url>" -c "
  UPDATE beats 
  SET cover_path = '/assets/images/covers/' || id || '.webp',
      updated_at = NOW()
  WHERE cover_path IS NULL 
     OR cover_path != '/assets/images/covers/' || id || '.webp';
"
```

This will update all cover_paths to `/assets/images/covers/<beat_id>.webp` format.

---

## Step 2: Fix Production - Import Missing Beats

Production only has 63 beats, needs 95.

### Check what's missing:

**Get production DATABASE_URL from Railway Dashboard**, then:

```bash
cd server
DATABASE_URL="<prod-db-url>" \
  node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    (async () => {
      const result = await pool.query('SELECT COUNT(*) FROM beats');
      console.log('Production beats:', result.rows[0].count);
      await pool.end();
    })();
  "
```

### Import missing beats from MP3 files:

**Option 1: If you have MP3 files locally:**

```bash
cd server
DATABASE_URL="<prod-db-url>" \
  npm run import-beats -- \
    --dir ../server/public/assets/beats/mp3 \
    --price 19.99 \
    --cover /assets/images/covers/skimask.png \
    --apply
```

**Option 2: Export from localhost DB, import to production:**

Since localhost has all 95 beats, you can export them and import to production:

```bash
# 1. Export beats from localhost (as JSON or SQL)
cd server
DATABASE_URL="postgresql://localhost:5432/muzbeats" \
  psql -c "COPY (SELECT * FROM beats) TO STDOUT WITH CSV HEADER" > /tmp/localhost_beats.csv

# 2. Import to production (you'll need to write a script or use pgAdmin)
# Or use the migrate script if you have a data.json file
```

**Note**: The import script only adds beats that don't already exist (by audio_path).

---

## Step 3: Fix Production - Update Cover Paths

After importing beats, update cover_paths to match the new structure:

**Get production DATABASE_URL from Railway Dashboard**, then:

```bash
cd server
DATABASE_URL="<prod-db-url>" npm run update-covers -- --apply
```

This sets all cover_paths to `/assets/images/covers/<beat_id>.webp`.

**Alternative: Direct SQL (if script doesn't work):**

```bash
psql "<prod-db-url>" -c "
  UPDATE beats 
  SET cover_path = '/assets/images/covers/' || id || '.webp',
      updated_at = NOW();
"
```

---

## Step 4: Verify R2 Structure

Production cover arts aren't loading. Verify R2 bucket structure:

### Check R2 bucket structure:

```bash
# List covers in R2
aws s3 ls s3://muzbeats-media-public/images/covers/ \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
  --recursive | head -20
```

### Expected structure:
- `images/covers/<beat_id>.webp` (for used covers)
- `images/covers/unused/{artist}/*.webp` (for unused covers)

### If covers are missing, upload them:

```bash
# Upload used covers
aws s3 sync server/public/assets/images/covers/used/ \
  s3://muzbeats-media-public/images/covers/ \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
  --exclude "*.DS_Store"

# Upload unused covers (if needed)
aws s3 sync server/public/assets/images/covers/unused/ \
  s3://muzbeats-media-public/images/covers/unused/ \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
  --exclude "*.DS_Store"
```

---

## Step 5: Fix Production Email

Production emails aren't sending. Check environment variables:

### Required variables (in Railway production service):

1. **RESEND_API_KEY**: Your Resend API key
2. **RESEND_FROM_EMAIL**: Must be a verified domain (e.g., `MuzBeats <noreply@prodmuz.com>`)
3. **BACKEND_URL**: Should be `https://api.prodmuz.com`

### Verify in Railway:
1. Go to Railway Dashboard → Production service
2. Check **Variables** tab
3. Ensure all three variables are set correctly

### Test email sending:

```bash
# On production (via Railway CLI)
curl -X POST https://api.prodmuz.com/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com"}'
```

---

## Step 6: Fix Production Performance

Production is slow. Possible causes:

1. **R2 URLs not configured**: Check `R2_PUBLIC_URL` is set in production
2. **Database connection**: Check connection pooling
3. **Missing indexes**: Verify database indexes exist

### Check R2 configuration:

```bash
# In Railway production service variables
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

---

## Quick Sync Checklist

### Staging:
- [ ] Update cover_paths: `npm run update-covers -- --apply`
- [ ] Verify covers load in browser
- [ ] Test purchase flow

### Production:
- [ ] Import missing beats: `npm run import-beats -- --apply`
- [ ] Update cover_paths: `npm run update-covers -- --apply`
- [ ] Upload covers to R2 (if missing)
- [ ] Verify R2_PUBLIC_URL is set
- [ ] Check email variables (RESEND_API_KEY, RESEND_FROM_EMAIL, BACKEND_URL)
- [ ] Test purchase flow
- [ ] Verify email delivery

---

## Database Connection Strings

### Localhost:
```bash
DATABASE_URL="postgresql://localhost:5432/muzbeats"
```

### Staging:
Get from Railway Dashboard → Staging service → Variables → `DATABASE_URL`

### Production:
Get from Railway Dashboard → Production service → Variables → `DATABASE_URL`

---

## Getting Database URLs (Without Railway CLI)

### Method 1: Railway Dashboard (Easiest)

1. Go to [Railway Dashboard](https://railway.app)
2. Select your project
3. Click on your **PostgreSQL database service** (not the backend service)
4. Go to **Variables** tab
5. Find `DATABASE_URL` and copy it
   - **Important**: Make sure it's the PUBLIC URL, not `*.railway.internal`
   - Public URLs look like: `postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway`
   - Internal URLs (won't work): `postgresql://...@postgres.railway.internal:5432/railway`
6. Use it in commands like: `DATABASE_URL="<paste-here>" npm run <command>`

### ⚠️ Important: Internal vs Public URLs

- **`.railway.internal`** URLs only work from inside Railway's network (won't work from your local machine)
- **Public URLs** (like `containers-us-west-xxx.railway.app`) work from anywhere
- If you see `postgres.railway.internal`, you need to get the public URL instead

### Method 2: Railway Web Terminal (Alternative)

1. Go to Railway Dashboard → Your service
2. Click on **Deployments** tab
3. Click on latest deployment
4. Click **View Logs** → **Shell** (if available)
5. Run commands directly in the web terminal

### Method 3: Install Railway CLI (Optional)

If you want CLI access later:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run command in production
railway run --service production <command>

# Run command in staging
railway run --service staging <command>
```

---

## Notes

- Always test in staging before production
- Backup databases before major updates
- Cover paths should be `/assets/images/covers/<beat_id>.webp`
- R2 bucket structure should match: `images/covers/<beat_id>.webp`
- Email requires verified domain in Resend

