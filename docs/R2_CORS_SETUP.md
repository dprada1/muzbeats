# R2 CORS Configuration

## Problem
R2 buckets block cross-origin requests by default. You need to configure CORS to allow your frontend to access audio files.

## Solution: Configure CORS in R2

### Step 1: Go to R2 Bucket Settings

1. Go to Cloudflare Dashboard → R2 → Your bucket (`muzbeats-audio`)
2. Click **Settings** tab
3. Scroll to **CORS Policy** section
4. Click **"+ Add"** button

### Step 2: Add CORS Policy

**Configuration:**

```json
[
  {
    "AllowedOrigins": [
      "https://muzbeats.pages.dev",
      "https://prodmuz.com",
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

**Or use the UI:**
1. **Allowed Origins:** Add:
   - `https://muzbeats.pages.dev`
   - `https://prodmuz.com` (if you add custom domain)
   - `http://localhost:5173` (for local development)
2. **Allowed Methods:** Select `GET` and `HEAD`
3. **Allowed Headers:** `*` (all headers)
4. **Expose Headers:** `ETag`, `Content-Length`, `Content-Type`
5. **Max Age:** `3600` (1 hour)

### Step 3: Save

Click **Save** or **Add CORS Policy**

### Step 4: Test

After saving, refresh your website. The CORS errors should be gone and audio files should load.

---

## Alternative: Allow All Origins (Less Secure, but Simple)

If you want to allow all origins (for testing or if you have multiple domains):

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

**Note:** `*` allows any origin. Use specific origins for production.

