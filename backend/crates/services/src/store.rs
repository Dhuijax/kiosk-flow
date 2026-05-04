use tonic::{Request, Response, Status};
use proto_gen::store::{
    store_service_server::StoreService, Store, GetStoreRequest, UpdateStoreRequest
};

pub struct StoreServiceImpl {}

impl StoreServiceImpl {
    pub fn new() -> Self {
        Self {}
    }
}

#[tonic::async_trait]
impl StoreService for StoreServiceImpl {
    async fn get_store_info(
        &self,
        request: Request<GetStoreRequest>,
    ) -> Result<Response<Store>, Status> {
        let _req = request.into_inner();
        Ok(Response::new(Store {
            id: "s1".to_string(),
            name: "Default Store".to_string(),
            slug: "default".to_string(),
            address: "123 Street".to_string(),
            phone: "0123456789".to_string(),
            currency: "USD".to_string(),
            tenant_id: "tenant-1".to_string(),
        }))
    }

    async fn update_store(
        &self,
        request: Request<UpdateStoreRequest>,
    ) -> Result<Response<Store>, Status> {
        let req = request.into_inner();
        Ok(Response::new(Store {
            id: "s1".to_string(),
            name: req.name,
            slug: "default".to_string(),
            address: req.address,
            phone: req.phone,
            currency: req.currency,
            tenant_id: "tenant-1".to_string(),
        }))
    }
}
