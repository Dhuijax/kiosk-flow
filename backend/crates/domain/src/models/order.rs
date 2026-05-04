use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use sqlx::types::BigDecimal;

#[derive(Debug, Clone, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "order_status", rename_all = "lowercase")]
pub enum OrderStatus {
    Draft,
    Confirmed,
    Preparing,
    Served,
    Paid,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "order_item_status", rename_all = "lowercase")]
pub enum OrderItemStatus {
    Pending,
    Preparing,
    Ready,
    Served,
    Cancelled,
}

#[derive(Debug, Clone, FromRow)]
pub struct Order {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub branch_id: Uuid,
    pub table_id: Option<Uuid>,
    pub order_number: String,
    pub status: OrderStatus,
    pub customer_name: Option<String>,
    pub subtotal: BigDecimal,
    pub tax_amount: BigDecimal,
    pub discount_amount: BigDecimal,
    pub total: BigDecimal,
    pub note: Option<String>,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow)]
pub struct OrderItem {
    pub id: Uuid,
    pub order_id: Uuid,
    pub tenant_id: Uuid,
    pub product_id: Uuid,
    pub product_name: String,
    pub unit_price: BigDecimal,
    pub quantity: i32,
    pub subtotal: BigDecimal,
    pub note: Option<String>,
    pub status: OrderItemStatus,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct OrderItemTopping {
    pub id: Uuid,
    pub order_item_id: Uuid,
    pub tenant_id: Uuid,
    pub topping_id: Uuid,
    pub name: String,
    pub price: BigDecimal,
}
