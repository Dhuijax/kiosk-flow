use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Inventory {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub branch_id: Uuid,
    pub product_id: Option<Uuid>,
    pub ingredient_id: Option<Uuid>,
    pub quantity: BigDecimal,
    pub min_quantity: BigDecimal,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct InventoryTransaction {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub branch_id: Uuid,
    pub product_id: Option<Uuid>,
    pub ingredient_id: Option<Uuid>,
    pub r#type: InventoryTransactionType,
    pub quantity_change: BigDecimal,
    pub reference_id: Option<Uuid>,
    pub note: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "inventory_transaction_type", rename_all = "lowercase")]
pub enum InventoryTransactionType {
    Sale,
    Purchase,
    Adjustment,
    Transfer,
    Return,
}
