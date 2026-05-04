use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use sqlx::types::BigDecimal;

#[derive(Debug, Clone, sqlx::Type, Serialize, Deserialize)]
#[sqlx(type_name = "payment_method", rename_all = "lowercase")]
pub enum PaymentMethod {
    Cash,
    Card,
    Transfer,
    Momo,
    ZaloPay,
}

#[derive(Debug, Clone, sqlx::Type, Serialize, Deserialize)]
#[sqlx(type_name = "payment_status", rename_all = "lowercase")]
pub enum PaymentStatus {
    Pending,
    Completed,
    Refunded,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Payment {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub branch_id: Option<Uuid>,
    pub order_id: Uuid,
    pub method: PaymentMethod,
    pub amount: BigDecimal,
    pub received_amount: BigDecimal,
    pub change_amount: BigDecimal,
    pub transaction_ref: Option<String>,
    pub status: PaymentStatus,
    pub paid_at: DateTime<Utc>,
}
