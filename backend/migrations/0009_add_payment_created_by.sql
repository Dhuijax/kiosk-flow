-- Migration: Add created_by to payments
-- Sprint: S24 Fix

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Optional: If you want to link it to users
-- ALTER TABLE payments ADD CONSTRAINT fk_payments_created_by FOREIGN KEY (created_by) REFERENCES users(id);
