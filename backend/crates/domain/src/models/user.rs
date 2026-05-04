use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "user_role", rename_all = "lowercase")]
pub enum UserRole {
    Owner,
    Manager,
    Cashier,
    Waiter,
    Chef,
}

impl ToString for UserRole {
    fn to_string(&self) -> String {
        match self {
            UserRole::Owner => "owner".to_string(),
            UserRole::Manager => "manager".to_string(),
            UserRole::Cashier => "cashier".to_string(),
            UserRole::Waiter => "waiter".to_string(),
            UserRole::Chef => "chef".to_string(),
        }
    }
}

impl From<String> for UserRole {
    fn from(s: String) -> Self {
        match s.as_str() {
            "owner" => UserRole::Owner,
            "manager" => UserRole::Manager,
            "waiter" => UserRole::Waiter,
            "chef" => UserRole::Chef,
            _ => UserRole::Cashier,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub branch_id: Option<Uuid>,
    pub email: String,
    pub password_hash: String,
    pub full_name: String,
    pub role: UserRole,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
