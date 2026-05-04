-- Migration: Payment Service
-- Sprint: S17

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM (
        'cash', 'card', 'transfer', 'momo', 'zalopay'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pending', 'completed', 'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id),
    method payment_method NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    received_amount DECIMAL(15, 2) NOT NULL,
    change_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    transaction_ref VARCHAR(255),
    status payment_status NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indices
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_branch ON payments(branch_id);
CREATE INDEX idx_payments_order ON payments(order_id);


-- 4. Enable Row Level Security (RLS)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY tenant_isolation_payments ON payments
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
    
-- 6. Add policy to allow the same tenant to see their payments
-- (Handled by the policy above)
