-- 0004: Table Service
BEGIN;

-- 1. Floor Plans Table
CREATE TABLE IF NOT EXISTS floor_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    layout_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON floor_plans;
CREATE POLICY tenant_isolation_policy ON floor_plans
    FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

-- 2. Tables Table
DO $$ BEGIN
    CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    floor_plan_id UUID NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    position_x INT NOT NULL DEFAULT 0,
    position_y INT NOT NULL DEFAULT 0,
    status table_status NOT NULL DEFAULT 'available',
    current_order_id UUID, -- Will be FK to orders later
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON tables;
CREATE POLICY tenant_isolation_policy ON tables
    FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

COMMIT;
