#!/bin/bash
# Upload covers to R2 with FLAT structure (no "used/" folder)
# This matches the database paths: /assets/images/covers/<beat_id>.webp
# Which transforms to R2: images/covers/<beat_id>.webp

set -e

if [ -z "$R2_ENDPOINT" ]; then
    echo "⚠️  R2_ENDPOINT environment variable not set"
    echo ""
    echo "Please set it first:"
    echo "  export R2_ENDPOINT=https://a9eba83c23486e01c5a44f9ff5fd697d.r2.cloudflarestorage.com"
    exit 1
fi

SOURCE_DIR="server/public/assets/images/covers"
BUCKET="muzbeats-media-public"
DEST="s3://${BUCKET}/images/covers/"

echo "📤 Uploading covers to R2 (FLAT structure, no 'used/' folder)..."
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

# Upload to FLAT structure (no "used/" folder)
echo "🚀 Starting upload..."
echo "   This will upload all files from $SOURCE_DIR to images/covers/ in R2..."
aws s3 sync "$SOURCE_DIR" "$DEST" \
    --endpoint-url "$R2_ENDPOINT" \
    --exclude "*.DS_Store" \
    --exclude "*.gitkeep"

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
echo "   - Files should be at: images/covers/<beat_id>.webp"
echo "   - NOT at: images/covers/used/<beat_id>.webp"
echo ""
echo "📝 Test a cover URL:"
echo "   curl -I https://pub-5a7451abfd304586ac4e34f6f8fa8e40.r2.dev/images/covers/0087e976-adcb-4028-b5c1-13aae633fc73.webp"
echo ""
echo "🔗 Database paths should be:"
echo "   /assets/images/covers/<beat_id>.webp"
echo ""
echo "🔗 Which transforms to R2 URLs:"
echo "   https://<R2_PUBLIC_URL>/images/covers/<beat_id>.webp"

