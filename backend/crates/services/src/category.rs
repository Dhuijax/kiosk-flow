use domain::models::category::Category as DomainCategory;
use infra::repository::CategoryRepository;
use infra::security::Claims;
use proto_gen::category::{
    category_service_server::CategoryService, Category, CreateCategoryRequest,
    DeleteCategoryRequest, GetCategoryRequest, ListCategoriesResponse, UpdateCategoryRequest,
};
use proto_gen::common::{PaginationRequest, PaginationResponse, SuccessResponse};
use std::sync::Arc;
use tonic::{Request, Response, Status};
use uuid::Uuid;

pub struct CategoryServiceImpl {
    category_repo: Arc<CategoryRepository>,
}

impl CategoryServiceImpl {
    pub fn new(category_repo: Arc<CategoryRepository>) -> Self {
        Self { category_repo }
    }

    fn get_tenant_id<T>(&self, request: &Request<T>) -> Result<Uuid, Status> {
        let claims = request
            .extensions()
            .get::<Claims>()
            .ok_or_else(|| Status::unauthenticated("Unauthorized: Missing or invalid token"))?;
        Uuid::parse_str(&claims.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant id in token"))
    }
}

fn to_proto_category(c: DomainCategory) -> Category {
    Category {
        id: c.id.to_string(),
        name: c.name,
        parent_id: c.parent_id.map(|id| id.to_string()),
    }
}

#[tonic::async_trait]
impl CategoryService for CategoryServiceImpl {
    async fn list_categories(
        &self,
        request: Request<PaginationRequest>,
    ) -> Result<Response<ListCategoriesResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let categories = self
            .category_repo
            .list_by_tenant(&tenant_id)
            .await
            .map_err(|e| Status::internal(format!("Failed to list categories: {}", e)))?;

        Ok(Response::new(ListCategoriesResponse {
            categories: categories.into_iter().map(to_proto_category).collect(),
            pagination: Some(PaginationResponse {
                total_count: 0,
                total_pages: 0,
                has_next: false,
            }),
        }))
    }

    async fn get_category(
        &self,
        request: Request<GetCategoryRequest>,
    ) -> Result<Response<Category>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();
        let id =
            Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid ID format"))?;

        let category = self
            .category_repo
            .find_by_id(&tenant_id, &id)
            .await
            .map_err(|e| Status::internal(format!("DB error: {}", e)))?
            .ok_or_else(|| Status::not_found("Category not found"))?;

        Ok(Response::new(to_proto_category(category)))
    }

    async fn create_category(
        &self,
        request: Request<CreateCategoryRequest>,
    ) -> Result<Response<Category>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();

        let parent_id = match req.parent_id {
            Some(pid) if !pid.is_empty() => Some(
                Uuid::parse_str(&pid)
                    .map_err(|_| Status::invalid_argument("Invalid parent_id format"))?,
            ),
            _ => None,
        };

        let new_cat = DomainCategory {
            id: Uuid::new_v4(),
            tenant_id,
            name: req.name,
            parent_id,
            created_at: chrono::Utc::now(),
        };

        let created = self
            .category_repo
            .create(&new_cat)
            .await
            .map_err(|e| Status::internal(format!("Failed to create category: {}", e)))?;

        Ok(Response::new(to_proto_category(created)))
    }

    async fn update_category(
        &self,
        request: Request<UpdateCategoryRequest>,
    ) -> Result<Response<Category>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();
        let id =
            Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid ID format"))?;

        let parent_id_opt = match req.parent_id {
            Some(pid) if pid.is_empty() => Some(None),
            Some(pid) => {
                Some(Some(Uuid::parse_str(&pid).map_err(|_| {
                    Status::invalid_argument("Invalid parent_id format")
                })?))
            }
            None => None,
        };

        let updated = self
            .category_repo
            .update(&tenant_id, &id, req.name, parent_id_opt)
            .await
            .map_err(|e| Status::internal(format!("Failed to update category: {}", e)))?;

        Ok(Response::new(to_proto_category(updated)))
    }

    async fn delete_category(
        &self,
        request: Request<DeleteCategoryRequest>,
    ) -> Result<Response<SuccessResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let id = Uuid::parse_str(&request.into_inner().id)
            .map_err(|_| Status::invalid_argument("Invalid ID format"))?;

        self.category_repo
            .delete(&tenant_id, &id)
            .await
            .map_err(|_| Status::internal("Failed to delete category"))?;

        Ok(Response::new(SuccessResponse {
            success: true,
            message: "Category deleted".to_string(),
        }))
    }
}
