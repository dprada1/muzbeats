#!/bin/bash
# Quick script to sync staging cover paths
# Usage: ./scripts/sync-staging-covers.sh

set -e

echo "🔄 Syncing staging cover paths..."
echo ""
echo "⚠️  You need your staging DATABASE_URL from Railway Dashboard:"
echo "   1. Go to Railway Dashboard → Your project → Staging service"
echo "   2. Click Variables tab"
echo "   3. Copy DATABASE_URL"
echo ""
read -p "Paste staging DATABASE_URL here: " STAGING_DB_URL

if [ -z "$STAGING_DB_URL" ]; then
    echo "❌ DATABASE_URL is required"
    exit 1
fi

echo ""
echo "📊 Running update-covers script..."
cd server
DATABASE_URL="$STAGING_DB_URL" npm run update-covers -- --apply

echo ""
echo "✅ Done! Staging cover paths should now be synced."
echo "   Visit staging.prodmuz.com and hard refresh to see changes."

