# Cloudflare R2 Setup Guide

## Step 1: Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** (in the left sidebar, under "Storage")
3. Click **Create bucket**
4. Bucket name: `muzbeats-audio`
5. Location: Choose closest to your users (or default)
6. Click **Create bucket**

## Step 2: Get R2 Credentials (For Uploading Files)

**Note:** You only need these if uploading via AWS CLI. For just serving files, skip to Step 3.

1. In R2 dashboard, click **"Manage"** next to **"API Tokens"**
2. Click **"Create API Token"**
3. Permissions: **Object Read & Write**
4. Bucket: `muzbeats-audio`
5. Click **Create API Token**
6. **Save these credentials (shown only once!):**
   - **Access Key ID** (e.g., `abc123def456...`)
   - **Secret Access Key** (e.g., `xyz789...`)
   - **Account ID** (visible in dashboard: `a9eba83c23486e01c5a44f9ff5fd...`)
   - **S3 API Endpoint** (visible in dashboard: `https://a9eba83c23486e01c5a44f9ff...r2.cloudflarestorage.com`)

## Step 3: Make Bucket Public (for direct access)

1. Go to your bucket → **Settings**
2. Enable **Public Access**
3. Set **Custom Domain** (optional): `audio.prodmuz.com` or use R2.dev domain

## Step 4: Upload Files

### Option A: Using AWS CLI (Recommended)

```bash
# Install AWS CLI if not already installed
# macOS: brew install awscli
# Or download from: https://aws.amazon.com/cli/

# Configure AWS CLI for R2
aws configure set aws_access_key_id YOUR_ACCESS_KEY_ID
aws configure set aws_secret_access_key YOUR_SECRET_ACCESS_KEY

# Upload files (use your S3 API endpoint from dashboard)
aws s3 sync server/public/assets/beats/ \
  s3://muzbeats-audio/beats/ \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com

# Replace YOUR_ACCOUNT_ID with your actual Account ID
# The full endpoint URL is shown in your R2 dashboard under "S3 API"

# This will upload:
# - mp3/ folder
# - wav/ folder
# - All subdirectories
```

### Option B: Using Cloudflare Dashboard

1. Go to your bucket
2. Click **Upload**
3. Drag and drop `mp3/` and `wav/` folders
4. Wait for upload to complete (may take a while for 2.3GB)

## Step 5: Get Public URL (This is what you need for Railway!)

1. Click on your bucket: `muzbeats-audio`
2. Go to **Settings** tab
3. Scroll to **Public Access** section
4. Enable **Public Access** (toggle on)
5. You'll see your **R2.dev public URL** (e.g., `https://pub-xxxxx.r2.dev`)
   - **This is the URL you need for the `R2_PUBLIC_URL` environment variable!**
6. (Optional) Set up **Custom Domain** if you want `audio.prodmuz.com`

**Important:** After uploading files, they'll be accessible at:
- **R2.dev domain:** `https://pub-xxxxx.r2.dev/beats/mp3/filename.mp3`
- **Custom domain:** `https://audio.prodmuz.com/beats/mp3/filename.mp3` (if configured)

## Step 6: Update Environment Variables

**Add to Railway backend service:**

**Required (for serving files):**
- `R2_PUBLIC_URL` = Your R2 public URL from Step 5 (e.g., `https://pub-xxxxx.r2.dev`)

**Optional (only needed if uploading files programmatically):**
- `R2_ACCOUNT_ID` = Your R2 Account ID (from dashboard)
- `R2_ACCESS_KEY_ID` = Your Access Key ID (from API token)
- `R2_SECRET_ACCESS_KEY` = Your Secret Access Key (from API token)
- `R2_BUCKET_NAME` = `muzbeats-audio`

**Note:** For just serving files, you only need `R2_PUBLIC_URL`!

## Step 7: Update Code

The code will be updated to:
1. Serve files from R2 instead of local filesystem
2. Update database paths to use R2 URLs
3. Update frontend to use R2 URLs directly

---

## Cost Estimate

- **Storage:** 2.3GB × $0.015/GB = $0.0345/month
- **Egress:** $0 (unlimited!)
- **Requests:** ~$0.01/month
- **Total:** ~$0.05/month

---

## Security Notes

- Keep R2 credentials secure (use environment variables)
- Consider using signed URLs for downloads (optional)
- Public bucket is fine for audio files (they're meant to be downloaded)

