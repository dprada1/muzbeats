# Why R2 CORS Affects Local Development

## The Question
"Why does Cloudflare R2 impact local development? I thought running locally should work regardless."

## The Answer

Even though your **server** and **client** run locally, the **audio files** are hosted on **Cloudflare R2** (a different origin). This creates a cross-origin request that requires CORS configuration.

### The Flow

1. **Local Frontend** (`http://localhost:5173`) loads the page
2. **Local Backend** (`http://localhost:3000`) serves the API
3. **Backend returns R2 URLs** for audio files (e.g., `https://pub-xxxxx.r2.dev/beats/mp3/...`)
4. **Frontend tries to fetch** audio directly from R2
5. **Browser blocks the request** because:
   - Origin: `http://localhost:5173` (your local frontend)
   - Target: `https://pub-xxxxx.r2.dev` (Cloudflare R2)
   - These are **different origins** (different protocol + domain)

### Why This Happens

The code in `server/src/services/beatsService.ts` transforms audio paths to R2 URLs when `R2_PUBLIC_URL` is set:

```typescript
// server/src/services/beatsService.ts
function mapDbRowToBeat(row: any): Beat {
    return {
        // ...
        audio: getR2Url(row.audio_path), // ← Returns R2 URL if R2_PUBLIC_URL is set
        // ...
    };
}
```

```typescript
// server/src/utils/r2.ts
export function getR2Url(assetPath: string): string {
    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    
    // If R2 is configured, return R2 URL (even in local dev!)
    if (r2PublicUrl) {
        return `${r2PublicUrl}/${r2Path}`;
    }
    
    // Otherwise, return local path
    return assetPath;
}
```

### Solutions

**Option 1: Add localhost to R2 CORS (Current Solution)**
- ✅ Works for both local and production
- ✅ Uses R2's CDN benefits even in development
- ✅ Requires CORS configuration

**Option 2: Don't Set R2_PUBLIC_URL Locally**
- ✅ No CORS issues
- ❌ Audio files must be in `server/public/assets/`
- ❌ No CDN benefits in development
- ❌ Different behavior between dev and production

**Option 3: Use Local Proxy for R2**
- ✅ No CORS issues
- ✅ Can use R2 in development
- ❌ More complex setup
- ❌ Requires proxy server

### Recommended Approach

**Use Option 1** (add localhost to R2 CORS):
- Simple and consistent
- Same behavior in dev and production
- One-time configuration
- No code changes needed

---

## Summary

**R2 affects local development because:**
1. Your backend returns R2 URLs (not local paths) when `R2_PUBLIC_URL` is set
2. Your frontend fetches audio directly from R2 (cross-origin request)
3. Browsers block cross-origin requests unless CORS allows it
4. R2 blocks cross-origin requests by default

**The fix:** Add `http://localhost:5173` to R2's CORS policy ✅

