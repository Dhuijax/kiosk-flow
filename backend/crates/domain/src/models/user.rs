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

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            UserRole::Owner => "owner",
            UserRole::Manager => "manager",
            UserRole::Cashier => "cashier",
            UserRole::Waiter => "waiter",
            UserRole::Chef => "chef",
        };
        write!(f, "{}", s)
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
