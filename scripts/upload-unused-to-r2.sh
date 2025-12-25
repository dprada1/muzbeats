#!/bin/bash
# Upload cleaned unused/ folder to Cloudflare R2
# Usage: ./scripts/upload-unused-to-r2.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}📤 Uploading unused/ folder to R2...${NC}"
echo ""

# Check if R2_ENDPOINT is set
if [ -z "$R2_ENDPOINT" ]; then
    echo -e "${YELLOW}⚠️  R2_ENDPOINT environment variable not set${NC}"
    echo ""
    echo "Please set it first:"
    echo "  export R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
    echo ""
    echo "Or run with:"
    echo "  R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com ./scripts/upload-unused-to-r2.sh"
    exit 1
fi

SOURCE_DIR="server/public/assets/images/covers/unused"
BUCKET="muzbeats-media-public"
DEST_PATH="s3://${BUCKET}/images/covers/unused/"

echo "Source: ${SOURCE_DIR}"
echo "Destination: ${DEST_PATH}"
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

# Upload
echo "🚀 Starting upload..."
aws s3 sync "$SOURCE_DIR" "$DEST_PATH" \
    --endpoint-url "$R2_ENDPOINT" \
    --exclude "*.DS_Store" \
    --exclude "*.gitkeep"

echo ""
echo -e "${GREEN}✅ Upload complete!${NC}"
echo ""
echo "Verify upload by checking:"
echo "  ${R2_PUBLIC_URL:-https://pub-xxxxx.r2.dev}/images/covers/unused/{artist}/{file}.webp"

