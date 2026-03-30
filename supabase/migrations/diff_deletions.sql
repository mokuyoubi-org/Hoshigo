-- Auto-generated deletion DDL
BEGIN;

ALTER TABLE IF EXISTS system.app_status ADD COLUMN IF NOT EXISTS test text;

COMMIT;
