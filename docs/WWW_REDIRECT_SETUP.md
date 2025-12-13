# Redirect prodmuz.com to www.prodmuz.com

## Why Redirect to www?

✅ **More Professional:** `www.prodmuz.com` looks more established  
✅ **Industry Standard:** Used by YouTube, Google, Facebook, Amazon, etc.  
✅ **Flexible:** Easier to manage subdomains (api, blog, etc.)  
✅ **Cookie Management:** Better cookie handling across subdomains  
✅ **SEO:** Prevents duplicate content issues

**Note:** Both approaches (www or root) are valid. The key is consistency - pick one and redirect the other.  

## Step 1: Remove Existing Redirect (If Any)

**First, check if there's already a redirect:**
1. Go to **Cloudflare Dashboard** → **prodmuz.com** → **Rules**
2. Check **Redirect Rules** and **Page Rules**
3. If you see a rule redirecting `www` to root, **delete it first**

## Step 2: Set Up Redirect from Root to www

### Option A: Using Redirect Rules (Recommended - New Interface)

1. Go to **Cloudflare Dashboard** → **prodmuz.com** → **Rules** → **Redirect Rules**
2. Click **"+ Create rule"**
3. Configure:
   - **Rule name:** `Redirect root to www`
   - **When incoming requests match:**
     - **Field:** `Hostname`
     - **Operator:** `equals`
     - **Value:** `prodmuz.com`
   - **Then:**
     - **Action:** `Dynamic redirect`
     - **Status code:** `301 - Permanent Redirect`
     - **Destination URL:** `https://www.prodmuz.com/$1`
4. Click **Deploy**

### Option B: Using Page Rules (Older Interface)

1. Go to **Cloudflare Dashboard** → **prodmuz.com** → **Rules** → **Page Rules**
2. Click **Create Page Rule**
3. Configure:
   - **URL pattern:** `prodmuz.com/*`
   - **Setting:** **Forwarding URL** (301 Permanent Redirect)
   - **Destination:** `https://www.prodmuz.com/$1`
4. Click **Save and Deploy**

---

## Step 2: Update R2 CORS Policy

**Important:** Make sure `www.prodmuz.com` is in your R2 CORS allowed origins.

1. Go to **R2** → **muzbeats-audio** → **Settings** → **CORS Policy**
2. Edit the policy
3. Ensure **Allowed Origins** includes:
   - `https://www.prodmuz.com` ✅
   - `https://prodmuz.com` (keep for redirect)
   - `https://muzbeats.pages.dev` (keep for fallback)
   - `http://localhost:5173` (keep for local dev)
4. Save

**Note:** CORS needs both `prodmuz.com` and `www.prodmuz.com` because:
- The redirect happens at Cloudflare level
- Browser still sees the original origin during redirect
- Both need to be allowed for smooth operation

---

## Step 3: Test

After setting up redirect:

1. Visit `https://prodmuz.com` → Should redirect to `https://www.prodmuz.com`
2. Visit `https://www.prodmuz.com` → Should load normally
3. Check browser address bar shows `www.prodmuz.com`
4. Test that audio files load (CORS should work)

---

## Alternative: Keep Both (No Redirect)

If you prefer to keep both working:
- `https://prodmuz.com` ✅ Works
- `https://www.prodmuz.com` ✅ Works
- Both in CORS policy ✅

This is also fine, but `www` is more professional.

---

## CORS Impact

**Yes, CORS needs both domains:**
- During redirect, browser may check CORS for original domain
- Best practice: Include both in CORS policy
- No code changes needed - just CORS configuration

