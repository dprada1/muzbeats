# Troubleshooting 502 Error on Railway

## What 502 Means

**502 Bad Gateway** = DNS is working (domain resolves), but the server isn't responding correctly.

---

## Quick Checklist

### 1. Is Your Railway Service Running? ⚠️ **Check This First!**

1. Go to Railway dashboard
2. Click your backend service
3. Check the **"Deployments"** tab
4. Is the latest deployment **"Active"** (green) or **"Failed"** (red)?

**If it's failed or not running:**
- Check the logs for errors
- Make sure the service is deployed and running

### 2. Check Railway Domain Status

1. In Railway, go to **Settings** → **Domains**
2. Look at `api.prodmuz.com`
3. What does it say?
   - ✅ "Active" or "SSL Active" = Good
   - ⏳ "Pending" or "Provisioning" = Wait longer
   - ❌ "Failed" = Problem

### 3. Check Cloudflare DNS Record

1. Go to Cloudflare → **DNS** → **Records**
2. Find the `api` CNAME record
3. Is it:
   - ✅ **Proxied** (orange cloud)? = Good
   - ❌ **DNS only** (gray cloud)? = Change to Proxied!

**Important:** Must be **Proxied** (orange cloud) for SSL to work!

### 4. Check Railway Logs

1. In Railway, go to your service
2. Click **"Logs"** tab
3. Do you see:
   - ✅ `🚀 Server running on http://localhost:8080` = Good
   - ❌ Errors or crashes? = Problem

### 5. Test Railway URL Directly

Try accessing your Railway URL directly (not the custom domain):

```bash
curl https://your-service-name.up.railway.app/health
```

Replace `your-service-name` with your actual Railway service name.

**If this works but `api.prodmuz.com` doesn't:**
- DNS/SSL issue
- Wait longer or check DNS settings

**If this also gives 502:**
- Railway service issue
- Check logs and deployment status

---

## Common Causes & Fixes

### Cause 1: Service Not Running

**Symptoms:**
- Railway shows "Failed" or "Stopped"
- Logs show errors

**Fix:**
- Check deployment logs
- Fix any errors
- Redeploy

### Cause 2: DNS Not Proxied

**Symptoms:**
- DNS record shows gray cloud (DNS only)
- SSL certificate pending

**Fix:**
1. Go to Cloudflare DNS
2. Click the `api` CNAME record
3. Change **Proxy status** to **Proxied** (orange cloud)
4. Save
5. Wait 5-10 minutes

### Cause 3: SSL Certificate Not Ready

**Symptoms:**
- Railway shows "SSL Pending"
- DNS is correct but still 502

**Fix:**
- Wait 5-10 minutes
- Railway provisions SSL automatically
- Check Railway dashboard for SSL status

### Cause 4: Wrong Port Configuration

**Symptoms:**
- Service is running
- But requests fail

**Fix:**
1. Check Railway **Variables** tab
2. Make sure `PORT` is set (Railway usually sets this automatically)
3. Your code uses `process.env.PORT || 3000`, so it should work

### Cause 5: DNS Propagation

**Symptoms:**
- Everything looks correct
- But still 502

**Fix:**
- DNS can take 5-60 minutes to propagate globally
- Wait longer
- Try from different network/location

---

## Step-by-Step Debugging

### Step 1: Verify Railway Service

```bash
# Check if Railway service is running
# Go to Railway dashboard → Deployments
# Should show "Active" (green)
```

### Step 2: Check Railway Logs

```bash
# In Railway → Logs tab
# Look for:
# ✅ "Server running on http://localhost:8080"
# ✅ "Connected to PostgreSQL"
# ❌ Any errors?
```

### Step 3: Test Railway URL Directly

```bash
# Get your Railway URL from Settings → Domains
curl https://xxxxxx.up.railway.app/health
```

**If this works:** DNS/domain issue  
**If this fails:** Railway service issue

### Step 4: Verify DNS Record

```bash
# Check DNS resolution
dig api.prodmuz.com

# Should show CNAME pointing to Railway domain
```

### Step 5: Check Cloudflare Proxy Status

- DNS record must be **Proxied** (orange cloud)
- Not **DNS only** (gray cloud)

---

## Quick Fixes

### Fix 1: Ensure Service is Running

1. Railway → Your service → Deployments
2. If failed, check logs and fix errors
3. Redeploy if needed

### Fix 2: Set DNS to Proxied

1. Cloudflare → DNS → Records
2. Click `api` CNAME record
3. Change to **Proxied** (orange cloud)
4. Save

### Fix 3: Wait for SSL

1. Railway → Settings → Domains
2. Wait for "SSL Active" status
3. Usually takes 5-10 minutes

### Fix 4: Check Environment Variables

1. Railway → Variables
2. Make sure `PORT` is set (or Railway sets it automatically)
3. Check other required vars (database, Stripe, etc.)

---

## Why Wait Times?

**DNS Propagation (5-60 minutes):**
- DNS changes need to propagate globally
- Different locations see changes at different times
- Cloudflare usually fast (5-10 min), but can take up to 60 min

**SSL Certificate (5-10 minutes):**
- Railway requests SSL certificate from Let's Encrypt
- Certificate authority needs to verify domain
- Usually completes in 5-10 minutes

---

## Test Commands

```bash
# Test Railway URL directly
curl https://your-railway-url.up.railway.app/health

# Test custom domain
curl https://api.prodmuz.com/health

# Check DNS
dig api.prodmuz.com
nslookup api.prodmuz.com
```

---

## Still Not Working?

Share:
1. Railway deployment status (Active/Failed?)
2. Railway logs (any errors?)
3. Cloudflare DNS record (Proxied or DNS only?)
4. Railway domain status (Active/Pending?)
5. Result of direct Railway URL test

This will help identify the exact issue!

