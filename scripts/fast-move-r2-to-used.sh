#!/bin/bash
# Faster alternative: Re-upload from local instead of moving in R2
# This is faster because we can upload in parallel

set -e

echo "⚡ Fast method: Re-upload from local to R2 covers/used/"
echo ""

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
FILE_COUNT=$(find "$SOURCE_DIR" -type f -name "*.webp" | wc -l | xargs)
echo "📊 Files to upload: ${FILE_COUNT}"
echo ""

# Upload (this will overwrite existing files, which is fine)
echo "🚀 Uploading files (this is faster than moving in R2)..."
aws s3 sync "$SOURCE_DIR" "$DEST" \
    --endpoint-url "$R2_ENDPOINT" \
    --exclude "*.DS_Store" \
    --exclude "*.gitkeep"

echo ""
echo "✅ Upload complete!"
echo ""
echo "📝 Next step: Delete old files from images/covers/ (not in used/):"
echo "   aws s3 rm s3://${BUCKET}/images/covers/ --endpoint-url ${R2_ENDPOINT} --recursive --exclude 'used/*' --exclude 'unused/*'"
echo ""
echo "   Or leave them - they won't be used since DB paths point to covers/used/"

