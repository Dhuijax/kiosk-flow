-- Migration: Order Service
-- Sprint: S14

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'draft', 'confirmed', 'preparing', 'served', 'paid', 'completed', 'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_item_status AS ENUM (
        'pending', 'preparing', 'ready', 'served', 'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Sequence Tracking Table (for daily order numbers)
CREATE TABLE IF NOT EXISTS daily_sequences (
    branch_id UUID NOT NULL,
    seq_date DATE NOT NULL,
    last_value INT NOT NULL DEFAULT 0,
    PRIMARY KEY (branch_id, seq_date)
);

-- 3. Create Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    table_id UUID, -- NULL for takeaway
    order_number VARCHAR(32) NOT NULL,
    status order_status NOT NULL DEFAULT 'draft',
    customer_name VARCHAR(255),
    
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL DEFAULT 0,
    
    note TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 4. Create Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    product_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL, -- Snapshot
    
    unit_price DECIMAL(15, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal DECIMAL(15, 2) NOT NULL,
    
    note TEXT,
    status order_item_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create Order Item Toppings Table
CREATE TABLE IF NOT EXISTS order_item_toppings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    topping_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL, -- Snapshot
    price DECIMAL(15, 2) NOT NULL
);

-- 6. Indices
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_branch ON orders(branch_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE daily_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_toppings ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
CREATE POLICY tenant_isolation_daily_sequences ON daily_sequences
    USING (branch_id IN (SELECT id FROM branches WHERE tenant_id = current_setting('app.current_tenant')::uuid));

CREATE POLICY tenant_isolation_orders ON orders
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_order_items ON order_items
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_order_item_toppings ON order_item_toppings
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- 9. Trigger for updated_at
CREATE OR REPLACE TRIGGER set_updated_at_orders
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
