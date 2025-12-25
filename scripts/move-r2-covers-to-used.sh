#!/bin/bash
# Move covers from images/covers/ to images/covers/used/ in R2
# This matches the local structure: covers/used/

set -e

echo "🔄 Moving covers to images/covers/used/ in R2..."
echo ""

if [ -z "$R2_ENDPOINT" ]; then
    echo "⚠️  R2_ENDPOINT environment variable not set"
    echo ""
    echo "Please set it first:"
    echo "  export R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
    echo ""
    echo "Or run with:"
    echo "  R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com ./scripts/move-r2-covers-to-used.sh"
    exit 1
fi

BUCKET="muzbeats-media-public"
SOURCE="s3://${BUCKET}/images/covers/"
DEST="s3://${BUCKET}/images/covers/used/"

echo "Source: ${SOURCE}"
echo "Destination: ${DEST}"
echo "Endpoint: ${R2_ENDPOINT}"
echo ""

# List files in covers/ folder (excluding used/ and unused/)
echo "📊 Listing files in covers/ folder..."
FILES=$(aws s3 ls "$SOURCE" \
    --endpoint-url "$R2_ENDPOINT" \
    --recursive | grep "\.webp$" | grep -v "/used/" | grep -v "/unused/" | awk '{print $4}')

if [ -z "$FILES" ]; then
    echo "❌ No .webp files found in ${SOURCE} (excluding used/ and unused/)"
    exit 1
fi

FILE_COUNT=$(echo "$FILES" | wc -l | xargs)
echo "   Found ${FILE_COUNT} files to move"
echo ""

# Confirm
read -p "Move ${FILE_COUNT} files to covers/used/? (y/n) " -n 1 -r
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
    
    # Get just the filename
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
echo "✅ Done! Covers are now at: images/covers/used/<beat_id>.webp"
echo "   This matches local structure and database paths."

