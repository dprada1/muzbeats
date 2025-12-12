# Deployment Guide - Step by Step

**Last Updated:** December 2025

## 🎯 Overview

You've bought the domain! Now we need to:
1. Set up Cloudflare DNS (for domain management)
2. Deploy backend (Node.js server)
3. Deploy frontend (React app)
4. Point DNS to your servers

**Important:** Cloudflare doesn't host Node.js apps. We'll use it for DNS/SSL, but deploy elsewhere.

---

## Step 1: Set Up Cloudflare DNS (30 minutes)

### 1.1 Add Domain to Cloudflare

1. **Log in to Cloudflare**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Click **Add a Site**
   - Enter `prodmuz.com`
   - Choose **Free** plan (includes SSL, DDoS protection)

2. **Update Nameservers** (if you bought domain elsewhere)
   - Cloudflare will show you nameservers (e.g., `alice.ns.cloudflare.com`)
   - Go to your domain registrar
   - Update nameservers to Cloudflare's
   - Wait 5-60 minutes for propagation

3. **Verify DNS Settings**
   - In Cloudflare dashboard, go to **DNS** → **Records**
   - You should see some default records
   - We'll add A records after deploying

---

## Step 2: Choose Hosting Provider

### Option A: Railway (Recommended - Easiest) ⭐

**Why Railway:**
- ✅ Easy PostgreSQL setup
- ✅ Automatic SSL
- ✅ Free tier ($5 credit/month)
- ✅ Simple deployment
- ✅ Environment variables UI

**Cost:** Free tier or ~$5-10/month

### Option B: Render

**Why Render:**
- ✅ Free tier available
- ✅ PostgreSQL included
- ✅ Automatic SSL
- ✅ Easy deployment

**Cost:** Free tier or ~$7/month

### Option C: DigitalOcean Droplet

**Why DigitalOcean:**
- ✅ Full control
- ✅ $6/month droplet
- ✅ Can host both frontend/backend
- ⚠️ More setup required

**Cost:** ~$6-12/month

**My Recommendation:** Start with **Railway** - it's the easiest.

---

## Step 3: Deploy Backend (Railway)

### 3.1 Set Up Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project

### 3.2 Deploy Backend

1. **Connect Repository**
   - Click **New Project** → **Deploy from GitHub repo**
   - Select your `muzbeats` repository
   - Choose `server` folder as root

2. **Add PostgreSQL Database**
   - Click **+ New** → **Database** → **Add PostgreSQL**
   - Railway will create database automatically
   - Copy the connection string (we'll use it in env vars)

3. **Set Environment Variables**
   - Go to your service → **Variables** tab
   - Add these variables:

```bash
NODE_ENV=production
PORT=3000

# Database (Railway provides this automatically)
DATABASE_URL=<Railway PostgreSQL connection string>

# Stripe (use production keys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=MuzBeats <noreply@prodmuz.com>

# URLs
BACKEND_URL=https://api.prodmuz.com
FRONTEND_URL=https://prodmuz.com
```

4. **Configure Build Settings**
   - Railway should auto-detect Node.js
   - Build command: `npm install`
   - Start command: `npm start` (or `node dist/index.js` if using build)

5. **Deploy**
   - Railway will automatically deploy
   - Wait for deployment to complete
   - Copy the generated URL (e.g., `https://your-app.up.railway.app`)

### 3.3 Set Up Custom Domain (Backend)

1. **In Railway:**
   - Go to your service → **Settings** → **Domains**
   - Click **Generate Domain**
   - Add custom domain: `api.prodmuz.com`
   - Railway will give you a CNAME to add to Cloudflare

2. **In Cloudflare:**
   - Go to **DNS** → **Records**
   - Add CNAME record:
     - **Name:** `api`
     - **Target:** `<Railway-provided-domain>`
     - **Proxy status:** ☁️ Proxied (orange cloud)
   - Save

3. **Wait for SSL**
   - Railway will automatically provision SSL
   - Takes 5-10 minutes
   - Check Railway dashboard for status

---

## Step 4: Deploy Frontend (Vercel - Recommended)

### 4.1 Set Up Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import your repository

### 4.2 Deploy Frontend

1. **Import Project**
   - Click **Add New** → **Project**
   - Select your `muzbeats` repository
   - **Root Directory:** `client`
   - Framework: **Vite** (auto-detected)

2. **Set Environment Variables**
   - Go to **Settings** → **Environment Variables**
   - Add:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_API_URL=https://api.prodmuz.com
```

3. **Configure Build**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`

4. **Deploy**
   - Click **Deploy**
   - Wait for deployment
   - You'll get a URL like `https://muzbeats.vercel.app`

### 4.3 Set Up Custom Domain (Frontend)

1. **In Vercel:**
   - Go to your project → **Settings** → **Domains**
   - Add domain: `prodmuz.com`
   - Add domain: `www.prodmuz.com`
   - Vercel will show DNS records to add

2. **In Cloudflare:**
   - Go to **DNS** → **Records**
   - Add A record (for root domain):
     - **Name:** `@`
     - **IPv4 address:** `76.76.21.21` (Vercel's IP - check Vercel dashboard)
     - **Proxy status:** ☁️ Proxied
   - Add CNAME record (for www):
     - **Name:** `www`
     - **Target:** `cname.vercel-dns.com`
     - **Proxy status:** ☁️ Proxied

3. **Wait for SSL**
   - Vercel automatically provisions SSL
   - Takes 5-10 minutes

---

## Step 5: Configure Stripe Webhook

### 5.1 Get Webhook URL

Your webhook URL will be:
```
https://api.prodmuz.com/api/webhooks/stripe
```

### 5.2 Add Webhook in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Developers** → **Webhooks**
3. Click **Add endpoint**
4. **Endpoint URL:** `https://api.prodmuz.com/api/webhooks/stripe`
5. **Events to send:** Select:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
6. Click **Add endpoint**
7. **Copy the Signing secret** (starts with `whsec_`)
8. Add to Railway environment variables: `STRIPE_WEBHOOK_SECRET`

### 5.3 Update Webhook Handler

Make sure your webhook handler verifies signatures (see `docs/SECURITY_AUDIT_GUIDE.md`).

---

## Step 6: Run Database Migrations

### 6.1 Connect to Railway Database

1. In Railway, go to your PostgreSQL database
2. Copy the connection string
3. Use a PostgreSQL client (pgAdmin, DBeaver, or `psql` CLI)

### 6.2 Run Schema

1. **Option A: Use Railway's PostgreSQL**
   - Railway provides a web SQL editor
   - Copy contents of `server/src/db/schema.sql`
   - Run in Railway's SQL editor

2. **Option B: Use psql CLI**
   ```bash
   psql <Railway-connection-string> < server/src/db/schema.sql
   ```

3. **Option C: Use Migration Script**
   ```bash
   cd server
   npx tsx src/db/setup-table.ts
   ```

### 6.3 Migrate Beats Data

If you need to migrate beats from JSON:
```bash
cd server
npx tsx src/db/migrate-json-to-db.ts
```

---

## Step 7: Test Everything

### 7.1 Test Backend

```bash
# Health check
curl https://api.prodmuz.com/health

# Should return: {"status":"ok","message":"Server is running"}
```

### 7.2 Test Frontend

1. Visit `https://prodmuz.com`
2. Should load your app
3. Check browser console for errors

### 7.3 Test Payment Flow

1. Add beat to cart
2. Go to checkout
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete payment
5. Verify:
   - ✅ Payment succeeds
   - ✅ Email received
   - ✅ Download link works

### 7.4 Test Webhook

1. Make a test payment
2. Check Stripe dashboard → **Webhooks** → **Recent events**
3. Should show `payment_intent.succeeded` event
4. Check Railway logs for webhook processing

---

## Step 8: Final Cloudflare Configuration

### 8.1 SSL/TLS Settings

1. In Cloudflare, go to **SSL/TLS**
2. Set encryption mode to **Full (strict)**
3. Enable **Always Use HTTPS**
4. Enable **Automatic HTTPS Rewrites**

### 8.2 Security Settings

1. **Security** → **WAF**
   - Enable **Managed Rulesets** (free tier)

2. **Security** → **Bots**
   - Enable **Bot Fight Mode** (free)

3. **DNS** → **Settings**
   - Enable **DNSSEC** (optional but recommended)

---

## 🎯 Quick Checklist

- [ ] Domain added to Cloudflare
- [ ] Nameservers updated (if needed)
- [ ] Backend deployed on Railway
- [ ] PostgreSQL database created
- [ ] Environment variables set in Railway
- [ ] Custom domain `api.prodmuz.com` configured
- [ ] Frontend deployed on Vercel
- [ ] Custom domain `prodmuz.com` configured
- [ ] Database migrations run
- [ ] Stripe webhook configured
- [ ] Webhook signing secret added to env vars
- [ ] SSL certificates active (check padlock in browser)
- [ ] Test payment successful
- [ ] Test email received
- [ ] Test download link works
- [ ] Cloudflare SSL set to "Full (strict)"

---

## 🚨 Common Issues

### Issue: "Domain not resolving"

**Solution:**
- Wait 24-48 hours for DNS propagation
- Check DNS records in Cloudflare
- Verify nameservers are correct

### Issue: "SSL certificate not working"

**Solution:**
- Wait 5-10 minutes after adding domain
- Check Railway/Vercel dashboard for SSL status
- Verify DNS records are correct
- Try accessing `https://` directly

### Issue: "Webhook not receiving events"

**Solution:**
- Verify webhook URL is correct
- Check Stripe dashboard for webhook status
- Verify `STRIPE_WEBHOOK_SECRET` is set
- Check Railway logs for errors

### Issue: "Database connection failed"

**Solution:**
- Verify `DATABASE_URL` is set correctly
- Check Railway database is running
- Verify connection string format
- Check Railway logs for errors

---

## 📚 Next Steps

After deployment:
1. Monitor logs for errors
2. Set up error tracking (Sentry, etc.)
3. Set up monitoring (UptimeRobot, etc.)
4. Configure backups for database
5. Review `docs/SECURITY_AUDIT_GUIDE.md` for security hardening

---

## 💰 Cost Summary

**Monthly Costs:**
- Domain: $0 (already paid ~$10/year)
- Railway: Free tier or ~$5-10/month
- Vercel: Free tier (generous limits)
- Cloudflare: Free tier
- Resend: Free tier (3,000 emails/month)
- Stripe: 2.9% + $0.30 per transaction

**Total:** ~$0-10/month (or free on free tiers)

---

**You're almost there!** 🚀

