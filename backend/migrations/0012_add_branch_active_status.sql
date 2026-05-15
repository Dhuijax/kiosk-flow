-- 0012: Add is_active to branches
BEGIN;

ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

COMMIT;
