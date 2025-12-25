# Verify R2 Cover Structure

## Expected Structure

**Database paths:**
```
/assets/images/covers/<beat_id>.webp
```

**R2 bucket structure (should be):**
```
images/covers/<beat_id>.webp
```

**NOT:**
```
images/covers/used/<beat_id>.webp  ❌
```

## Why No "used/" Folder in R2?

The `used/` folder is only for **local organization**. In R2, we use a **flat structure** to match the database paths.

When `getR2Url()` processes `/assets/images/covers/<beat_id>.webp`:
1. Removes leading `/` → `assets/images/covers/<beat_id>.webp`
2. Removes `assets/` prefix → `images/covers/<beat_id>.webp`
3. Creates R2 URL: `https://r2.dev/images/covers/<beat_id>.webp`

So files must be at `images/covers/<beat_id>.webp` in R2 (no `used/` folder).

## Verify Upload

Check that files are in the correct location:

```bash
# List files in images/covers/ (should show .webp files directly)
aws s3 ls s3://muzbeats-media-public/images/covers/ \
  --endpoint-url https://a9eba83c23486e01c5a44f9ff5fd697d.r2.cloudflarestorage.com \
  --recursive | head -10
```

Should show:
```
images/covers/0087e976-adcb-4028-b5c1-13aae633fc73.webp
images/covers/0b3d32d3-e3f0-401f-af98-cb61f741e454.webp
...
```

**NOT:**
```
images/covers/used/0087e976-adcb-4028-b5c1-13aae633fc73.webp  ❌
```

## Test a Cover URL

```bash
# Replace with your R2_PUBLIC_URL and a beat_id
curl -I https://<R2_PUBLIC_URL>/images/covers/<beat_id>.webp
```

Should return `200 OK` if the file exists.

## If Files Are Still in "used/" Folder

If you see files at `images/covers/used/<beat_id>.webp` in R2, you need to move them:

```bash
# Move all files from used/ to parent folder
aws s3 mv s3://muzbeats-media-public/images/covers/used/ \
  s3://muzbeats-media-public/images/covers/ \
  --endpoint-url https://a9eba83c23486e01c5a44f9ff5fd697d.r2.cloudflarestorage.com \
  --recursive
```

Or use the script:
```bash
export R2_ENDPOINT=https://a9eba83c23486e01c5a44f9ff5fd697d.r2.cloudflarestorage.com
./scripts/fix-r2-cover-paths.sh
```

