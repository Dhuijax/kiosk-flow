use tonic::{Request, Response, Status};
use proto_gen::product::{
    product_service_server::ProductService,
    Product as ProtoProduct, Topping as ProtoTopping,
    ListProductsRequest, ListProductsResponse, GetProductRequest,
    CreateProductRequest, UpdateProductRequest, DeleteProductRequest,
    ListToppingsResponse, CreateToppingRequest, DeleteToppingRequest,
};
use proto_gen::common::{PaginationRequest, PaginationResponse, Money, SuccessResponse};
use std::sync::Arc;
use infra::repository::{ProductRepository, ToppingRepository};
use domain::models::product::{Product as DomainProduct, Topping as DomainTopping};
use uuid::Uuid;
use infra::security::Claims;
use std::str::FromStr;

pub struct ProductServiceImpl {
    product_repo: Arc<ProductRepository>,
    topping_repo: Arc<ToppingRepository>,
}

impl ProductServiceImpl {
    pub fn new(product_repo: Arc<ProductRepository>, topping_repo: Arc<ToppingRepository>) -> Self {
        Self { product_repo, topping_repo }
    }

    fn get_tenant_id<T>(&self, request: &Request<T>) -> Result<Uuid, Status> {
        let claims = request
            .extensions()
            .get::<Claims>()
            .ok_or_else(|| Status::unauthenticated("Unauthorized: Missing or invalid token"))?;
        Uuid::parse_str(&claims.tenant_id).map_err(|_| Status::invalid_argument("Invalid tenant id in token"))
    }
}

// Convert from Money proto
fn from_money_proto(m: Option<Money>) -> sqlx::types::BigDecimal {
    if let Some(money) = m {
        // Very simplistic conversion: units + nanos
        let str_val = format!("{}.{:09}", money.units, money.nanos.abs());
        sqlx::types::BigDecimal::from_str(&str_val).unwrap_or_default()
    } else {
        sqlx::types::BigDecimal::from_str("0").unwrap()
    }
}

// Convert to Money proto
fn to_money_proto(b: &sqlx::types::BigDecimal) -> Option<Money> {
    // For simplicity, just return 0 if conversion is too complex without rust_decimal natively,
    // assuming strings can be parsed instead. Wait, Money proto:
    // We'll just cast to f64 for the split.
    let str_val = b.to_string();
    let parts: Vec<&str> = str_val.split('.').collect();
    let units = parts[0].parse::<i64>().unwrap_or(0);
    let nanos = if parts.len() > 1 {
        // pad right with zeros up to 9 chars
        let mut n_str = parts[1].to_string();
        while n_str.len() < 9 { n_str.push('0'); }
        n_str[0..9].parse::<i32>().unwrap_or(0)
    } else {
        0
    };

    Some(Money {
        currency_code: "VND".to_string(),
        units,
        nanos,
    })
}

fn to_proto_product(p: DomainProduct) -> ProtoProduct {
    ProtoProduct {
        id: p.id.to_string(),
        category_id: p.category_id.map(|id| id.to_string()),
        sku: p.sku.unwrap_or_default(),
        name: p.name,
        description: p.description,
        price: to_money_proto(&p.price),
        cost_price: to_money_proto(&p.cost_price),
        unit: p.unit,
        image_url: p.image_url,
        is_active: p.is_active,
        allow_topping: p.allow_topping,
        track_inventory: p.track_inventory,
        toppings: vec![], // To be filled if eager loading
    }
}

fn to_proto_topping(t: DomainTopping) -> ProtoTopping {
    ProtoTopping {
        id: t.id.to_string(),
        name: t.name,
        price: to_money_proto(&t.price),
        is_active: t.is_active,
    }
}

#[tonic::async_trait]
impl ProductService for ProductServiceImpl {
    async fn list_products(
        &self,
        request: Request<ListProductsRequest>,
    ) -> Result<Response<ListProductsResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();
        let cat_opt = req.category_id.map(|c| Uuid::parse_str(&c).unwrap_or_default());
        let search_opt = req.search_query;
        
        let products = self.product_repo.list_by_tenant(&tenant_id, cat_opt, search_opt)
            .await
            .map_err(|e| Status::internal(format!("DB Error: {}", e)))?;

        Ok(Response::new(ListProductsResponse {
            products: products.into_iter().map(to_proto_product).collect(),
            pagination: Some(PaginationResponse {
                total_count: 0, total_pages: 0, has_next: false
            })
        }))
    }

    async fn get_product(
        &self,
        request: Request<GetProductRequest>,
    ) -> Result<Response<ProtoProduct>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let id = Uuid::parse_str(&request.into_inner().id).map_err(|_| Status::invalid_argument("Invalid ID format"))?;

        let product = self.product_repo.find_by_id(&tenant_id, &id)
            .await
            .map_err(|e| Status::internal(format!("DB error: {}", e)))?
            .ok_or_else(|| Status::not_found("Product not found"))?;

        Ok(Response::new(to_proto_product(product)))
    }

    async fn create_product(
        &self,
        request: Request<CreateProductRequest>,
    ) -> Result<Response<ProtoProduct>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();

        let new_prod = DomainProduct {
            id: Uuid::new_v4(),
            tenant_id,
            category_id: req.category_id.map(|id| Uuid::parse_str(&id).unwrap_or_default()),
            sku: Some(req.sku),
            name: req.name,
            description: req.description,
            price: from_money_proto(req.price),
            cost_price: from_money_proto(req.cost_price),
            unit: req.unit,
            image_url: req.image_url,
            is_active: req.is_active,
            allow_topping: req.allow_topping,
            track_inventory: req.track_inventory,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let topping_ids: Vec<Uuid> = req.topping_ids.iter()
            .map(|id| Uuid::parse_str(id).unwrap_or_default())
            .collect();

        let created = self.product_repo.create(&new_prod, &topping_ids)
            .await
            .map_err(|e| Status::internal(format!("Failed to create product: {}", e)))?;

        Ok(Response::new(to_proto_product(created)))
    }

    async fn update_product(
        &self,
        request: Request<UpdateProductRequest>,
    ) -> Result<Response<ProtoProduct>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();
        let id = Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid ID format"))?;

        let updated_prod = DomainProduct {
            id,
            tenant_id,
            category_id: req.category_id.map(|cid| Uuid::parse_str(&cid).unwrap_or_default()),
            sku: req.sku,
            name: req.name.unwrap_or_default(),
            description: req.description,
            price: from_money_proto(req.price),
            cost_price: from_money_proto(req.cost_price),
            unit: req.unit,
            image_url: req.image_url,
            is_active: req.is_active.unwrap_or(true),
            allow_topping: req.allow_topping.unwrap_or(false),
            track_inventory: req.track_inventory.unwrap_or(false),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let topping_ids: Vec<Uuid> = req.topping_ids.iter()
            .map(|id| Uuid::parse_str(id).unwrap_or_default())
            .collect();

        let updated = self.product_repo.update(&tenant_id, &id, &updated_prod, Some(&topping_ids))
            .await
            .map_err(|e| Status::internal(format!("Failed to update product: {}", e)))?;

        Ok(Response::new(to_proto_product(updated)))
    }

    async fn delete_product(
        &self,
        request: Request<DeleteProductRequest>,
    ) -> Result<Response<SuccessResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let id = Uuid::parse_str(&request.into_inner().id).map_err(|_| Status::invalid_argument("Invalid ID format"))?;

        self.product_repo.delete(&tenant_id, &id)
            .await
            .map_err(|_| Status::internal("Failed to delete product"))?;

        Ok(Response::new(SuccessResponse { success: true, message: "Product deleted".to_string() }))
    }

    async fn list_toppings(
        &self,
        request: Request<PaginationRequest>,
    ) -> Result<Response<ListToppingsResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let toppings = self.topping_repo.list_by_tenant(&tenant_id)
            .await
            .map_err(|e| Status::internal(format!("DB error: {}", e)))?;

        Ok(Response::new(ListToppingsResponse {
            toppings: toppings.into_iter().map(to_proto_topping).collect(),
            pagination: Some(PaginationResponse { total_count: 0, total_pages: 0, has_next: false })
        }))
    }

    async fn create_topping(
        &self,
        request: Request<CreateToppingRequest>,
    ) -> Result<Response<ProtoTopping>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();

        let new_top = DomainTopping {
            id: Uuid::new_v4(),
            tenant_id,
            name: req.name,
            price: from_money_proto(req.price),
            is_active: req.is_active,
            created_at: chrono::Utc::now(),
        };

        let created = self.topping_repo.create(&new_top)
            .await
            .map_err(|e| Status::internal(format!("Failed to create topping: {}", e)))?;

        Ok(Response::new(to_proto_topping(created)))
    }

    async fn delete_topping(
        &self,
        request: Request<DeleteToppingRequest>,
    ) -> Result<Response<SuccessResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let id = Uuid::parse_str(&request.into_inner().id).map_err(|_| Status::invalid_argument("Invalid ID format"))?;

        self.topping_repo.delete(&tenant_id, &id)
            .await
            .map_err(|_| Status::internal("Failed to delete topping"))?;

        Ok(Response::new(SuccessResponse { success: true, message: "Topping deleted".to_string() }))
    }
}
