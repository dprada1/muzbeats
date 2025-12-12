# Domain Purchase & Security Setup Guide

## 🎯 Recommended: Cloudflare

**Why Cloudflare:**
- ✅ Domains at cost (no markup) - typically $8-12/year for .com
- ✅ Free SSL/TLS certificates (automatic)
- ✅ Free DDoS protection
- ✅ Free privacy protection (WHOIS privacy)
- ✅ Easy DNS management
- ✅ Simple email verification setup (SPF/DKIM for Resend)
- ✅ Fast DNS resolution
- ✅ Great for production apps

**Alternative:** Namecheap (good prices, privacy protection, easy to use)

---

## 📋 Step-by-Step Setup

### Step 1: Purchase Domain from Cloudflare

1. **Create Cloudflare Account**
   - Go to [cloudflare.com](https://cloudflare.com)
   - Sign up for a free account
   - No credit card required for basic services

2. **Register Domain**
   - In Cloudflare dashboard, go to **Domain Registration**
   - Search for `prodmuz.com`
   - Add to cart and complete purchase
   - **Cost:** ~$8-12/year for .com domains

3. **Domain Will Auto-Configure**
   - Cloudflare automatically sets up DNS
   - Privacy protection is included (free)
   - SSL/TLS will be enabled automatically when you add the site

---

### Step 2: Add Your Site to Cloudflare

1. **Add Site**
   - In Cloudflare dashboard, click **Add a Site**
   - Enter `prodmuz.com`
   - Choose **Free** plan (includes SSL, DDoS protection)

2. **Update Nameservers** (if needed)
   - Cloudflare will provide nameservers (e.g., `alice.ns.cloudflare.com`)
   - If you registered elsewhere, update nameservers at your registrar
   - If registered at Cloudflare, this is automatic

---

### Step 3: Configure DNS Records

Once your domain is in Cloudflare, add these DNS records:

#### For Your Application (when you deploy):

```
Type    Name    Content              Proxy
A       @       YOUR_SERVER_IP       ☁️ (Proxied)
A       www     YOUR_SERVER_IP       ☁️ (Proxied)
```

**Note:** Replace `YOUR_SERVER_IP` with your actual server IP address when you deploy.

#### For Email (Resend) - Add these records:

1. **Go to Resend Dashboard**
   - Navigate to **Domains** → **Add Domain**
   - Enter `prodmuz.com`
   - Resend will provide DNS records to add

2. **Add DNS Records in Cloudflare:**
   - Go to **DNS** → **Records** in Cloudflare
   - Add the records Resend provides (typically):
     ```
     Type: TXT
     Name: @
     Content: (SPF record from Resend)
     
     Type: TXT
     Name: _resend
     Content: (verification code from Resend)
     
     Type: CNAME
     Name: (subdomain from Resend)
     Content: (Resend's CNAME target)
     ```

3. **Wait for Verification**
   - DNS propagation can take 5-60 minutes
   - Check Resend dashboard for verification status
   - Once verified, you can use `noreply@prodmuz.com` in emails

---

### Step 4: SSL/TLS Configuration

**Cloudflare automatically provides SSL:**
- ✅ Free SSL certificates (Let's Encrypt)
- ✅ Automatic renewal
- ✅ HTTPS redirect enabled by default
- ✅ Modern TLS settings

**To enable:**
1. Go to **SSL/TLS** in Cloudflare dashboard
2. Set encryption mode to **Full (strict)** (recommended)
3. Enable **Always Use HTTPS** (redirects HTTP → HTTPS)
4. Enable **Automatic HTTPS Rewrites**

**SSL Modes:**
- **Off:** No encryption (don't use)
- **Flexible:** Encrypts traffic between visitor and Cloudflare (not recommended)
- **Full:** Encrypts end-to-end, but doesn't verify origin certificate
- **Full (strict):** Encrypts end-to-end and verifies origin certificate ✅ **Use this**

---

### Step 5: Security Settings

#### Enable Security Features in Cloudflare:

1. **Firewall Rules**
   - Go to **Security** → **WAF** (Web Application Firewall)
   - Free plan includes basic protection
   - Enable **Managed Rulesets** for common attacks

2. **Rate Limiting** (optional, paid feature)
   - Protects against brute force attacks
   - Can set up basic rules on free plan

3. **Bot Fight Mode** (free)
   - Go to **Security** → **Bots**
   - Enable **Bot Fight Mode** to block known bad bots

4. **DNSSEC** (optional but recommended)
   - Go to **DNS** → **Settings**
   - Enable **DNSSEC**
   - Adds cryptographic signing to DNS records

5. **Privacy Settings**
   - WHOIS privacy is **automatically enabled** (free)
   - Your personal info is hidden from public WHOIS

---

### Step 6: Update Environment Variables

Once your domain is set up, update your `.env` files:

**`server/.env` (Production):**
```bash
# Domain & URLs
FRONTEND_URL=https://prodmuz.com
BACKEND_URL=https://prodmuz.com  # If backend is on same domain
# Or separate backend:
# BACKEND_URL=https://api.prodmuz.com

# Email (after Resend domain verification)
RESEND_FROM_EMAIL=MuzBeats <noreply@prodmuz.com>
RESEND_API_KEY=re_your_api_key_here
```

**`client/.env` (if needed):**
```bash
VITE_API_URL=https://prodmuz.com/api
# Or if separate backend:
# VITE_API_URL=https://api.prodmuz.com
```

---

## 🔒 Security Checklist

After setup, verify:

- [ ] Domain registered and nameservers configured
- [ ] SSL/TLS set to **Full (strict)**
- [ ] **Always Use HTTPS** enabled
- [ ] DNS records configured (A records for site, TXT/CNAME for email)
- [ ] Resend domain verified (if using custom email)
- [ ] Firewall/WAF rules enabled
- [ ] Bot Fight Mode enabled (optional)
- [ ] DNSSEC enabled (optional)
- [ ] Environment variables updated with production URLs
- [ ] Test HTTPS access to your domain
- [ ] Test email sending with custom domain

---

## 🚀 Next Steps After Domain Setup

1. **Deploy Your Application**
   - Point DNS A records to your server IP
   - Update environment variables
   - Test HTTPS access

2. **Verify Email Domain in Resend**
   - Add domain in Resend dashboard
   - Add DNS records in Cloudflare
   - Wait for verification
   - Update `RESEND_FROM_EMAIL` in `.env`

3. **Test Everything**
   - Visit `https://prodmuz.com` (should load with SSL)
   - Make a test purchase
   - Verify email is sent from `noreply@prodmuz.com`
   - Check download links work

---

## 💰 Cost Breakdown

**Cloudflare (Recommended):**
- Domain registration: ~$8-12/year (.com)
- SSL/TLS: **Free**
- DDoS protection: **Free**
- Privacy protection: **Free**
- DNS: **Free**
- **Total: ~$8-12/year**

**Alternative (Namecheap):**
- Domain registration: ~$10-15/year (.com)
- Privacy protection: ~$3-5/year (often included)
- SSL: Usually provided by hosting/CDN
- **Total: ~$10-15/year**

---

## 🆘 Troubleshooting

### SSL Not Working
- Check SSL mode is set to **Full (strict)**
- Verify DNS A records point to correct IP
- Wait 5-10 minutes for SSL to provision
- Check **SSL/TLS** → **Edge Certificates** in Cloudflare

### Email Not Sending
- Verify Resend domain is verified
- Check DNS records are correct (SPF, DKIM)
- Wait for DNS propagation (can take up to 24 hours)
- Check Resend dashboard for errors

### DNS Not Resolving
- Verify nameservers are correct
- Check DNS records are added correctly
- Wait for DNS propagation (5-60 minutes)
- Use `dig prodmuz.com` or `nslookup prodmuz.com` to test

---

## 📚 Additional Resources

- [Cloudflare Domain Registration](https://www.cloudflare.com/products/registrar/)
- [Cloudflare SSL/TLS Guide](https://developers.cloudflare.com/ssl/)
- [Resend Domain Verification](https://resend.com/docs/dashboard/domains/introduction)
- [DNS Propagation Checker](https://www.whatsmydns.net/)

