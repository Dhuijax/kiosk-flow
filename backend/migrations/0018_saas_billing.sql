-- 0018: SaaS Tenant Billing
BEGIN;

-- 1. Tenant Subscriptions Table
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    plan_type TEXT NOT NULL, -- STARTER, PRO, ENTERPRISE
    status TEXT NOT NULL, -- ACTIVE, PAST_DUE, CANCELED
    expires_at TIMESTAMPTZ NOT NULL,
    max_tables INT NOT NULL DEFAULT 10,
    max_products INT NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for tenant_subscriptions
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_subscriptions;
CREATE POLICY tenant_isolation_policy ON tenant_subscriptions
    FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

-- Trigger for updating updated_at timestamp
CREATE TRIGGER trigger_update_tenant_subscriptions_timestamp
BEFORE UPDATE ON tenant_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_inventory_timestamp();

-- 2. Billing Transactions Table
CREATE TABLE IF NOT EXISTS billing_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    gateway TEXT NOT NULL, -- MOMO, ZALOPAY, VNPAY, APPLEPAY, GOOGLEPAY
    transaction_id TEXT UNIQUE,
    status TEXT NOT NULL, -- PENDING, SUCCESS, FAILED
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for billing_transactions
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON billing_transactions;
CREATE POLICY tenant_isolation_policy ON billing_transactions
    FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_txn ON billing_transactions(transaction_id);

COMMIT;
