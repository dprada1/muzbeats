# Fix CORS for Local Development (localhost:5173)

## Problem
Audio files from R2 are blocked in local development with this error:
```
Access to fetch at 'https://pub-xxxxx.r2.dev/...' from origin 'http://localhost:5173' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.
```

## Solution: Add localhost:5173 to R2 CORS Policy

### Step 1: Go to R2 CORS Settings

1. Go to **Cloudflare Dashboard** → **R2** → **muzbeats-audio** bucket
2. Click **Settings** tab
3. Scroll to **CORS Policy** section
4. Click **Edit** (or the existing CORS policy)

### Step 2: Add localhost:5173 to Allowed Origins

**Your CORS policy should include ALL of these origins:**

```
https://muzbeats.pages.dev
https://prodmuz.com
https://www.prodmuz.com
http://localhost:5173
```

**Important:** Make sure `http://localhost:5173` is in the list!

### Step 3: Verify Other Settings

- **Allowed Methods:** `GET`, `HEAD`
- **Allowed Headers:** `*`
- **Expose Headers:** `ETag`, `Content-Length`, `Content-Type`
- **Max Age:** `3600`

### Step 4: Save

Click **Save** or **Update CORS Policy**

### Step 5: Test

1. Refresh your browser at `http://localhost:5173`
2. Check the browser console - CORS errors should be gone
3. Audio files should now load properly

---

## Complete JSON Configuration (if using JSON editor)

If you're editing the CORS policy as JSON, use this:

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

---

## Why This Happens

- **R2 blocks cross-origin requests by default** for security
- Your local dev server runs on `http://localhost:5173` (HTTP, not HTTPS)
- R2 needs to explicitly allow this origin in the CORS policy
- **This is safe** - `localhost` is only accessible on your local machine

---

## After Fixing

Once you add `http://localhost:5173` to the CORS policy:
- ✅ Local development will work
- ✅ Production (HTTPS) will continue to work
- ✅ No security risk (localhost is local-only)

