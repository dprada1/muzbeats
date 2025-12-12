# Cloudflare Pages Setup Guide

## Problem
Cloudflare Pages is trying to use Wrangler (Workers) instead of building your static site.

## Solution: Configure Build Settings

### Step 1: Go to Cloudflare Pages Settings

1. In Cloudflare Dashboard, go to **Pages**
2. Click on your project (or create new one)
3. Go to **Settings** → **Builds & deployments**

### Step 2: Configure Build Settings

**Framework preset:** `Vite` (or `Create React App` if Vite not available)

**Build command:**
```bash
cd client && npm install && npm run build
```

**Build output directory:**
```
client/dist
```

**Root directory (optional):**
```
/
```
(Leave empty or set to `/` - Cloudflare will use the repo root)

**Node.js version:**
```
20
```
(or latest available)

### Step 3: Environment Variables

Go to **Settings** → **Environment variables** and add:

**Production:**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_API_URL=https://api.prodmuz.com
```

**Preview:**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=https://api.prodmuz.com
```

### Step 4: Save and Redeploy

1. Click **Save**
2. Go to **Deployments** tab
3. Click **Retry deployment** or push a new commit

---

## Alternative: If Framework Preset Doesn't Work

If Cloudflare doesn't detect Vite correctly, use **Custom** build:

**Build command:**
```bash
cd client && npm ci && npm run build
```

**Build output directory:**
```
client/dist
```

---

## Verify Build Output

After deployment, check that:
- Build completes successfully
- Output directory contains `index.html` and assets
- Site is accessible at your domain

---

## Troubleshooting

### Issue: "Missing entry-point to Worker script"

**Solution:** You're in Workers mode, not Pages mode. Make sure you created a **Pages** project, not a **Workers** project.

### Issue: "Build output not found"

**Solution:** 
- Check that build command runs successfully
- Verify output directory is `client/dist`
- Check that `client/dist` contains `index.html`

### Issue: "Cannot find module"

**Solution:**
- Make sure build command includes `npm install` or `npm ci`
- Check that all dependencies are in `client/package.json`

---

## Quick Checklist

- [ ] Created **Pages** project (not Workers)
- [ ] Framework preset: **Vite** or **Custom**
- [ ] Build command: `cd client && npm install && npm run build`
- [ ] Output directory: `client/dist`
- [ ] Environment variables set
- [ ] Custom domain configured
- [ ] Build succeeds
- [ ] Site loads at domain

