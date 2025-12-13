# Email Logo Fix

## Problem
The skimask logo doesn't appear in email receipts.

## Root Cause
The logo URL in emails was using `localhost:3000` in development, which doesn't work in emails (email clients can't access localhost).

## Solution

The logo URL now prioritizes:
1. **BACKEND_URL** (production) - `https://api.prodmuz.com/assets/images/skimask.png`
2. **R2_PUBLIC_URL** (if logo is uploaded to R2) - `https://pub-xxxxx.r2.dev/images/skimask.png`
3. **FRONTEND_URL** (fallback)
4. **Hardcoded production URL** (last resort)

---

## Option 1: Upload Logo to R2 (Recommended)

If you want the logo to load from R2 (faster, CDN):

1. **Upload logo to R2:**
   ```bash
   aws s3 cp server/public/assets/images/skimask.png \
     s3://muzbeats-audio/images/skimask.png \
     --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
   ```

2. **Set R2_PUBLIC_URL in server/.env:**
   ```env
   R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
   ```

3. **Logo will load from:** `https://pub-xxxxx.r2.dev/images/skimask.png`

---

## Option 2: Use Backend URL (Current Setup)

The logo will load from your backend server:

1. **Set BACKEND_URL in server/.env:**
   ```env
   BACKEND_URL=https://api.prodmuz.com
   ```

2. **Logo will load from:** `https://api.prodmuz.com/assets/images/skimask.png`

3. **Make sure the logo is accessible:**
   - Logo should be at `server/public/assets/images/skimask.png`
   - Backend should serve static files from `/assets`
   - Test: `curl https://api.prodmuz.com/assets/images/skimask.png`

---

## Option 3: Use Frontend URL

If your frontend serves the logo:

1. **Set FRONTEND_URL in server/.env:**
   ```env
   FRONTEND_URL=https://www.prodmuz.com
   ```

2. **Logo will load from:** `https://www.prodmuz.com/assets/images/skimask.png`

---

## Testing

After updating environment variables:

1. **Restart your server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Make a test purchase**

3. **Check the email:**
   - Logo should appear in the email header
   - Right-click logo → "Copy image address" to verify URL
   - URL should be accessible (not localhost)

---

## Current Status

✅ **Code updated** - Logo URL now uses production URLs
⚠️ **Action needed:** 
   - Set `BACKEND_URL` in `server/.env` for local dev
   - Or upload logo to R2 and set `R2_PUBLIC_URL`
   - Restart server after updating env vars

