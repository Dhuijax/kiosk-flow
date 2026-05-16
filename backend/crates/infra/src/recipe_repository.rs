use sqlx::PgPool;
use uuid::Uuid;
use domain::models::recipe::ProductIngredient;
use std::sync::Arc;
use bigdecimal::BigDecimal;

pub struct RecipeRepository {
    pool: PgPool,
}

impl RecipeRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn get_recipe_for_product(
        &self,
        tenant_id: &Uuid,
        product_id: &Uuid,
    ) -> Result<Vec<ProductIngredient>, sqlx::Error> {
        let records = sqlx::query!(
            r#"
            SELECT 
                pi.id, 
                pi.product_id, 
                pi.ingredient_id, 
                pi.quantity,
                pi.is_customizable,
                i.name as ingredient_name,
                i.unit
            FROM product_ingredients pi
            JOIN ingredients i ON pi.ingredient_id = i.id
            WHERE pi.tenant_id = $1 AND pi.product_id = $2
            "#,
            tenant_id,
            product_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(records
            .into_iter()
            .map(|row| ProductIngredient {
                id: row.id,
                product_id: row.product_id,
                ingredient_id: row.ingredient_id,
                ingredient_name: row.ingredient_name,
                unit: row.unit,
                quantity: row.quantity,
                is_customizable: row.is_customizable,
            })
            .collect())
    }

    pub async fn set_recipe_for_product(
        &self,
        tenant_id: &Uuid,
        product_id: &Uuid,
        ingredients: &[(Uuid, BigDecimal, bool)],
    ) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        // 1. Delete existing
        sqlx::query!(
            "DELETE FROM product_ingredients WHERE tenant_id = $1 AND product_id = $2",
            tenant_id,
            product_id
        )
        .execute(&mut *tx)
        .await?;

        // 2. Insert new
        for (ingredient_id, quantity, is_customizable) in ingredients {
            sqlx::query!(
                "INSERT INTO product_ingredients (tenant_id, product_id, ingredient_id, quantity, is_customizable) VALUES ($1, $2, $3, $4, $5)",
                tenant_id,
                product_id,
                ingredient_id,
                quantity,
                is_customizable
            )
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(())
    }
}
