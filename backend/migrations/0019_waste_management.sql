-- sqlx: no-transaction
-- 0019: Waste & Loss Management

-- Add 'waste' value to inventory_transaction_type enum
ALTER TYPE inventory_transaction_type ADD VALUE IF NOT EXISTS 'waste';

-- Create waste_logs table
CREATE TABLE IF NOT EXISTS waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(12, 4) NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('WRONG_RECIPE', 'SPOILED', 'DAMAGED', 'EXPIRED', 'OTHER')),
    cost DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    note TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT waste_logs_entity_check 
        CHECK ((product_id IS NOT NULL AND ingredient_id IS NULL) OR (product_id IS NULL AND ingredient_id IS NOT NULL))
);

-- Enable Row Level Security (RLS)
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;

-- Apply Tenant Isolation Policy
DROP POLICY IF EXISTS tenant_isolation_policy ON waste_logs;
CREATE POLICY tenant_isolation_policy ON waste_logs
    FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_waste_logs_branch ON waste_logs(branch_id);
