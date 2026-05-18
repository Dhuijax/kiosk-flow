use domain::models::inventory::{Inventory, InventoryTransaction};
use domain::models::waste::WasteLog;
use infra::recipe_repository::RecipeRepository;
use infra::repository::{IngredientRepository, InventoryRepository, ProductRepository};
use infra::security::Claims;
use infra::waste_repository::WasteRepository;
use proto_gen::inventory::{
    inventory_service_server::InventoryService, GetStockHistoryRequest, GetStockRequest,
    ListStockRequest, ListStockResponse, ListWasteLogsRequest, ListWasteLogsResponse,
    LogWasteRequest, LogWasteResponse, StockHistoryEntry, StockHistoryResponse, StockItem,
    UpdateStockRequest, WasteLogItem,
};
use sqlx::types::BigDecimal;
use std::sync::Arc;
use tonic::{Request, Response, Status};
use uuid::Uuid;

pub struct InventoryServiceImpl {
    inventory_repo: Arc<InventoryRepository>,
    recipe_repo: Arc<RecipeRepository>,
    waste_repo: Arc<WasteRepository>,
    product_repo: Arc<ProductRepository>,
    ingredient_repo: Arc<IngredientRepository>,
}

impl InventoryServiceImpl {
    pub fn new(
        inventory_repo: Arc<InventoryRepository>,
        recipe_repo: Arc<RecipeRepository>,
        waste_repo: Arc<WasteRepository>,
        product_repo: Arc<ProductRepository>,
        ingredient_repo: Arc<IngredientRepository>,
    ) -> Self {
        Self {
            inventory_repo,
            recipe_repo,
            waste_repo,
            product_repo,
            ingredient_repo,
        }
    }

    fn get_auth_info<T>(&self, request: &Request<T>) -> Result<(Uuid, Uuid), Status> {
        let claims = request
            .extensions()
            .get::<Claims>()
            .ok_or_else(|| Status::unauthenticated("Unauthorized"))?;

        let tenant_id = Uuid::parse_str(&claims.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant id"))?;
        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| Status::invalid_argument("Invalid user id"))?;

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

        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;
        let product_id = Uuid::parse_str(&req.product_id)
            .map_err(|_| Status::invalid_argument("Invalid product_id"))?;

        let stock = self
            .inventory_repo
            .get_stock(&tenant_id, &branch_id, Some(product_id), None)
            .await
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

        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;
        let product_id = Uuid::parse_str(&req.product_id)
            .map_err(|_| Status::invalid_argument("Invalid product_id"))?;

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
            "waste" => InventoryTransactionType::Waste,
            _ => return Err(Status::invalid_argument("Invalid transaction type")),
        };

        let updated = self
            .inventory_repo
            .update_stock(
                &tenant_id,
                &branch_id,
                Some(product_id),
                None,
                &change,
                trx_type,
                None,
                req.note,
                Some(user_id),
            )
            .await
            .map_err(|e| Status::internal(format!("Failed to update stock: {}", e)))?;

        Ok(Response::new(to_proto_stock(updated)))
    }

    async fn list_stock(
        &self,
        request: Request<ListStockRequest>,
    ) -> Result<Response<ListStockResponse>, Status> {
        let (tenant_id, _) = self.get_auth_info(&request)?;
        let req = request.into_inner();
        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;

        let items = self
            .inventory_repo
            .list_stock(&tenant_id, &branch_id, req.low_stock_only.unwrap_or(false))
            .await
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
        let (tenant_id, _) = self.get_auth_info(&request)?;
        let req = request.into_inner();

        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;
        let product_id = Uuid::parse_str(&req.product_id)
            .map_err(|_| Status::invalid_argument("Invalid product_id"))?;

        let history = self
            .inventory_repo
            .get_history(&tenant_id, &branch_id, Some(product_id), None)
            .await
            .map_err(|e| Status::internal(format!("Failed to fetch history: {}", e)))?;

        Ok(Response::new(StockHistoryResponse {
            entries: history.into_iter().map(to_proto_history).collect(),
            pagination: None,
        }))
    }

    async fn log_waste(
        &self,
        request: Request<LogWasteRequest>,
    ) -> Result<Response<LogWasteResponse>, Status> {
        let (tenant_id, user_id) = self.get_auth_info(&request)?;
        let req = request.into_inner();

        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;

        let product_id = req
            .product_id
            .as_ref()
            .map(|s| Uuid::parse_str(s))
            .transpose()
            .map_err(|_| Status::invalid_argument("Invalid product_id"))?;

        let ingredient_id = req
            .ingredient_id
            .as_ref()
            .map(|s| Uuid::parse_str(s))
            .transpose()
            .map_err(|_| Status::invalid_argument("Invalid ingredient_id"))?;

        if (product_id.is_some() && ingredient_id.is_some())
            || (product_id.is_none() && ingredient_id.is_none())
        {
            return Err(Status::invalid_argument(
                "Must specify exactly one of product_id or ingredient_id",
            ));
        }

        use std::str::FromStr;
        let quantity_wasted = BigDecimal::from_str(&req.quantity.to_string())
            .map_err(|_| Status::invalid_argument("Invalid quantity"))?;

        if quantity_wasted <= BigDecimal::from(0) {
            return Err(Status::invalid_argument(
                "Quantity must be greater than zero",
            ));
        }

        let mut calculated_cost = BigDecimal::from(0);
        let waste_log_id = Uuid::new_v4();

        use domain::models::inventory::InventoryTransactionType;

        if let Some(pid) = product_id {
            // Check if product exists
            let product = self
                .product_repo
                .find_by_id(&tenant_id, &pid)
                .await
                .map_err(|e| Status::internal(format!("DB error fetching product: {}", e)))?
                .ok_or_else(|| Status::not_found("Product not found"))?;

            // Fetch BOM recipe
            let recipe = self
                .recipe_repo
                .get_recipe_for_product(&tenant_id, &pid)
                .await
                .map_err(|e| Status::internal(format!("DB error fetching recipe: {}", e)))?;

            if !recipe.is_empty() {
                // Scenario A1: Has Recipe BOM. Deduct ingredients.
                for item in recipe {
                    let recipe_qty = item.quantity;
                    let ingredient_change = -(&recipe_qty * &quantity_wasted);

                    // Fetch ingredient to compute cost
                    if let Some(ing) = self
                        .ingredient_repo
                        .find_by_id(&tenant_id, &item.ingredient_id)
                        .await
                        .ok()
                        .flatten()
                    {
                        let ing_cost = &ing.cost_price;
                        calculated_cost += &recipe_qty * &quantity_wasted * ing_cost;
                    }

                    // Update inventory
                    self.inventory_repo
                        .update_stock(
                            &tenant_id,
                            &branch_id,
                            None,
                            Some(item.ingredient_id),
                            &ingredient_change,
                            InventoryTransactionType::Waste,
                            Some(waste_log_id),
                            Some(format!(
                                "Recipe BOM deduction for wasted product: {}",
                                product.name
                            )),
                            Some(user_id),
                        )
                        .await
                        .map_err(|e| {
                            Status::internal(format!("Failed to deduct ingredient stock: {}", e))
                        })?;
                }
            } else {
                // Scenario A2: No recipe BOM. Direct product stock update.
                let change = -&quantity_wasted;
                self.inventory_repo
                    .update_stock(
                        &tenant_id,
                        &branch_id,
                        Some(pid),
                        None,
                        &change,
                        InventoryTransactionType::Waste,
                        Some(waste_log_id),
                        req.note.clone(),
                        Some(user_id),
                    )
                    .await
                    .map_err(|e| {
                        Status::internal(format!("Failed to update product stock: {}", e))
                    })?;

                calculated_cost = &product.cost_price * &quantity_wasted;
            }
        } else if let Some(iid) = ingredient_id {
            // Check if ingredient exists
            let ingredient = self
                .ingredient_repo
                .find_by_id(&tenant_id, &iid)
                .await
                .map_err(|e| Status::internal(format!("DB error fetching ingredient: {}", e)))?
                .ok_or_else(|| Status::not_found("Ingredient not found"))?;

            // Direct ingredient stock update
            let change = -&quantity_wasted;
            self.inventory_repo
                .update_stock(
                    &tenant_id,
                    &branch_id,
                    None,
                    Some(iid),
                    &change,
                    InventoryTransactionType::Waste,
                    Some(waste_log_id),
                    req.note.clone(),
                    Some(user_id),
                )
                .await
                .map_err(|e| {
                    Status::internal(format!("Failed to update ingredient stock: {}", e))
                })?;

            calculated_cost = &ingredient.cost_price * &quantity_wasted;
        }

        // Validate reason
        let reason = req.reason.to_uppercase();
        match reason.as_str() {
            "WRONG_RECIPE" | "SPOILED" | "DAMAGED" | "EXPIRED" | "OTHER" => {}
            _ => return Err(Status::invalid_argument("Invalid waste reason")),
        }

        // Save log
        let waste_log = WasteLog {
            id: waste_log_id,
            tenant_id,
            branch_id,
            ingredient_id,
            product_id,
            quantity: quantity_wasted,
            reason,
            cost: calculated_cost.clone(),
            note: req.note,
            created_by: Some(user_id),
            created_at: chrono::Utc::now(),
        };

        self.waste_repo
            .create_waste_log(&waste_log)
            .await
            .map_err(|e| Status::internal(format!("Failed to save waste log: {}", e)))?;

        Ok(Response::new(LogWasteResponse {
            waste_log_id: waste_log_id.to_string(),
            success: true,
            calculated_cost: calculated_cost.to_string().parse().unwrap_or(0.0),
        }))
    }

    async fn list_waste_logs(
        &self,
        request: Request<ListWasteLogsRequest>,
    ) -> Result<Response<ListWasteLogsResponse>, Status> {
        let (tenant_id, _) = self.get_auth_info(&request)?;
        let req = request.into_inner();

        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;

        let pagination = req
            .pagination
            .unwrap_or(proto_gen::common::PaginationRequest {
                page: 1,
                page_size: 50,
            });

        let limit = pagination.page_size as i64;
        let offset = ((pagination.page - 1) * pagination.page_size) as i64;

        // Fetch logs
        let logs = self
            .waste_repo
            .list_waste_logs(&tenant_id, &branch_id, req.reason, limit, offset)
            .await
            .map_err(|e| Status::internal(format!("Failed to list waste logs: {}", e)))?;

        // Map to proto
        let items = logs
            .into_iter()
            .map(|log| WasteLogItem {
                id: log.id.to_string(),
                branch_id: log.branch_id.to_string(),
                product_id: log.product_id.map(|id| id.to_string()),
                ingredient_id: log.ingredient_id.map(|id| id.to_string()),
                product_name: log.product_name.unwrap_or_default(),
                ingredient_name: log.ingredient_name.unwrap_or_default(),
                quantity: log.quantity.to_string().parse().unwrap_or(0.0),
                reason: log.reason,
                cost: log.cost.to_string().parse().unwrap_or(0.0),
                note: log.note,
                created_by: log.created_by.map(|id| id.to_string()).unwrap_or_default(),
                created_at: log.created_at.to_rfc3339(),
            })
            .collect();

        Ok(Response::new(ListWasteLogsResponse {
            items,
            pagination: None,
        }))
    }
}
