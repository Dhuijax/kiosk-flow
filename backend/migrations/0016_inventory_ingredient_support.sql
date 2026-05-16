-- 0016: Inventory Ingredient Support
BEGIN;

-- 1. Make product_id nullable in inventory and inventory_transactions
ALTER TABLE inventory ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE inventory_transactions ALTER COLUMN product_id DROP NOT NULL;

-- 2. Add ingredient_id column
ALTER TABLE inventory ADD COLUMN ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE;
ALTER TABLE inventory_transactions ADD COLUMN ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE;

-- 3. Add check constraints to ensure either product_id or ingredient_id is set (XOR-ish)
ALTER TABLE inventory ADD CONSTRAINT inventory_entity_check 
    CHECK ((product_id IS NOT NULL AND ingredient_id IS NULL) OR (product_id IS NULL AND ingredient_id IS NOT NULL));

ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_entity_check 
    CHECK ((product_id IS NOT NULL AND ingredient_id IS NULL) OR (product_id IS NULL AND ingredient_id IS NOT NULL));

-- 4. Update unique constraint on inventory
-- Drop old constraint: UNIQUE(tenant_id, branch_id, product_id)
-- Note: We need to find the name of the old constraint. In 0007 it was defined as UNIQUE(tenant_id, branch_id, product_id).
-- PostgreSQL usually names it "inventory_tenant_id_branch_id_product_id_key".
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_tenant_id_branch_id_product_id_key;

-- Create new conditional unique constraints
CREATE UNIQUE INDEX idx_inventory_product_unique ON inventory (tenant_id, branch_id, product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX idx_inventory_ingredient_unique ON inventory (tenant_id, branch_id, ingredient_id) WHERE ingredient_id IS NOT NULL;

COMMIT;
