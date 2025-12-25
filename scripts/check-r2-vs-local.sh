#!/bin/bash
# Compare what's in R2 vs what's locally
# This helps identify which files are missing in R2

set -e

if [ -z "$R2_ENDPOINT" ]; then
    echo "⚠️  R2_ENDPOINT environment variable not set"
    echo ""
    echo "Please set it first:"
    echo "  export R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
    exit 1
fi

BUCKET="muzbeats-media-public"
R2_PATH="s3://${BUCKET}/images/covers/used/"
LOCAL_DIR="server/public/assets/images/covers/used"

echo "🔍 Comparing R2 vs Local files..."
echo ""

# Get list of files in R2
echo "📊 Files in R2:"
R2_FILES=$(aws s3 ls "$R2_PATH" \
    --endpoint-url "$R2_ENDPOINT" \
    --recursive | grep "\.webp$" | awk '{print $4}' | sed 's|images/covers/used/||' | sort)

R2_COUNT=$(echo "$R2_FILES" | grep -c . || echo "0")
echo "   Found: $R2_COUNT files"
echo ""

# Get list of files locally
echo "📊 Files locally:"
LOCAL_FILES=$(find "$LOCAL_DIR" -type f -name "*.webp" -exec basename {} \; | sort)
LOCAL_COUNT=$(echo "$LOCAL_FILES" | grep -c . || echo "0")
echo "   Found: $LOCAL_COUNT files"
echo ""

# Find files that are local but not in R2
echo "❌ Files missing in R2 (exist locally but not uploaded):"
MISSING_IN_R2=$(comm -23 <(echo "$LOCAL_FILES") <(echo "$R2_FILES"))
MISSING_COUNT=$(echo "$MISSING_IN_R2" | grep -c . || echo "0")

if [ "$MISSING_COUNT" -eq 0 ]; then
    echo "   ✅ All local files are in R2!"
else
    echo "$MISSING_IN_R2" | head -10
    if [ "$MISSING_COUNT" -gt 10 ]; then
        echo "   ... and $((MISSING_COUNT - 10)) more"
    fi
    echo ""
    echo "   Total missing: $MISSING_COUNT files"
fi

echo ""
echo "📝 To upload missing files, run:"
echo "   ./scripts/upload-all-covers-to-r2.sh"

