# Debugging 502 Error When Deployment is Successful

## The Problem

- ✅ Latest deployment shows "ACTIVE" (green)
- ✅ Build succeeded
- ❌ But getting 502 errors
- ❌ Service shows "Online" but has alert

This means: **The service is running but crashing at runtime!**

---

## Step 1: Check Runtime Logs (Not Build Logs)

1. Click the **"Logs"** tab (top navigation)
2. Change time range to **"Last 1 hour"** or **"Last 24 hours"**
3. Look for:
   - ❌ Error messages
   - ❌ "Cannot connect to database"
   - ❌ "Missing environment variable"
   - ❌ "Port already in use"
   - ❌ Any red error text

**If logs are empty:**
- Try clicking the **"Live"** or **"Tail"** button to see real-time logs
- The service might be crashing immediately on startup

---

## Step 2: Check Environment Variables

1. Go to **"Variables"** tab
2. Verify these are set:

**Required:**
- `DATABASE_URL` OR (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)
- `STRIPE_SECRET_KEY`
- `RESEND_API_KEY` (optional but needed for emails)
- `PORT` (Railway usually sets this automatically)

**If any are missing:** That's your problem!

---

## Step 3: Test Railway URL Directly

1. In Railway → **Settings** → **Networking**
2. Copy the Railway-generated URL (e.g., `xxxxxx.up.railway.app`)
3. Test it:

```bash
curl https://your-railway-url.up.railway.app/health
```

**If this works:** Domain/DNS issue  
**If this also fails:** Service is crashing

---

## Step 4: Check Database Connection

If you see database errors in logs:

1. Go to Railway → Your project
2. Check if PostgreSQL database is running
3. Verify `DATABASE_URL` is set correctly
4. Test database connection

---

## Common Runtime Errors

### Error: "Cannot connect to database"
**Fix:** Set `DATABASE_URL` in Variables

### Error: "Missing STRIPE_SECRET_KEY"
**Fix:** Add Stripe keys to Variables

### Error: "Port already in use"
**Fix:** Remove `PORT` from Variables (Railway sets it automatically)

### Error: "ENOENT: no such file or directory"
**Fix:** Missing files or wrong paths

### Service starts then immediately crashes
**Fix:** Check logs for the exact error

---

## Quick Test Commands

```bash
# Test Railway URL directly (bypasses DNS)
curl https://your-railway-url.up.railway.app/health

# Test custom domain
curl https://api.prodmuz.com/health

# Check what error you get
curl -v https://api.prodmuz.com/health
```

---

## What to Share

1. **Runtime logs** (from Logs tab, not build logs)
2. **Environment variables** (which ones are set?)
3. **Railway URL test** (does direct Railway URL work?)
4. **Any error messages** you see

The build succeeded, so the problem is at runtime!

