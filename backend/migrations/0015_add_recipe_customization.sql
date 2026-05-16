-- 0015: Add customization flag to recipe ingredients
BEGIN;

ALTER TABLE product_ingredients ADD COLUMN is_customizable BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
