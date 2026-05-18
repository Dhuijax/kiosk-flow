-- sqlx: no-transaction
-- 0020: Enforce strict branch_id scoping with Row-Level Security (RLS)

-- 1. Helper function to check branch access permission
CREATE OR REPLACE FUNCTION public.is_branch_allowed(row_branch_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    curr_user TEXT;
    curr_branch TEXT;
    user_role TEXT;
BEGIN
    curr_user := current_setting('app.current_user', true);
    -- If app.current_user is not set or empty, allow (system commands, migrations, main startup)
    IF curr_user IS NULL OR curr_user = '' THEN
        RETURN TRUE;
    END IF;

    -- Fetch the user role (using SECURITY DEFINER to bypass RLS recursion)
    SELECT role::TEXT INTO user_role FROM public.users WHERE id = curr_user::UUID;
    
    -- Owners and managers have global branch visibility
    IF user_role IN ('owner', 'manager') THEN
        RETURN TRUE;
    END IF;

    curr_branch := current_setting('app.current_branch', true);
    IF curr_branch IS NULL OR curr_branch = '' THEN
        RETURN FALSE;
    END IF;

    -- Standard staff can only view rows matching their active branch context
    RETURN row_branch_id = curr_branch::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply RLS policies to branch-aware tables
-- Orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_isolation_policy ON orders;
CREATE POLICY branch_isolation_policy ON orders
    FOR ALL USING (is_branch_allowed(branch_id));

-- Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_isolation_policy ON payments;
CREATE POLICY branch_isolation_policy ON payments
    FOR ALL USING (is_branch_allowed(branch_id));

-- Inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_isolation_policy ON inventory;
CREATE POLICY branch_isolation_policy ON inventory
    FOR ALL USING (is_branch_allowed(branch_id));

-- Inventory Transactions
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_isolation_policy ON inventory_transactions;
CREATE POLICY branch_isolation_policy ON inventory_transactions
    FOR ALL USING (is_branch_allowed(branch_id));

-- Waste Logs
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_isolation_policy ON waste_logs;
CREATE POLICY branch_isolation_policy ON waste_logs
    FOR ALL USING (is_branch_allowed(branch_id));

-- Purchase Orders
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_isolation_policy ON purchase_orders;
CREATE POLICY branch_isolation_policy ON purchase_orders
    FOR ALL USING (is_branch_allowed(branch_id));

-- Stock Alerts
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_isolation_policy ON stock_alerts;
CREATE POLICY branch_isolation_policy ON stock_alerts
    FOR ALL USING (is_branch_allowed(branch_id));

-- Floor Plans
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_isolation_policy ON floor_plans;
CREATE POLICY branch_isolation_policy ON floor_plans
    FOR ALL USING (is_branch_allowed(branch_id));

-- Tables
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_isolation_policy ON tables;
CREATE POLICY branch_isolation_policy ON tables
    FOR ALL USING (is_branch_allowed(branch_id));

-- Users (Allow access to rows matching branch, or null branch representing owners/managers)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_isolation_policy ON users;
CREATE POLICY branch_isolation_policy ON users
    FOR ALL USING (branch_id IS NULL OR is_branch_allowed(branch_id));
