use async_trait::async_trait;
use uuid::Uuid;
use crate::models::inventory::{Inventory, InventoryTransaction, InventoryTransactionType};
use crate::errors::DomainError;
use sqlx::types::BigDecimal;

#[async_trait]
pub trait InventoryRepository: Send + Sync {
    async fn get_stock(&self, branch_id: Uuid, product_id: Uuid) -> Result<Option<Inventory>, DomainError>;
    async fn update_stock(
        &self,
        branch_id: Uuid,
        product_id: Uuid,
        quantity_change: BigDecimal,
        r#type: InventoryTransactionType,
        reference_id: Option<Uuid>,
        note: Option<String>,
        created_by: Option<Uuid>,
    ) -> Result<Inventory, DomainError>;
    async fn list_stock(&self, branch_id: Uuid, low_stock_only: bool, page: i32, page_size: i32) -> Result<(Vec<Inventory>, i32), DomainError>;
    async fn get_history(&self, branch_id: Uuid, product_id: Uuid, page: i32, page_size: i32) -> Result<(Vec<InventoryTransaction>, i32), DomainError>;
}
