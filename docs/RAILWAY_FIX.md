# Fixing Railway Deployment

## Problem
Railway is trying to deploy from the root directory instead of the `server` folder, causing build failures.

## Solution: Configure Root Directory in Railway

### Step 1: Open Railway Service Settings

1. Go to your Railway dashboard
2. Click on your **muzbeats** service
3. Click on **Settings** tab
4. Scroll down to **Source** section

### Step 2: Set Root Directory

1. Find **Root Directory** setting
2. Enter: `server`
3. Click **Save**

### Step 3: Configure Build Settings

1. Still in **Settings** tab
2. Scroll to **Build & Deploy** section
3. Set:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Click **Save**

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click **Redeploy** (or push a new commit)
3. Watch the build logs

---

## Alternative: If Root Directory Setting Doesn't Exist

If Railway doesn't have a "Root Directory" setting, use this approach:

### Option A: Create railway.toml in Root

Create a file called `railway.toml` in the root of your repository:

```toml
[build]
builder = "nixpacks"
buildCommand = "cd server && npm install && npm run build"

[deploy]
startCommand = "cd server && npm start"
```

### Option B: Use Railway CLI

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Link your project:
   ```bash
   railway link
   ```

4. Set root directory:
   ```bash
   railway variables set RAILWAY_ROOT_DIRECTORY=server
   ```

---

## Verify Configuration

After setting up, check:

1. **Build logs** should show:
   - `cd server` or working in server directory
   - `npm install` running
   - `npm run build` running
   - TypeScript compilation

2. **Start command** should be:
   - `npm start` (which runs `node dist/index.js`)

---

## Common Issues

### Issue: "Cannot find module"

**Solution:** Make sure `build` command runs and creates `dist/` folder

### Issue: "Port already in use"

**Solution:** Railway sets `PORT` automatically, your code should use `process.env.PORT || 3000` (which you already have ✅)

### Issue: "Database connection failed"

**Solution:** Make sure `DATABASE_URL` environment variable is set in Railway

---

## Next Steps After Successful Deploy

1. Add PostgreSQL database in Railway
2. Set environment variables
3. Run database migrations
4. Configure custom domain

