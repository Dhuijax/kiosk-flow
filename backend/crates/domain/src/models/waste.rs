use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct WasteLog {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub branch_id: Uuid,
    pub ingredient_id: Option<Uuid>,
    pub product_id: Option<Uuid>,
    pub quantity: BigDecimal,
    pub reason: String,
    pub cost: BigDecimal,
    pub note: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct WasteLogWithNames {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub branch_id: Uuid,
    pub ingredient_id: Option<Uuid>,
    pub product_id: Option<Uuid>,
    pub quantity: BigDecimal,
    pub reason: String,
    pub cost: BigDecimal,
    pub note: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub product_name: Option<String>,
    pub ingredient_name: Option<String>,
}
