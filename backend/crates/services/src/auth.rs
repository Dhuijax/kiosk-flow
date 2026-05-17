use domain::models::tenant::Tenant;
use domain::models::user::{User, UserRole};
use infra::repository::{TenantRepository, UserRepository};
use infra::security::{Claims, SecurityService};
use proto_gen::auth::{
    auth_service_server::AuthService, AuthResponse, CreateStaffRequest, DeleteStaffRequest, Empty,
    ListStaffRequest, ListStaffResponse, LoginRequest, RefreshRequest, RegisterRequest,
    UpdateStaffRequest, User as ProtoUser,
};
use proto_gen::common::SuccessResponse;
use std::sync::Arc;
use tonic::{Request, Response, Status};
use uuid::Uuid;

pub struct AuthServiceImpl {
    user_repo: Arc<UserRepository>,
    tenant_repo: Arc<TenantRepository>,
    security: Arc<SecurityService>,
}

impl AuthServiceImpl {
    pub fn new(
        user_repo: Arc<UserRepository>,
        tenant_repo: Arc<TenantRepository>,
        security: Arc<SecurityService>,
    ) -> Self {
        Self {
            user_repo,
            tenant_repo,
            security,
        }
    }

    /// Helper to get claims from request extensions (injected by interceptor)
    fn get_claims<T>(&self, request: &Request<T>) -> Result<Claims, Status> {
        request
            .extensions()
            .get::<Claims>()
            .cloned()
            .ok_or_else(|| Status::unauthenticated("Unauthorized: Missing or invalid token"))
    }

    fn to_proto_user(&self, user: User) -> ProtoUser {
        ProtoUser {
            id: user.id.to_string(),
            email: user.email,
            full_name: user.full_name,
            tenant_id: user.tenant_id.to_string(),
            roles: vec![user.role.to_string()],
            branch_id: user.branch_id.map(|b| b.to_string()),
        }
    }
}

#[tonic::async_trait]
impl AuthService for AuthServiceImpl {
    async fn register(
        &self,
        request: Request<RegisterRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        let req = request.into_inner();

        // 1. Create Tenant first
        let tenant_id = Uuid::new_v4();
        let new_tenant = Tenant {
            id: tenant_id,
            name: format!("{}'s Store", req.full_name),
            subdomain: req.tenant_slug.clone(),
            is_active: true,
            created_at: chrono::Utc::now(),
        };

        self.tenant_repo
            .create(&new_tenant)
            .await
            .map_err(|e| Status::internal(format!("Failed to create tenant: {}", e)))?;

        let password_hash = SecurityService::hash_password(&req.password)
            .map_err(|e| Status::internal(format!("Hashing failed: {}", e)))?;

        let user_model = User {
            id: Uuid::new_v4(),
            tenant_id,
            branch_id: None,
            email: req.email,
            password_hash,
            full_name: req.full_name,
            role: UserRole::Owner,
            is_active: true,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let created = self
            .user_repo
            .create(&user_model)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let (token, refresh_token) = {
            let access = self
                .security
                .create_token(
                    &created.id.to_string(),
                    &created.tenant_id.to_string(),
                    vec![created.role.to_string()],
                )
                .map_err(|e| Status::internal(e.to_string()))?;

            let refresh = self
                .security
                .create_refresh_token(&created.id.to_string(), &created.tenant_id.to_string())
                .map_err(|e| Status::internal(e.to_string()))?;

            (access, refresh)
        };

        Ok(Response::new(AuthResponse {
            access_token: token,
            refresh_token,
            user: Some(self.to_proto_user(created)),
        }))
    }

    async fn login(
        &self,
        request: Request<LoginRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        let req = request.into_inner();

        // Resolve tenant_id from slug
        let tenant = self
            .tenant_repo
            .find_by_subdomain(&req.tenant_slug)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::not_found(format!("Tenant '{}' not found", req.tenant_slug)))?;

        let tenant_id = tenant.id;

        let user = self
            .user_repo
            .find_by_email(&tenant_id, &req.email)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::unauthenticated("Invalid credentials"))?;

        let is_valid = SecurityService::verify_password(&req.password, &user.password_hash)
            .map_err(|e| Status::internal(e.to_string()))?;

        if !is_valid {
            return Err(Status::unauthenticated("Invalid credentials"));
        }

        let (token, refresh_token) = {
            let access = self
                .security
                .create_token(
                    &user.id.to_string(),
                    &user.tenant_id.to_string(),
                    vec![user.role.to_string()],
                )
                .map_err(|e| Status::internal(e.to_string()))?;

            let refresh = self
                .security
                .create_refresh_token(&user.id.to_string(), &user.tenant_id.to_string())
                .map_err(|e| Status::internal(e.to_string()))?;

            (access, refresh)
        };

        Ok(Response::new(AuthResponse {
            access_token: token,
            refresh_token,
            user: Some(self.to_proto_user(user)),
        }))
    }

    async fn refresh_token(
        &self,
        request: Request<RefreshRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        let req = request.into_inner();

        let claims = self
            .security
            .verify_token(&req.refresh_token)
            .map_err(|e| Status::unauthenticated(format!("Invalid refresh token: {}", e)))?;

        // Verify it's actually a refresh token
        if !claims.roles.contains(&"refresh".to_string()) {
            return Err(Status::unauthenticated("Invalid token type for refresh"));
        }

        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| Status::invalid_argument("Invalid user id in token"))?;
        let tenant_id = Uuid::parse_str(&claims.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant id in token"))?;

        let user = self
            .user_repo
            .find_by_id(&tenant_id, &user_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::not_found("User not found"))?;

        let (token, refresh_token) = {
            let access = self
                .security
                .create_token(
                    &user.id.to_string(),
                    &user.tenant_id.to_string(),
                    vec![user.role.to_string()],
                )
                .map_err(|e| Status::internal(e.to_string()))?;

            let refresh = self
                .security
                .create_refresh_token(&user.id.to_string(), &user.tenant_id.to_string())
                .map_err(|e| Status::internal(e.to_string()))?;

            (access, refresh)
        };

        Ok(Response::new(AuthResponse {
            access_token: token,
            refresh_token,
            user: Some(self.to_proto_user(user)),
        }))
    }

    async fn get_current_user(
        &self,
        request: Request<Empty>,
    ) -> Result<Response<ProtoUser>, Status> {
        let claims = self.get_claims(&request)?;
        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| Status::invalid_argument("Invalid user id"))?;
        let tenant_id = Uuid::parse_str(&claims.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant id"))?;

        let user = self
            .user_repo
            .find_by_id(&tenant_id, &user_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::not_found("User not found"))?;

        Ok(Response::new(self.to_proto_user(user)))
    }

    // --- Staff Management CRUD (S06) ---

    async fn create_staff(
        &self,
        request: Request<CreateStaffRequest>,
    ) -> Result<Response<ProtoUser>, Status> {
        let claims = self.get_claims(&request)?;
        let tenant_id = Uuid::parse_str(&claims.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant id"))?;

        let req = request.into_inner();
        let password_hash = SecurityService::hash_password(&req.password)
            .map_err(|e| Status::internal(e.to_string()))?;

        let user_model = User {
            id: Uuid::new_v4(),
            tenant_id,
            branch_id: req.branch_id.and_then(|id| Uuid::parse_str(&id).ok()),
            email: req.email,
            password_hash,
            full_name: req.full_name,
            role: UserRole::from(req.role),
            is_active: true,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let created = self
            .user_repo
            .create(&user_model)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(self.to_proto_user(created)))
    }

    async fn list_staff(
        &self,
        request: Request<ListStaffRequest>,
    ) -> Result<Response<ListStaffResponse>, Status> {
        let claims = self.get_claims(&request)?;
        let tenant_id = Uuid::parse_str(&claims.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant id"))?;

        let branch_id = request
            .into_inner()
            .branch_id
            .and_then(|id| Uuid::parse_str(&id).ok());

        let users = self
            .user_repo
            .list_by_tenant(&tenant_id, branch_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(ListStaffResponse {
            staff: users.into_iter().map(|u| self.to_proto_user(u)).collect(),
        }))
    }

    async fn update_staff(
        &self,
        request: Request<UpdateStaffRequest>,
    ) -> Result<Response<ProtoUser>, Status> {
        let claims = self.get_claims(&request)?;
        let tenant_id = Uuid::parse_str(&claims.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant id"))?;

        let req = request.into_inner();
        let user_id =
            Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid user id"))?;

        let updated = self
            .user_repo
            .update(
                &tenant_id,
                &user_id,
                req.full_name,
                req.role.map(UserRole::from),
                req.is_active,
            )
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(self.to_proto_user(updated)))
    }

    async fn delete_staff(
        &self,
        request: Request<DeleteStaffRequest>,
    ) -> Result<Response<SuccessResponse>, Status> {
        let claims = self.get_claims(&request)?;
        let tenant_id = Uuid::parse_str(&claims.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant id"))?;

        let user_id = Uuid::parse_str(&request.into_inner().id)
            .map_err(|_| Status::invalid_argument("Invalid user id"))?;

        self.user_repo
            .delete(&tenant_id, &user_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(SuccessResponse {
            success: true,
            message: "Staff deleted successfully".to_string(),
        }))
    }
}
