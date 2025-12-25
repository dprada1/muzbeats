#!/bin/bash
# Find beats that don't have cover images locally
# These need cover_path set to NULL in the database

set -e

COVERS_DIR="server/public/assets/images/covers/used"

echo "🔍 Finding beats without cover images..."
echo ""

# Get all local cover files (extract UUIDs)
echo "📊 Local cover files: $(find "$COVERS_DIR" -type f -name "*.webp" | wc -l | xargs)"
echo ""

# List the UUIDs we have
LOCAL_UUIDS=$(find "$COVERS_DIR" -type f -name "*.webp" -exec basename {} .webp \; | sort)

echo "📋 To find missing beats, compare these UUIDs against your database:"
echo ""
echo "Run this SQL on your staging/production database:"
echo ""
echo "SELECT id, title FROM beats"
echo "WHERE id NOT IN ("
echo "  -- UUIDs from local files"
echo "$LOCAL_UUIDS" | head -5
echo "  ... (90 UUIDs total)"
echo ");"
echo ""
echo "Or use this script against the database:"
echo "  DATABASE_URL=<your_url> node -e \"..."
echo ""
echo "📝 For the missing beats, run:"
echo "  UPDATE beats SET cover_path = NULL WHERE id IN ('<uuid1>', '<uuid2>', ...);"

