-- 0010: System Settings
BEGIN;

CREATE TABLE IF NOT EXISTS tenant_settings (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    theme_color TEXT DEFAULT '#8b5e3c',
    logo_url TEXT,
    kiosk_timeout_seconds INTEGER DEFAULT 60,
    language TEXT DEFAULT 'vi',
    currency TEXT DEFAULT 'VND',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_settings;
CREATE POLICY tenant_isolation_policy ON tenant_settings
    FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::UUID);

-- Insert default settings for existing tenants
INSERT INTO tenant_settings (tenant_id)
SELECT id FROM tenants
ON CONFLICT DO NOTHING;

COMMIT;
