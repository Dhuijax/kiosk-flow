use proto_gen::recipe::{
    recipe_service_server::RecipeService,
    GetRecipeRequest, GetRecipeResponse, SetRecipeRequest, SetRecipeResponse,
    ProductIngredient as ProtoProductIngredient,
};
use infra::recipe_repository::RecipeRepository;
use std::sync::Arc;
use tonic::{Request, Response, Status};
use uuid::Uuid;
use bigdecimal::BigDecimal;
use proto_gen::common::SuccessResponse;

pub struct RecipeServiceImpl {
    repo: Arc<RecipeRepository>,
}

impl RecipeServiceImpl {
    pub fn new(repo: Arc<RecipeRepository>) -> Self {
        Self { repo }
    }

    fn to_proto(&self, item: domain::models::recipe::ProductIngredient) -> ProtoProductIngredient {
        ProtoProductIngredient {
            id: item.id.to_string(),
            product_id: item.product_id.to_string(),
            ingredient_id: item.ingredient_id.to_string(),
            ingredient_name: item.ingredient_name,
            unit: item.unit,
            quantity: item.quantity.to_f64().unwrap_or(0.0), // using f64 for simplicity in proto
            is_customizable: item.is_customizable,
        }
    }
}

use bigdecimal::ToPrimitive;
use std::str::FromStr;

#[tonic::async_trait]
impl RecipeService for RecipeServiceImpl {
    async fn get_recipe(
        &self,
        request: Request<GetRecipeRequest>,
    ) -> Result<Response<GetRecipeResponse>, Status> {
        let tenant_id = Uuid::parse_str(
            request
                .metadata()
                .get("x-tenant-id")
                .ok_or_else(|| Status::unauthenticated("Tenant ID missing"))?
                .to_str()
                .map_err(|_| Status::invalid_argument("Invalid Tenant ID"))?,
        )
        .map_err(|_| Status::invalid_argument("Invalid Tenant ID format"))?;

        let product_id = Uuid::parse_str(&request.into_inner().product_id)
            .map_err(|_| Status::invalid_argument("Invalid Product ID format"))?;

        let ingredients = self
            .repo
            .get_recipe_for_product(&tenant_id, &product_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(GetRecipeResponse {
            ingredients: ingredients.into_iter().map(|i| self.to_proto(i)).collect(),
        }))
    }

    async fn set_recipe(
        &self,
        request: Request<SetRecipeRequest>,
    ) -> Result<Response<SetRecipeResponse>, Status> {
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
        let product_id = Uuid::parse_str(&req.product_id)
            .map_err(|_| Status::invalid_argument("Invalid Product ID format"))?;

        let mut items = Vec::new();
        for item in req.ingredients {
            let ing_id = Uuid::parse_str(&item.ingredient_id)
                .map_err(|_| Status::invalid_argument("Invalid Ingredient ID format"))?;
            let qty = BigDecimal::from_str(&item.quantity.to_string())
                .map_err(|_| Status::invalid_argument("Invalid quantity"))?;
            items.push((ing_id, qty, item.is_customizable));
        }

        self.repo
            .set_recipe_for_product(&tenant_id, &product_id, &items)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(SetRecipeResponse {
            success: Some(SuccessResponse {
                success: true,
                message: "Recipe updated successfully".to_string(),
            }),
        }))
    }
}
