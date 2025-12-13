# Custom Email Setup for MuzBeats

## Current Status
Currently using Resend's test domain: `onboarding@resend.dev`

## Goal
Use your custom domain: `noreply@prodmuz.com` (or similar)

---

## Step 1: Add Domain to Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **"+ Add Domain"**
3. Enter your domain: `prodmuz.com`
4. Click **"Add Domain"**

---

## Step 2: Verify Domain in Resend

Resend will provide DNS records to add to Cloudflare:

### DNS Records to Add in Cloudflare

1. **Go to Cloudflare Dashboard** → **DNS** → **Records**
2. **Add these records** (Resend will show you the exact values):

   **SPF Record (TXT):**
   ```
   Type: TXT
   Name: @
   Content: v=spf1 include:_spf.resend.com ~all
   TTL: Auto
   ```

   **DKIM Record (TXT):**
   ```
   Type: TXT
   Name: resend._domainkey
   Content: (Resend will provide this)
   TTL: Auto
   ```

   **DMARC Record (TXT) - Optional but recommended:**
   ```
   Type: TXT
   Name: _dmarc
   Content: v=DMARC1; p=none;
   TTL: Auto
   ```

3. **Wait for verification** (usually 5-60 minutes)
4. **Check Resend dashboard** - domain should show as "Verified" ✅

---

## Step 3: Update Environment Variables

**In `server/.env`:**

```env
RESEND_FROM_EMAIL=MuzBeats <noreply@prodmuz.com>
```

**Or if you prefer a different address:**

```env
RESEND_FROM_EMAIL=MuzBeats <support@prodmuz.com>
```

**In Railway (Production):**

1. Go to Railway Dashboard → Your backend service
2. Click **Variables** tab
3. Update `RESEND_FROM_EMAIL` to: `MuzBeats <noreply@prodmuz.com>`
4. Redeploy (or it will auto-redeploy)

---

## Step 4: Test

After updating, make a test purchase and verify:
- ✅ Email comes from `noreply@prodmuz.com` (or your chosen address)
- ✅ Email is not marked as spam
- ✅ Logo loads correctly
- ✅ Download links work

---

## Troubleshooting

### Domain Not Verifying

- **Check DNS propagation:** Use [dnschecker.org](https://dnschecker.org) to verify records are propagated
- **Wait longer:** DNS can take up to 48 hours (usually much faster)
- **Check Cloudflare proxy:** Make sure DNS records are set to "DNS only" (gray cloud), not "Proxied" (orange cloud)

### Emails Going to Spam

- **Add DMARC record** (see Step 2)
- **Use a subdomain:** Consider `mail.prodmuz.com` or `noreply.prodmuz.com` instead of root domain
- **Warm up the domain:** Send a few test emails first

### Logo Not Loading

- **Ensure logo is publicly accessible:** The logo URL must be accessible from the internet
- **Use absolute URL:** Make sure `BACKEND_URL` or `FRONTEND_URL` is set correctly
- **Check CORS:** If logo is on R2, ensure CORS allows email clients

---

## Email Address Options

Common choices:
- `noreply@prodmuz.com` - Standard, no replies expected
- `support@prodmuz.com` - If you want customers to reply
- `hello@prodmuz.com` - Friendly, casual
- `orders@prodmuz.com` - Specific to orders

**Recommendation:** Use `noreply@prodmuz.com` for automated emails (purchase confirmations), and set up `support@prodmuz.com` separately for customer service.

