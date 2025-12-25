#!/bin/bash
# Upload ALL covers from local to R2 covers/used/
# This ensures all 90 files are in R2

set -e

if [ -z "$R2_ENDPOINT" ]; then
    echo "⚠️  R2_ENDPOINT environment variable not set"
    echo ""
    echo "Please set it first:"
    echo "  export R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
    exit 1
fi

SOURCE_DIR="server/public/assets/images/covers/used"
BUCKET="muzbeats-media-public"
DEST="s3://${BUCKET}/images/covers/used/"

echo "📤 Uploading ALL covers to R2..."
echo ""
echo "Source: ${SOURCE_DIR}"
echo "Destination: ${DEST}"
echo "Endpoint: ${R2_ENDPOINT}"
echo ""

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Source directory not found: ${SOURCE_DIR}"
    exit 1
fi

# Count files
FILE_COUNT=$(find "$SOURCE_DIR" -type f -name "*.webp" 2>/dev/null | wc -l | xargs)
echo "📊 Files to upload: ${FILE_COUNT}"
echo ""

# Upload (use --no-progress for cleaner output, but ensure all files upload)
echo "🚀 Starting upload..."
echo "   This will upload/update all files in $SOURCE_DIR to R2..."
aws s3 sync "$SOURCE_DIR" "$DEST" \
    --endpoint-url "$R2_ENDPOINT" \
    --exclude "*.DS_Store" \
    --exclude "*.gitkeep" \
    --no-progress

echo ""
echo "🔍 Verifying upload..."
UPLOADED_COUNT=$(aws s3 ls "$DEST" \
    --endpoint-url "$R2_ENDPOINT" \
    --recursive | grep "\.webp$" | wc -l | xargs)

if [ "$UPLOADED_COUNT" -eq "$FILE_COUNT" ]; then
    echo "   ✅ All $FILE_COUNT files are in R2!"
else
    echo "   ⚠️  Expected $FILE_COUNT files, but found $UPLOADED_COUNT in R2"
    echo "   Some files may not have uploaded. Try running the sync again."
fi

echo ""
echo "✅ Upload complete!"
echo ""
echo "📝 Verify in R2:"
echo "   - Go to Cloudflare Dashboard → R2 → muzbeats-media-public"
echo "   - Navigate to: images/covers/used/"
echo "   - Should see ${FILE_COUNT} .webp files"
echo ""
echo "📝 Test a cover URL:"
echo "   curl -I https://<R2_PUBLIC_URL>/images/covers/used/fa17ccfb-9f5a-4c0f-a70b-2af3b16c0fd5.webp"

