use infra::repository::StoreRepository;
use infra::security::Claims;
use proto_gen::store::{
    store_service_server::StoreService, tenant_settings_service_server::TenantSettingsService,
    GetSettingsRequest, GetStoreRequest, Store, TenantSettings, UpdateSettingsRequest,
    UpdateStoreRequest,
};
use std::sync::Arc;
use tonic::{Request, Response, Status};
use uuid::Uuid;

pub struct StoreServiceImpl {
    store_repo: Arc<StoreRepository>,
}

impl StoreServiceImpl {
    pub fn new(store_repo: Arc<StoreRepository>) -> Self {
        Self { store_repo }
    }

    fn get_context<T>(&self, request: &Request<T>) -> Result<Uuid, Status> {
        let claims = request
            .extensions()
            .get::<Claims>()
            .ok_or_else(|| Status::unauthenticated("Unauthorized"))?;

        Uuid::parse_str(&claims.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant id"))
    }
}

#[tonic::async_trait]
impl StoreService for StoreServiceImpl {
    async fn get_store_info(
        &self,
        request: Request<GetStoreRequest>,
    ) -> Result<Response<Store>, Status> {
        let tenant_id = self.get_context(&request)?;

        let branch = self
            .store_repo
            .get_main_branch(&tenant_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(Store {
            id: branch.id.to_string(),
            name: branch.name,
            slug: "".to_string(), // Could use tenant subdomain if needed
            address: branch.address.unwrap_or_default(),
            phone: branch.phone.unwrap_or_default(),
            currency: "VND".to_string(), // Default, will be overridden by settings if needed
            tenant_id: branch.tenant_id.to_string(),
        }))
    }

    async fn update_store(
        &self,
        request: Request<UpdateStoreRequest>,
    ) -> Result<Response<Store>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();

        let branch = self
            .store_repo
            .update_main_branch(&tenant_id, req.name, req.address, req.phone)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(Store {
            id: branch.id.to_string(),
            name: branch.name,
            slug: "".to_string(),
            address: branch.address.unwrap_or_default(),
            phone: branch.phone.unwrap_or_default(),
            currency: req.currency,
            tenant_id: branch.tenant_id.to_string(),
        }))
    }
}

pub struct TenantSettingsServiceImpl {
    store_repo: Arc<StoreRepository>,
}

impl TenantSettingsServiceImpl {
    pub fn new(store_repo: Arc<StoreRepository>) -> Self {
        Self { store_repo }
    }

    fn get_context<T>(&self, request: &Request<T>) -> Result<Uuid, Status> {
        let claims = request
            .extensions()
            .get::<Claims>()
            .ok_or_else(|| Status::unauthenticated("Unauthorized"))?;

        Uuid::parse_str(&claims.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant id"))
    }
}

#[tonic::async_trait]
impl TenantSettingsService for TenantSettingsServiceImpl {
    async fn get_settings(
        &self,
        request: Request<GetSettingsRequest>,
    ) -> Result<Response<TenantSettings>, Status> {
        let tenant_id = self.get_context(&request)?;

        let settings = self
            .store_repo
            .get_settings(&tenant_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(TenantSettings {
            theme_color: settings.theme_color,
            logo_url: settings.logo_url.unwrap_or_default(),
            kiosk_timeout_seconds: settings.kiosk_timeout_seconds,
            language: settings.language,
            currency: settings.currency,
            updated_at: settings.updated_at.to_rfc3339(),
        }))
    }

    async fn update_settings(
        &self,
        request: Request<UpdateSettingsRequest>,
    ) -> Result<Response<TenantSettings>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();

        let settings = self
            .store_repo
            .update_settings(
                &tenant_id,
                req.theme_color,
                req.kiosk_timeout_seconds,
                req.language,
                req.currency,
            )
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(TenantSettings {
            theme_color: settings.theme_color,
            logo_url: settings.logo_url.unwrap_or_default(),
            kiosk_timeout_seconds: settings.kiosk_timeout_seconds,
            language: settings.language,
            currency: settings.currency,
            updated_at: settings.updated_at.to_rfc3339(),
        }))
    }
}
