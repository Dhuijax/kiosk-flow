-- sqlx: no-transaction
-- 0021: Storefront CMS and Reservations

BEGIN;

-- 1. Promotions
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    code VARCHAR(100) NOT NULL,
    discount_percent INT,
    discount_amount BIGINT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. News/Articles
CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    author TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Partners
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    level VARCHAR(50) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reservations
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    guest_count INT NOT NULL,
    reservation_time TIMESTAMPTZ NOT NULL,
    note TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    sender_type VARCHAR(50) NOT NULL, -- 'customer', 'staff'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row-Level Security Enforcements
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
DROP POLICY IF EXISTS tenant_isolation_policy ON promotions;
CREATE POLICY tenant_isolation_policy ON promotions FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

DROP POLICY IF EXISTS tenant_isolation_policy ON news;
CREATE POLICY tenant_isolation_policy ON news FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

DROP POLICY IF EXISTS tenant_isolation_policy ON partners;
CREATE POLICY tenant_isolation_policy ON partners FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

DROP POLICY IF EXISTS tenant_isolation_policy ON announcements;
CREATE POLICY tenant_isolation_policy ON announcements FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

DROP POLICY IF EXISTS tenant_isolation_policy ON reservations;
CREATE POLICY tenant_isolation_policy ON reservations FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

DROP POLICY IF EXISTS tenant_isolation_policy ON chat_messages;
CREATE POLICY tenant_isolation_policy ON chat_messages FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

-- Branch Isolation Policies for Reservations
DROP POLICY IF EXISTS branch_isolation_policy ON reservations;
CREATE POLICY branch_isolation_policy ON reservations FOR ALL USING (is_branch_allowed(branch_id));

COMMIT;
