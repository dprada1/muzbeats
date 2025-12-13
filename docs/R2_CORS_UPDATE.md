# Update R2 CORS for prodmuz.com

## Problem
CORS errors on `prodmuz.com` because R2 CORS policy only allows `muzbeats.pages.dev`.

## Solution: Add prodmuz.com to CORS Policy

### Step 1: Go to R2 CORS Settings

1. Go to **Cloudflare Dashboard** → **R2** → **muzbeats-audio** bucket
2. Click **Settings** tab
3. Scroll to **CORS Policy** section
4. Click **Edit** (or the existing CORS policy)

### Step 2: Update Allowed Origins

**Add these origins:**
- `https://muzbeats.pages.dev` (keep this)
- `https://prodmuz.com` (add this)
- `https://www.prodmuz.com` (add this if you set up www)
- `http://localhost:5173` (keep for local dev)

**Final list should be:**
```
https://muzbeats.pages.dev
https://prodmuz.com
https://www.prodmuz.com
http://localhost:5173
```

### Step 3: Keep Other Settings

- **Allowed Methods:** `GET`, `HEAD`
- **Allowed Headers:** `*`
- **Expose Headers:** `ETag`, `Content-Length`, `Content-Type`
- **Max Age:** `3600`

### Step 4: Save

Click **Save** or **Update CORS Policy**

### Step 5: Test

After saving, refresh `https://prodmuz.com` - CORS errors should be gone!

---

## Alternative: JSON Configuration

If using JSON editor, use this:

```json
[
  {
    "AllowedOrigins": [
      "https://muzbeats.pages.dev",
      "https://prodmuz.com",
      "https://www.prodmuz.com",
      "http://localhost:5173"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

