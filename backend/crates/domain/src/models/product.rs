use uuid::Uuid;
use chrono::{DateTime, Utc};
use sqlx::types::BigDecimal;

#[derive(Debug, Clone)]
pub struct Product {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub category_id: Option<Uuid>,
    pub sku: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub price: BigDecimal,
    pub cost_price: BigDecimal,
    pub unit: Option<String>,
    pub image_url: Option<String>,
    pub is_active: bool,
    pub allow_topping: bool,
    pub track_inventory: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct Topping {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub price: BigDecimal,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}
