use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use sqlx::Type;

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[sqlx(type_name = "table_status", rename_all = "lowercase")]
pub enum TableStatus {
    Available,
    Occupied,
    Reserved,
    Cleaning,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FloorPlan {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub branch_id: Uuid,
    pub name: String,
    pub layout_data: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Table {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub branch_id: Uuid,
    pub floor_plan_id: Uuid,
    pub name: String,
    pub capacity: i32,
    pub position_x: i32,
    pub position_y: i32,
    pub status: TableStatus,
    pub current_order_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
