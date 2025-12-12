# Setting Up Custom Domain on Railway

## Quick Answer: No Port Needed! ✅

Railway automatically handles ports. You don't need to specify one when adding a custom domain.

---

## Step-by-Step: Add Custom Domain to Railway

### Step 1: In Railway Dashboard

1. Go to your Railway project
2. Click on your **backend service** (the one that's running)
3. Go to **Settings** tab
4. Scroll down to **Domains** section
5. Click **"Generate Domain"** (if you haven't already)
6. Click **"Custom Domain"** or **"Add Custom Domain"**
7. Enter: `api.prodmuz.com`
8. Click **"Add"**

**Note:** Use `api.prodmuz.com` (not just `prodmuz.com`) because:
- `prodmuz.com` will be for your frontend (Cloudflare Pages)
- `api.prodmuz.com` will be for your backend (Railway)

### Step 2: Railway Will Show You DNS Records

After adding the domain, Railway will show you something like:

```
Add this CNAME record:
Name: api
Target: xxxxxx.up.railway.app
```

**Copy this information** - you'll need it for Cloudflare.

---

## Step 3: Add DNS Record in Cloudflare

1. Go to **Cloudflare Dashboard**
2. Click on your domain **`prodmuz.com`**
3. Go to **DNS** → **Records**
4. Click **"Add record"**
5. Fill in:
   - **Type:** `CNAME`
   - **Name:** `api`
   - **Target:** `xxxxxx.up.railway.app` (paste what Railway gave you)
   - **Proxy status:** ☁️ **Proxied** (orange cloud - important for SSL!)
6. Click **"Save"**

---

## Step 4: Wait for SSL

1. Railway will automatically provision an SSL certificate
2. Takes **5-10 minutes**
3. Check Railway dashboard - it will show "SSL Active" when ready

---

## Step 5: Update Environment Variables

Once the domain is working, update your environment variables:

### In Railway:
- `BACKEND_URL=https://api.prodmuz.com`
- `FRONTEND_URL=https://prodmuz.com`

### In Cloudflare Pages:
- `VITE_API_URL=https://api.prodmuz.com`

---

## Common Questions

### Q: What port should I use?
**A:** You don't specify a port! Railway automatically handles it. Your app runs on port 3000 (or whatever `PORT` env var is set to), but Railway routes traffic from port 80/443 (HTTP/HTTPS) to your app automatically.

### Q: Should I use `prodmuz.com` or `api.prodmuz.com`?
**A:** Use `api.prodmuz.com` for the backend because:
- `prodmuz.com` → Frontend (Cloudflare Pages)
- `api.prodmuz.com` → Backend (Railway)

This keeps things organized and allows you to have both on the same domain.

### Q: What if Railway says "Domain already in use"?
**A:** Make sure you're using `api.prodmuz.com` (with the `api.` subdomain), not just `prodmuz.com`.

### Q: How do I know if it's working?
**A:** After DNS propagates (5-60 minutes), visit:
- `https://api.prodmuz.com/health`
- Should return: `{"status":"ok","message":"Server is running"}`

---

## Troubleshooting

### Issue: "Domain not resolving"
- Wait 5-60 minutes for DNS propagation
- Check DNS record in Cloudflare (should be CNAME, Proxied)
- Verify target matches Railway's provided domain

### Issue: "SSL certificate pending"
- Wait 5-10 minutes
- Make sure DNS record is **Proxied** (orange cloud) in Cloudflare
- Check Railway dashboard for SSL status

### Issue: "Connection refused"
- Check that your Railway service is running
- Verify `PORT` environment variable is set (or defaults to 3000)
- Check Railway logs for errors

---

## Quick Checklist

- [ ] Added `api.prodmuz.com` as custom domain in Railway
- [ ] Copied CNAME target from Railway
- [ ] Added CNAME record in Cloudflare DNS
- [ ] Set DNS record to **Proxied** (orange cloud)
- [ ] Waited 5-10 minutes for SSL
- [ ] Tested `https://api.prodmuz.com/health`
- [ ] Updated `BACKEND_URL` in Railway env vars
- [ ] Updated `VITE_API_URL` in Cloudflare Pages env vars

---

**You're almost there!** Once the domain is set up, your backend will be accessible at `https://api.prodmuz.com` 🚀

