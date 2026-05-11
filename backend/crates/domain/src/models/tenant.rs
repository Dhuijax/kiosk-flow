use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tenant {
    pub id: Uuid,
    pub name: String,
    pub subdomain: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TenantSettings {
    pub tenant_id: Uuid,
    pub theme_color: String,
    pub logo_url: Option<String>,
    pub kiosk_timeout_seconds: i32,
    pub language: String,
    pub currency: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Branch {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub is_main: bool,
    pub created_at: DateTime<Utc>,
}
