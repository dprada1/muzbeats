# Upload Cover Images to R2

## Problem
Cover images aren't showing because they weren't uploaded to R2. We only uploaded the `beats/` folder, but images are in the `images/` folder.

## Solution: Upload Images Folder

Run this command (replace `YOUR_ACCOUNT_ID` with your actual Account ID from Cloudflare R2 dashboard):

```bash
aws s3 sync server/public/assets/images/ \
  s3://muzbeats-audio/images/ \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

This will upload all cover images to R2 at the `images/` path, matching the structure in your database.

## Verify Upload

After uploading, test that an image loads:
```bash
curl -I https://pub-4fe563f347e7410793a6434c2a671ffc.r2.dev/images/pierre_bourne/104.webp
```

Should return `200 OK` if the image is accessible.

## After Upload

Refresh your website - cover images should now appear!

