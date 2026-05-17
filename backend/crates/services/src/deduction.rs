use anyhow::Result;
use domain::models::inventory::InventoryTransactionType;
use infra::recipe_repository::RecipeRepository;
use infra::repository::{InventoryRepository, OrderRepository};
use sqlx::types::BigDecimal;
use std::sync::Arc;
use uuid::Uuid;

pub struct DeductionService {
    order_repo: Arc<OrderRepository>,
    inventory_repo: Arc<InventoryRepository>,
    recipe_repo: Arc<RecipeRepository>,
}

impl DeductionService {
    pub fn new(
        order_repo: Arc<OrderRepository>,
        inventory_repo: Arc<InventoryRepository>,
        recipe_repo: Arc<RecipeRepository>,
    ) -> Self {
        Self {
            order_repo,
            inventory_repo,
            recipe_repo,
        }
    }

    pub async fn deduct_stock_for_order(
        &self,
        tenant_id: &Uuid,
        branch_id: &Uuid,
        order_id: &Uuid,
    ) -> Result<()> {
        // 1. Fetch Order and Items
        let (order, items) = match self.order_repo.find_by_id(tenant_id, order_id).await? {
            Some(data) => data,
            None => return Err(anyhow::anyhow!("Order not found")),
        };

        for (item, _) in items {
            // 2. Fetch Recipe for Product
            let ingredients = self
                .recipe_repo
                .get_recipe_for_product(tenant_id, &item.product_id)
                .await?;

            if ingredients.is_empty() {
                // FALLBACK: If no recipe exists, check if we should deduct the product itself (retail style)
                // In S33, we prioritize BOM, but we maintain backward compatibility where possible.
                // However, since we refactored Inventory to support both, we can still deduct product_id.

                // For now, if no recipe, we'll try to deduct the product if it was tracked.
                // We'll skip for now as per the "Logic Shift" in the plan, or we can keep the old logic as a fallback.
                continue;
            }

            for recipe_item in ingredients {
                // Convert recipe quantity to sqlx BigDecimal if needed, though they are likely compatible
                let recipe_qty = recipe_item.quantity;
                let item_qty = BigDecimal::from(item.quantity);

                let total_deduction = recipe_qty * item_qty;
                let quantity_change = -total_deduction;

                let _ = self
                    .inventory_repo
                    .update_stock(
                        tenant_id,
                        branch_id,
                        None, // product_id
                        Some(recipe_item.ingredient_id),
                        &quantity_change,
                        InventoryTransactionType::Sale,
                        Some(*order_id),
                        Some(format!("Deduction for Order #{}", order.order_number)),
                        None, // System user
                    )
                    .await?;
            }
        }

        Ok(())
    }
}
