-- Convert timestamp-without-time-zone columns to TIMESTAMPTZ.
--
-- Safe to re-run: only alters columns that are still "timestamp without time zone".
-- Columns already TIMESTAMPTZ (e.g. download_email_sent_at) are skipped.
--
-- Assumption: existing values were stored as UTC wall-clock times.
-- If your old rows were local-time without zone, change 'UTC' below before running.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.table_name, c.column_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.data_type = 'timestamp without time zone'
          AND (
              (c.table_name = 'beats' AND c.column_name IN ('created_at', 'updated_at'))
              OR (c.table_name = 'orders' AND c.column_name IN ('created_at', 'updated_at'))
              OR (c.table_name = 'order_items' AND c.column_name = 'created_at')
              OR (c.table_name = 'downloads' AND c.column_name IN ('expires_at', 'created_at'))
          )
        ORDER BY c.table_name, c.column_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE ''UTC''',
            r.table_name,
            r.column_name,
            r.column_name
        );
        RAISE NOTICE 'Converted %.% → TIMESTAMPTZ', r.table_name, r.column_name;
    END LOOP;
END $$;

-- Report current types (informational)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('beats', 'orders', 'order_items', 'downloads')
  AND column_name IN (
      'created_at',
      'updated_at',
      'expires_at',
      'download_email_sent_at'
  )
ORDER BY table_name, column_name;
