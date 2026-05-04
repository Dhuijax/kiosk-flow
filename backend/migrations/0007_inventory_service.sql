-- 0007: Inventory Service
BEGIN;

-- 1. Inventory Transaction Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_transaction_type') THEN
        CREATE TYPE inventory_transaction_type AS ENUM ('sale', 'purchase', 'adjustment', 'transfer', 'return');
    END IF;
END $$;

-- 2. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    min_quantity DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, product_id)
);

-- RLS for Inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON inventory;
CREATE POLICY tenant_isolation_policy ON inventory
    FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

-- 3. Inventory Transactions Table
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type inventory_transaction_type NOT NULL,
    quantity_change DECIMAL(12, 3) NOT NULL,
    reference_id UUID, -- order_id, purchase_order_id, etc.
    note TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Inventory Transactions
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON inventory_transactions;
CREATE POLICY tenant_isolation_policy ON inventory_transactions
    FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

-- 4. Automatically update updated_at for inventory
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_timestamp
BEFORE UPDATE ON inventory
FOR EACH ROW
EXECUTE FUNCTION update_inventory_timestamp();

COMMIT;
