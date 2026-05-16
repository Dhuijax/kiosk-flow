use tonic::{Request, Response, Status};
use proto_gen::inventory::{
    inventory_service_server::InventoryService,
    StockItem, GetStockRequest, UpdateStockRequest, ListStockRequest, ListStockResponse,
    GetStockHistoryRequest, StockHistoryResponse, StockHistoryEntry
};
use std::sync::Arc;
use infra::repository::InventoryRepository;
use domain::models::inventory::{Inventory, InventoryTransaction};
use uuid::Uuid;
use infra::security::Claims;
use sqlx::types::BigDecimal;

pub struct InventoryServiceImpl {
    inventory_repo: Arc<InventoryRepository>,
}

impl InventoryServiceImpl {
    pub fn new(inventory_repo: Arc<InventoryRepository>) -> Self {
        Self { inventory_repo }
    }

    fn get_auth_info<T>(&self, request: &Request<T>) -> Result<(Uuid, Uuid), Status> {
        let claims = request
            .extensions()
            .get::<Claims>()
            .ok_or_else(|| Status::unauthenticated("Unauthorized"))?;
        
        let tenant_id = Uuid::parse_str(&claims.tenant_id).map_err(|_| Status::invalid_argument("Invalid tenant id"))?;
        let user_id = Uuid::parse_str(&claims.sub).map_err(|_| Status::invalid_argument("Invalid user id"))?;
        
        Ok((tenant_id, user_id))
    }
}

fn to_proto_stock(i: Inventory) -> StockItem {
    StockItem {
        id: i.id.to_string(),
        product_id: i.product_id.map(|id| id.to_string()).unwrap_or_default(),
        branch_id: i.branch_id.to_string(),
        quantity: i.quantity.to_string().parse().unwrap_or(0.0),
        min_quantity: i.min_quantity.to_string().parse().unwrap_or(0.0),
        updated_at: i.updated_at.to_rfc3339(),
    }
}

fn to_proto_history(h: InventoryTransaction) -> StockHistoryEntry {
    StockHistoryEntry {
        id: h.id.to_string(),
        product_id: h.product_id.map(|id| id.to_string()).unwrap_or_default(),
        r#type: format!("{:?}", h.r#type).to_lowercase(),
        quantity_change: h.quantity_change.to_string().parse().unwrap_or(0.0),
        reference_id: h.reference_id.map(|id| id.to_string()),
        note: h.note,
        created_at: h.created_at.to_rfc3339(),
        created_by: h.created_by.map(|id| id.to_string()).unwrap_or_default(),
    }
}

#[tonic::async_trait]
impl InventoryService for InventoryServiceImpl {
    async fn get_stock(
        &self,
        request: Request<GetStockRequest>,
    ) -> Result<Response<StockItem>, Status> {
        let (tenant_id, _) = self.get_auth_info(&request)?;
        let req = request.into_inner();
        
        let branch_id = Uuid::parse_str(&req.branch_id).map_err(|_| Status::invalid_argument("Invalid branch_id"))?;
        let product_id = Uuid::parse_str(&req.product_id).map_err(|_| Status::invalid_argument("Invalid product_id"))?;

        let stock = self.inventory_repo.get_stock(&tenant_id, &branch_id, Some(product_id), None).await
            .map_err(|e| Status::internal(format!("DB error: {}", e)))?
            .ok_or_else(|| Status::not_found("Stock record not found"))?;

        Ok(Response::new(to_proto_stock(stock)))
    }

    async fn update_stock(
        &self,
        request: Request<UpdateStockRequest>,
    ) -> Result<Response<StockItem>, Status> {
        let (tenant_id, user_id) = self.get_auth_info(&request)?;
        let req = request.into_inner();

        let branch_id = Uuid::parse_str(&req.branch_id).map_err(|_| Status::invalid_argument("Invalid branch_id"))?;
        let product_id = Uuid::parse_str(&req.product_id).map_err(|_| Status::invalid_argument("Invalid product_id"))?;
        
        // Convert f64 to BigDecimal via string to preserve precision
        use std::str::FromStr;
        let change = BigDecimal::from_str(&req.quantity_change.to_string())
            .map_err(|_| Status::invalid_argument("Invalid quantity change"))?;

        use domain::models::inventory::InventoryTransactionType;
        let trx_type = match req.r#type.to_lowercase().as_str() {
            "sale" => InventoryTransactionType::Sale,
            "purchase" => InventoryTransactionType::Purchase,
            "adjustment" => InventoryTransactionType::Adjustment,
            "transfer" => InventoryTransactionType::Transfer,
            "return" => InventoryTransactionType::Return,
            _ => return Err(Status::invalid_argument("Invalid transaction type")),
        };

        let updated = self.inventory_repo.update_stock(
            &tenant_id,
            &branch_id,
            Some(product_id),
            None,
            &change,
            trx_type,
            None,
            req.note,
            Some(user_id)
        ).await.map_err(|e| Status::internal(format!("Failed to update stock: {}", e)))?;

        Ok(Response::new(to_proto_stock(updated)))
    }

    async fn list_stock(
        &self,
        request: Request<ListStockRequest>,
    ) -> Result<Response<ListStockResponse>, Status> {
        let (tenant_id, _) = self.get_auth_info(&request)?;
        let req = request.into_inner();
        let branch_id = Uuid::parse_str(&req.branch_id).map_err(|_| Status::invalid_argument("Invalid branch_id"))?;

        let items = self.inventory_repo.list_stock(&tenant_id, &branch_id, req.low_stock_only.unwrap_or(false)).await
            .map_err(|e| Status::internal(format!("Failed to list stock: {}", e)))?;

        Ok(Response::new(ListStockResponse {
            items: items.into_iter().map(to_proto_stock).collect(),
            pagination: None,
        }))
    }

    async fn get_stock_history(
        &self,
        request: Request<GetStockHistoryRequest>,
    ) -> Result<Response<StockHistoryResponse>, Status> {
        // Wait, I used StockHistoryHistoryResponse in proto? No, StockHistoryResponse.
        // Let's re-check proto-gen generated names if build succeeds.
        // I'll proceed with StockHistoryResponse and fix if needed.
        let (tenant_id, _) = self.get_auth_info(&request)?;
        let req = request.into_inner();
        
        let branch_id = Uuid::parse_str(&req.branch_id).map_err(|_| Status::invalid_argument("Invalid branch_id"))?;
        let product_id = Uuid::parse_str(&req.product_id).map_err(|_| Status::invalid_argument("Invalid product_id"))?;

        let history = self.inventory_repo.get_history(&tenant_id, &branch_id, Some(product_id), None).await
            .map_err(|e| Status::internal(format!("Failed to fetch history: {}", e)))?;

        Ok(Response::new(StockHistoryResponse {
            entries: history.into_iter().map(to_proto_history).collect(),
            pagination: None,
        }))
    }
}
