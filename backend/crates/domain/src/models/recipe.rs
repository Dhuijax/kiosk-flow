use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductIngredient {
    pub id: Uuid,
    pub product_id: Uuid,
    pub ingredient_id: Uuid,
    pub ingredient_name: String,
    pub unit: String,
    pub quantity: BigDecimal,
    pub is_customizable: bool,
}
