#!/bin/bash
# Move covers from images/covers/used/ to images/covers/ in R2
# This matches the database structure: /assets/images/covers/<beat_id>.webp

set -e

echo "🔄 Moving covers from images/covers/used/ to images/covers/ in R2..."
echo ""

if [ -z "$R2_ENDPOINT" ]; then
    echo "⚠️  R2_ENDPOINT environment variable not set"
    echo ""
    echo "Please set it first:"
    echo "  export R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
    echo ""
    echo "Or run with:"
    echo "  R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com ./scripts/fix-r2-cover-paths.sh"
    exit 1
fi

BUCKET="muzbeats-media-public"
SOURCE="s3://${BUCKET}/images/covers/used/"
DEST="s3://${BUCKET}/images/covers/"

echo "Source: ${SOURCE}"
echo "Destination: ${DEST}"
echo "Endpoint: ${R2_ENDPOINT}"
echo ""

# List files in used/ folder
echo "📊 Listing files in used/ folder..."
FILES=$(aws s3 ls "$SOURCE" \
    --endpoint-url "$R2_ENDPOINT" \
    --recursive | awk '{print $4}')

if [ -z "$FILES" ]; then
    echo "❌ No files found in ${SOURCE}"
    exit 1
fi

FILE_COUNT=$(echo "$FILES" | wc -l | xargs)
echo "   Found ${FILE_COUNT} files"
echo ""

# Confirm
read -p "Move ${FILE_COUNT} files from used/ to covers/? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Move each file
echo ""
echo "🚀 Moving files..."
MOVED=0
FAILED=0

while IFS= read -r file; do
    if [ -z "$file" ]; then
        continue
    fi
    
    # Get just the filename (remove used/ prefix)
    filename=$(basename "$file")
    source_path="${SOURCE}${filename}"
    dest_path="${DEST}${filename}"
    
    echo "   Moving: ${filename}..."
    
    if aws s3 mv "$source_path" "$dest_path" \
        --endpoint-url "$R2_ENDPOINT" 2>/dev/null; then
        MOVED=$((MOVED + 1))
    else
        echo "     ⚠️  Failed to move ${filename}"
        FAILED=$((FAILED + 1))
    fi
done <<< "$FILES"

echo ""
echo "📊 Summary:"
echo "   ✅ Moved: ${MOVED} files"
if [ $FAILED -gt 0 ]; then
    echo "   ❌ Failed: ${FAILED} files"
fi

echo ""
echo "✅ Done! Covers should now be at: images/covers/<beat_id>.webp"
echo "   Refresh staging.prodmuz.com to see changes."

