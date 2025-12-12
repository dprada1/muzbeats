# Railway Audio Files Setup

## Problem
Audio files (2.3GB) are gitignored and not deployed to Railway, causing 404 errors.

## Solution: Railway Volumes

### Step 1: Create a Volume in Railway

1. Go to Railway Dashboard → Your `muzbeats` project
2. Click on your backend service
3. Go to **Volumes** tab
4. Click **+ New Volume**
5. Name it: `audio-files`
6. Mount path: `/app/server/public/assets/beats`
7. Size: 3GB (or larger if needed)
8. Click **Create**

### Step 2: Upload Files to Volume

**Option A: Using Railway CLI (Recommended)**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Upload files (this will take a while for 2.3GB)
cd server/public/assets/beats
railway run cp -r mp3 /app/server/public/assets/beats/
railway run cp -r wav /app/server/public/assets/beats/
```

**Option B: Using Railway Web Interface**

1. Go to your service → **Volumes** tab
2. Click on the volume
3. Use the file upload interface (if available)
4. Upload the `mp3/` and `wav/` folders

### Step 3: Verify Files Are Accessible

After uploading, test:
```bash
curl https://api.prodmuz.com/assets/beats/mp3/pierre_bourne__uncommon_Dmin_152.mp3
```

---

## Alternative: Cloudflare R2 (Better Long-term Solution)

For production, consider using Cloudflare R2 for object storage:

1. **Create R2 Bucket** in Cloudflare
2. **Upload files** to R2
3. **Update backend** to serve from R2 URLs
4. **Update frontend** to use R2 URLs

This is better because:
- ✅ Files are served from CDN (faster)
- ✅ Doesn't bloat your Railway deployment
- ✅ Scales better
- ✅ Cheaper for large files

---

## Quick Fix: Temporarily Remove from .gitignore (NOT RECOMMENDED)

⚠️ **Warning**: This will make your git repo 2.3GB+ and slow down all git operations.

Only do this if you need a quick test:

1. Remove `*.mp3` and `*.wav` from `.gitignore`
2. `git add server/public/assets/beats/`
3. `git commit -m "Add audio files"`
4. `git push`

**This is NOT recommended for production!**

