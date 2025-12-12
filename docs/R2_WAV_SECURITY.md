# R2 WAV File Security Options

## Current Situation

You've uploaded both MP3 and WAV files to R2. You want:
- ✅ MP3s: Public (for previews on the website)
- 🔒 WAVs: Private (only for paid downloads)

## Option 1: Public R2 + Path Obfuscation (Current Implementation)

**How it works:**
- Enable public access on R2
- MP3s are served from public URLs (for previews)
- WAVs are only served through download endpoint (token-protected)
- WAV paths are in database (not easily guessable)

**Security level:** Medium
- ✅ WAVs not directly linked anywhere
- ✅ Paths require database access to discover
- ⚠️ If someone guesses a WAV path, they can access it

**Pros:**
- Simple setup
- No additional code needed
- Works immediately

**Cons:**
- WAVs technically accessible if path is known
- Not perfect security

---

## Option 2: Signed URLs (More Secure)

**How it works:**
- Keep R2 public for MP3s
- Generate time-limited signed URLs for WAV downloads
- URLs expire after a few minutes
- Requires R2 SDK

**Security level:** High
- ✅ WAVs only accessible with valid signed URL
- ✅ URLs expire automatically
- ✅ Even if URL is leaked, it expires quickly

**Pros:**
- Strong security
- Industry standard approach
- WAVs truly protected

**Cons:**
- More complex code
- Requires R2 SDK installation
- Slightly slower (generates URL on-demand)

---

## Option 3: Two Buckets (Most Secure)

**How it works:**
- Public bucket: MP3s only
- Private bucket: WAVs only
- Download endpoint fetches WAVs from private bucket using credentials

**Security level:** Very High
- ✅ WAVs completely inaccessible without credentials
- ✅ Clear separation

**Cons:**
- More complex setup
- Two buckets to manage
- Requires R2 SDK

---

## Recommendation

**For now:** Use Option 1 (current implementation)
- Good enough for most use cases
- Simple and works immediately
- WAV paths aren't easily discoverable

**If you need stronger security:** Implement Option 2 (signed URLs)
- Better protection
- Still relatively simple
- Industry standard

---

## Current Code Behavior

The code is already set up to:
- ✅ Serve MP3s from R2 public URLs (for previews)
- ✅ Serve WAVs through download endpoint only (token-protected)
- ✅ Never generate public URLs for WAVs

**What this means:**
- MP3s: Publicly accessible (intended for previews)
- WAVs: Only accessible through `/api/downloads/:token` endpoint
- WAV paths are in database, not easily guessable

**You can safely enable public access** - WAVs won't be directly linked, but they're technically accessible if someone knows the exact path.

