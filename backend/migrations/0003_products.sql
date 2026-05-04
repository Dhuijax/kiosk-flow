-- 0003: Products and Toppings
BEGIN;

-- 1. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure expanded schema for products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_topping BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();


ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON products;
CREATE POLICY tenant_isolation_policy ON products
    FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

-- 2. Toppings Table
CREATE TABLE IF NOT EXISTS toppings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE toppings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON toppings;
CREATE POLICY tenant_isolation_policy ON toppings
    FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

-- 3. Product Toppings (M2M)
CREATE TABLE IF NOT EXISTS product_toppings (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    topping_id UUID NOT NULL REFERENCES toppings(id) ON DELETE CASCADE,
    PRIMARY KEY(product_id, topping_id)
);

-- We could omit RLS on M2M since it's constrained by the product/topping,
-- but to be safe we can use product's tenant implicitly via join, or just add tenant_id.
-- Given our standard schema doesn't explicitly have it, but for strict isolation it's best we don't enable RLS if there isn't a tenant_id, OR we add tenant_id.
-- Let's stick with the master plan which doesn't define tenant_id here, and the FK constraints provide data integrity.

COMMIT;
