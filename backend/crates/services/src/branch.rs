use std::sync::Arc;
use tonic::{Request, Response, Status};
use uuid::Uuid;
use proto_gen::branch::{
    branch_service_server::BranchService,
    Branch, ListBranchesRequest, ListBranchesResponse, CreateBranchRequest, UpdateBranchRequest, DeleteBranchRequest, GetBranchRequest
};
use proto_gen::common::SuccessResponse;
use infra::repository::StoreRepository;
use infra::security::Claims;
use domain::models::tenant::Branch as DomainBranch;

pub struct BranchServiceImpl {
    store_repo: Arc<StoreRepository>,
}

impl BranchServiceImpl {
    pub fn new(store_repo: Arc<StoreRepository>) -> Self {
        Self { store_repo }
    }

    fn get_context<T>(&self, request: &Request<T>) -> Result<Uuid, Status> {
        let claims = request
            .extensions()
            .get::<Claims>()
            .ok_or_else(|| Status::unauthenticated("Unauthorized"))?;
        
        Uuid::parse_str(&claims.tenant_id).map_err(|_| Status::invalid_argument("Invalid tenant id"))
    }
}

#[tonic::async_trait]
impl BranchService for BranchServiceImpl {
    async fn list_branches(
        &self,
        request: Request<ListBranchesRequest>,
    ) -> Result<Response<ListBranchesResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        
        let branches = self.store_repo.list_branches(&tenant_id).await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(ListBranchesResponse {
            branches: branches.into_iter().map(|b| Branch {
                id: b.id.to_string(),
                tenant_id: b.tenant_id.to_string(),
                name: b.name,
                address: b.address,
                phone: b.phone,
                is_main: b.is_main,
                is_active: b.is_active,
                created_at: b.created_at.to_rfc3339(),
            }).collect(),
            pagination: None,
        }))
    }

    async fn create_branch(
        &self,
        request: Request<CreateBranchRequest>,
    ) -> Result<Response<Branch>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();

        let branch = DomainBranch {
            id: Uuid::new_v4(),
            tenant_id,
            name: req.name,
            address: req.address,
            phone: req.phone,
            is_main: req.is_main,
            is_active: req.is_active,
            created_at: chrono::Utc::now(),
        };

        let created = self.store_repo.create_branch(&branch).await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(Branch {
            id: created.id.to_string(),
            tenant_id: created.tenant_id.to_string(),
            name: created.name,
            address: created.address,
            phone: created.phone,
            is_main: created.is_main,
            is_active: created.is_active,
            created_at: created.created_at.to_rfc3339(),
        }))
    }

    async fn update_branch(
        &self,
        request: Request<UpdateBranchRequest>,
    ) -> Result<Response<Branch>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();
        let id = Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid branch id"))?;

        let updated = self.store_repo.update_branch(
            &tenant_id,
            &id,
            req.name,
            req.address,
            req.phone,
            req.is_main,
            req.is_active,
        ).await.map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(Branch {
            id: updated.id.to_string(),
            tenant_id: updated.tenant_id.to_string(),
            name: updated.name,
            address: updated.address,
            phone: updated.phone,
            is_main: updated.is_main,
            is_active: updated.is_active,
            created_at: updated.created_at.to_rfc3339(),
        }))
    }

    async fn delete_branch(
        &self,
        request: Request<DeleteBranchRequest>,
    ) -> Result<Response<SuccessResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();
        let id = Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid branch id"))?;

        self.store_repo.delete_branch(&tenant_id, &id).await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(SuccessResponse {
            success: true,
            message: "Branch deleted successfully".to_string(),
        }))
    }

    async fn get_branch(
        &self,
        request: Request<GetBranchRequest>,
    ) -> Result<Response<Branch>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();
        let id = Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid branch id"))?;

        let branch = self.store_repo.get_branch(&tenant_id, &id).await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::not_found("Branch not found"))?;

        Ok(Response::new(Branch {
            id: branch.id.to_string(),
            tenant_id: branch.tenant_id.to_string(),
            name: branch.name,
            address: branch.address,
            phone: branch.phone,
            is_main: branch.is_main,
            is_active: branch.is_active,
            created_at: branch.created_at.to_rfc3339(),
        }))
    }
}
