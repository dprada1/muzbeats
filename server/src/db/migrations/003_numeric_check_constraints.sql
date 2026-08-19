-- Add CHECKs / NOT NULL that schema.sql now declares on *existing* tables.
-- PostgreSQL has no UNSIGNED integer type; CHECK is the equivalent.
--
-- schema.sql is CREATE IF NOT EXISTS only — it will not ALTER tables that
-- already exist. This file is the ALTER path for those databases.
--
-- Safe to re-run: skips constraints that already exist.
-- Fails if existing rows violate a new CHECK — fix those rows first.
--
-- Run (from server/, with DATABASE_URL or local psql):
--   psql "$DATABASE_URL" -f src/db/migrations/003_numeric_check_constraints.sql
--   psql -U postgres -d muzbeats_dev -f src/db/migrations/003_numeric_check_constraints.sql
--
-- Skip this file on a brand-new database created from the current schema.sql
-- (the CHECKs are already in CREATE TABLE).

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS download_email_sent_at TIMESTAMPTZ NULL;

-- orders.total_amount must be a paid amount (this store does not persist $0 carts).
-- Refunded / failed rows keep the original capture amount, so they stay > 0.
DO $$
BEGIN
    ALTER TABLE orders
        ADD CONSTRAINT orders_total_amount_positive CHECK (total_amount > 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE order_items
        ADD CONSTRAINT order_items_price_at_purchase_positive CHECK (price_at_purchase > 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- quantity already had CHECK (quantity > 0) on new installs; name it if missing.
DO $$
BEGIN
    ALTER TABLE order_items
        ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE downloads
    ALTER COLUMN download_count SET DEFAULT 0,
    ALTER COLUMN download_count SET NOT NULL,
    ALTER COLUMN max_downloads SET DEFAULT 5,
    ALTER COLUMN max_downloads SET NOT NULL;

DO $$
BEGIN
    ALTER TABLE downloads
        ADD CONSTRAINT downloads_count_nonnegative CHECK (download_count >= 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE downloads
        ADD CONSTRAINT downloads_max_positive CHECK (max_downloads > 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE downloads
        ADD CONSTRAINT downloads_count_within_max CHECK (download_count <= max_downloads);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
