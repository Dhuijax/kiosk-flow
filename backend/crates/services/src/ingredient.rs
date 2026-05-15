use proto_gen::ingredient::{
    ingredient_service_server::IngredientService,
    CreateIngredientRequest, DeleteIngredientRequest, GetIngredientRequest, Ingredient as ProtoIngredient,
    ListIngredientsRequest, ListIngredientsResponse, UpdateIngredientRequest,
};
use domain::models::ingredient::Ingredient as DomainIngredient;
use infra::repository::IngredientRepository;
use std::sync::Arc;
use std::str::FromStr;
use tonic::{Request, Response, Status};
use uuid::Uuid;
use bigdecimal::BigDecimal;
use proto_gen::common::{Money, SuccessResponse, PaginationResponse};

pub struct IngredientServiceImpl {
    repo: Arc<IngredientRepository>,
}

impl IngredientServiceImpl {
    pub fn new(repo: Arc<IngredientRepository>) -> Self {
        Self { repo }
    }

    fn from_money_proto(&self, m: Option<Money>) -> BigDecimal {
        if let Some(money) = m {
            let str_val = format!("{}.{:09}", money.units, money.nanos.abs());
            BigDecimal::from_str(&str_val).unwrap_or_default()
        } else {
            BigDecimal::from_str("0").unwrap()
        }
    }

    fn to_money_proto(&self, b: &BigDecimal) -> Option<Money> {
        let str_val = b.to_string();
        let parts: Vec<&str> = str_val.split('.').collect();
        let units = parts[0].parse::<i64>().unwrap_or(0);
        let nanos = if parts.len() > 1 {
            let mut n_str = parts[1].to_string();
            while n_str.len() < 9 {
                n_str.push('0');
            }
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

    fn to_proto(&self, ingredient: DomainIngredient) -> ProtoIngredient {
        ProtoIngredient {
            id: ingredient.id.to_string(),
            name: ingredient.name,
            unit: ingredient.unit,
            cost_price: self.to_money_proto(&ingredient.cost_price),
            is_active: ingredient.is_active,
            created_at: ingredient.created_at.to_rfc3339(),
            updated_at: ingredient.updated_at.to_rfc3339(),
        }
    }
}

#[tonic::async_trait]
impl IngredientService for IngredientServiceImpl {
    async fn list_ingredients(
        &self,
        request: Request<ListIngredientsRequest>,
    ) -> Result<Response<ListIngredientsResponse>, Status> {
        let tenant_id = Uuid::parse_str(
            request
                .metadata()
                .get("x-tenant-id")
                .ok_or_else(|| Status::unauthenticated("Tenant ID missing"))?
                .to_str()
                .map_err(|_| Status::invalid_argument("Invalid Tenant ID"))?,
        )
        .map_err(|_| Status::invalid_argument("Invalid Tenant ID format"))?;

        let req = request.into_inner();
        let ingredients = self
            .repo
            .list_by_tenant(&tenant_id, req.search)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(ListIngredientsResponse {
            ingredients: ingredients.into_iter().map(|i| self.to_proto(i)).collect(),
            pagination: Some(PaginationResponse {
                total_count: 0,
                total_pages: 0,
                has_next: false,
            }),
        }))
    }

    async fn get_ingredient(
        &self,
        request: Request<GetIngredientRequest>,
    ) -> Result<Response<ProtoIngredient>, Status> {
        let tenant_id = Uuid::parse_str(
            request
                .metadata()
                .get("x-tenant-id")
                .ok_or_else(|| Status::unauthenticated("Tenant ID missing"))?
                .to_str()
                .map_err(|_| Status::invalid_argument("Invalid Tenant ID"))?,
        )
        .map_err(|_| Status::invalid_argument("Invalid Tenant ID format"))?;

        let id = Uuid::parse_str(&request.into_inner().id)
            .map_err(|_| Status::invalid_argument("Invalid ID format"))?;

        let ingredient = self
            .repo
            .find_by_id(&tenant_id, &id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::not_found("Ingredient not found"))?;

        Ok(Response::new(self.to_proto(ingredient)))
    }

    async fn create_ingredient(
        &self,
        request: Request<CreateIngredientRequest>,
    ) -> Result<Response<ProtoIngredient>, Status> {
        let tenant_id = Uuid::parse_str(
            request
                .metadata()
                .get("x-tenant-id")
                .ok_or_else(|| Status::unauthenticated("Tenant ID missing"))?
                .to_str()
                .map_err(|_| Status::invalid_argument("Invalid Tenant ID"))?,
        )
        .map_err(|_| Status::invalid_argument("Invalid Tenant ID format"))?;

        let req = request.into_inner();
        let cost_price = self.from_money_proto(req.cost_price);

        let ingredient = DomainIngredient {
            id: Uuid::new_v4(),
            tenant_id,
            name: req.name,
            unit: req.unit,
            cost_price,
            is_active: req.is_active,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let created = self
            .repo
            .create(&ingredient)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(self.to_proto(created)))
    }

    async fn update_ingredient(
        &self,
        request: Request<UpdateIngredientRequest>,
    ) -> Result<Response<ProtoIngredient>, Status> {
        let tenant_id = Uuid::parse_str(
            request
                .metadata()
                .get("x-tenant-id")
                .ok_or_else(|| Status::unauthenticated("Tenant ID missing"))?
                .to_str()
                .map_err(|_| Status::invalid_argument("Invalid Tenant ID"))?,
        )
        .map_err(|_| Status::invalid_argument("Invalid Tenant ID format"))?;

        let req = request.into_inner();
        let id = Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid ID format"))?;

        let cost_price = if let Some(_) = req.cost_price {
            Some(self.from_money_proto(req.cost_price))
        } else {
            None
        };

        let updated = self
            .repo
            .update(&tenant_id, &id, req.name, req.unit, cost_price, req.is_active)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(self.to_proto(updated)))
    }

    async fn delete_ingredient(
        &self,
        request: Request<DeleteIngredientRequest>,
    ) -> Result<Response<SuccessResponse>, Status> {
        let tenant_id = Uuid::parse_str(
            request
                .metadata()
                .get("x-tenant-id")
                .ok_or_else(|| Status::unauthenticated("Tenant ID missing"))?
                .to_str()
                .map_err(|_| Status::invalid_argument("Invalid Tenant ID"))?,
        )
        .map_err(|_| Status::invalid_argument("Invalid Tenant ID format"))?;

        let id = Uuid::parse_str(&request.into_inner().id)
            .map_err(|_| Status::invalid_argument("Invalid ID format"))?;

        self.repo
            .delete(&tenant_id, &id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(SuccessResponse {
            success: true,
            message: "Ingredient deleted".to_string(),
        }))
    }
}
