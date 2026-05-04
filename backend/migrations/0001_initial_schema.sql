-- 0001: Initial Multi-tenant Schema
BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Products Table (Example for RLS)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Shared Policy for tenant isolation using 'app.current_tenant' session variable
DROP POLICY IF EXISTS tenant_isolation_policy ON products;
CREATE POLICY tenant_isolation_policy ON products
    FOR ALL
    USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

-- Tenants can only see themselves
DROP POLICY IF EXISTS tenant_self_view_policy ON tenants;
CREATE POLICY tenant_self_view_policy ON tenants
    FOR SELECT
    USING (id = (current_setting('app.current_tenant', true))::UUID);

COMMIT;
