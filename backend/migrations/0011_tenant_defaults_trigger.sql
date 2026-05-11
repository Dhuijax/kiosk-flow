-- 0011: Tenant Defaults Trigger
BEGIN;

-- Function to create default branch and settings for a new tenant
CREATE OR REPLACE FUNCTION trigger_create_tenant_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Insert default settings
    INSERT INTO tenant_settings (tenant_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;

    -- 2. Insert default main branch
    INSERT INTO branches (tenant_id, name, is_main)
    VALUES (NEW.id, 'Main Branch', true)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute the function after insert on tenants
DROP TRIGGER IF EXISTS trg_tenant_defaults ON tenants;
CREATE TRIGGER trg_tenant_defaults
AFTER INSERT ON tenants
FOR EACH ROW
EXECUTE FUNCTION trigger_create_tenant_defaults();

COMMIT;
