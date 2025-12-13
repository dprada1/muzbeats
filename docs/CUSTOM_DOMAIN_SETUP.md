# Custom Domain Setup: prodmuz.com

## Current Setup
- ✅ **Backend:** `api.prodmuz.com` (already configured in Railway)
- ✅ **Frontend:** `muzbeats.pages.dev` (Cloudflare Pages)
- ✅ **Domain:** `prodmuz.com` (purchased, needs configuration)

## Goal
Set up `prodmuz.com` to point to your Cloudflare Pages frontend.

---

## Step 1: Add Custom Domain in Cloudflare Pages

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **muzbeats** project
2. Click **Custom domains** tab
3. Click **Set up a custom domain**
4. Enter: `prodmuz.com`
5. Click **Continue**
6. Cloudflare will automatically configure DNS records

---

## Step 2: Verify DNS Records in Cloudflare

1. Go to **Cloudflare Dashboard** → **prodmuz.com** (your domain)
2. Click **DNS** → **Records**
3. You should see these records (Cloudflare Pages should have created them):
   - **Type:** `CNAME`
   - **Name:** `@` (or blank for root)
   - **Target:** `muzbeats.pages.dev` (or similar Cloudflare Pages domain)
   - **Proxy status:** ☁️ Proxied (orange cloud)

4. If you want `www.prodmuz.com` too:
   - Add another **CNAME** record:
   - **Name:** `www`
   - **Target:** `muzbeats.pages.dev` (same as above)
   - **Proxy status:** ☁️ Proxied

---

## Step 3: Update Environment Variables

### Frontend (Cloudflare Pages)

1. Go to **Cloudflare Pages** → **muzbeats** → **Settings** → **Variables and Secrets**
2. Update `VITE_API_URL` if needed (should still be `https://api.prodmuz.com`)

### Backend (Railway)

No changes needed - `api.prodmuz.com` is already configured.

---

## Step 4: Wait for DNS Propagation

- DNS changes can take 5-60 minutes to propagate
- Cloudflare usually updates within a few minutes
- Check status in Cloudflare Pages → Custom domains tab

---

## Step 5: Test

After DNS propagates:

1. Visit `https://prodmuz.com`
2. Should load your frontend (same as `muzbeats.pages.dev`)
3. API calls should still work (`api.prodmuz.com`)

---

## Optional: Set Up www Subdomain

If you want `www.prodmuz.com` to also work:

1. In Cloudflare Pages → Custom domains, add `www.prodmuz.com`
2. Or manually add CNAME record in DNS:
   - **Name:** `www`
   - **Target:** `muzbeats.pages.dev`
   - **Proxy:** ☁️ Enabled

---

## SSL/TLS

Cloudflare automatically provides SSL certificates for your domain. No manual configuration needed!

---

## Final URLs

After setup:
- **Frontend:** `https://prodmuz.com` (and `https://www.prodmuz.com` if configured)
- **Backend API:** `https://api.prodmuz.com`
- **Old frontend:** `https://muzbeats.pages.dev` (will still work as fallback)

