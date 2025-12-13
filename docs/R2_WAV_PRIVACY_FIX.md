# Protecting WAV Files When Using a Public R2 Bucket

## The Concern
You're correct: the `pub-xxxx.r2.dev` part is the same for every object in your public bucket.  
If WAV files are stored in the **same public bucket**, anyone who knows (or can guess) a WAV path can download it directly.

**Key point:** the `pub-xxxx` value is not a secret/credential. It’s just the public hostname for the bucket.

## What Actually Protects WAVs
Not “hiding the URL” — you need **access control**:
- **Public bucket:** MP3 previews + cover images (OK to be public)
- **Private bucket:** WAV masters (must not be publicly readable)
- WAV downloads should go through **your backend** using a token, which fetches the WAV from the **private** bucket.

## Recommended Setup (Best)

### 1) Create a private bucket for WAVs
Create a new bucket in Cloudflare R2, e.g.:
- `muzbeats-wav-private`

In that bucket:
- **Public Access:** **Disabled**

### 2) Upload WAVs to the private bucket
Keep the same key structure:
- `beats/wav/...`

Using AWS CLI (recommended):

```bash
aws s3 sync server/public/assets/beats/wav/ \
  s3://muzbeats-wav-private/beats/wav/ \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

### 3) Remove WAVs from the public bucket
If WAVs are currently in the public bucket, delete them there:

```bash
aws s3 rm s3://muzbeats-audio/beats/wav/ \
  --recursive \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

### 4) Configure backend env vars (Railway + local)
Add these to your backend service:

```env
# Public serving (already used)
R2_PUBLIC_URL=https://pub-XXXX.r2.dev

# Private WAV fetch (required to keep WAV private)
R2_PRIVATE_BUCKET_NAME=muzbeats-wav-private
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

### 5) How the code behaves now
With the above env vars:
- **MP3s**: served from public R2 URL (fast + cheap)
- **WAVs**: checked in private bucket; if they exist, they’re streamed via `/api/downloads/:token`
- WAVs are no longer retrievable by guessing URLs on the public bucket

## Logo Safety
It’s fine to serve the email logo from the public bucket. The logo being public does **not** grant access to other objects.
The real risk was WAVs being in the same public bucket.

## Verify
After moving WAVs:
- ✅ `https://pub-XXXX.r2.dev/images/skimask.png` should work
- ✅ `https://pub-XXXX.r2.dev/beats/mp3/...mp3` should work
- ❌ `https://pub-XXXX.r2.dev/beats/wav/...wav` should be **404/denied** (because WAVs are no longer in the public bucket)


