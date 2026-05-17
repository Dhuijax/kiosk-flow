use proto_gen::status::{status_service_server::StatusService, Empty, HealthResponse};
use tonic::{Request, Response, Status};

pub struct StatusServiceImpl {}

impl StatusServiceImpl {
    pub fn new() -> Self {
        Self {}
    }
}

#[tonic::async_trait]
impl StatusService for StatusServiceImpl {
    async fn check_health(
        &self,
        _request: Request<Empty>,
    ) -> Result<Response<HealthResponse>, Status> {
        Ok(Response::new(HealthResponse {
            status: true,
            version: "v2.5".to_string(),
            uptime: "online".to_string(),
        }))
    }
}
