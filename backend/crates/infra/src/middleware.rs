use crate::security::SecurityService;
use futures_util::future::BoxFuture;
use std::task::{Context, Poll};
use tonic::{Request, Status};
use tower::{Layer, Service};

/// Extracts the tenant subdomain from the gRPC `:authority` or `host` header,
/// or from the `x-tenant-id` header if provided by a proxy.
pub fn extract_tenant_from_request<T>(request: &Request<T>) -> Result<String, Status> {
    // 1. Check x-tenant-id (passed by Envoy/Frontend)
    if let Some(tenant_id) = request.metadata().get("x-tenant-id") {
        if let Ok(tid) = tenant_id.to_str() {
            if !tid.is_empty() {
                return Ok(tid.to_string());
            }
        }
    }

    // 2. Fallback to subdomain extraction from host
    let authority = request
        .metadata()
        .get(":authority")
        .or_else(|| request.metadata().get("host"))
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| Status::unauthenticated("Missing Host/Authority or x-tenant-id header"))?;

    let parts: Vec<&str> = authority.split('.').collect();
    if parts.is_empty() {
        return Err(Status::invalid_argument("Invalid Host format"));
    }

    let subdomain = parts[0].to_string();
    if subdomain == "localhost" || subdomain == "127.0.0.1" || subdomain.starts_with("localhost:") {
        return Ok("00000000-0000-0000-0000-000000000001".to_string());
    }

    Ok(subdomain)
}

/// Extracts the tenant subdomain from http headers for Tower services
pub fn extract_tenant_from_request_http(headers: &http::HeaderMap) -> String {
    if let Some(tenant_id) = headers.get("x-tenant-id") {
        if let Ok(tid) = tenant_id.to_str() {
            if !tid.is_empty() {
                return tid.to_string();
            }
        }
    }

    if let Some(authority) = headers
        .get(":authority")
        .or_else(|| headers.get("host"))
        .and_then(|v| v.to_str().ok())
    {
        let parts: Vec<&str> = authority.split('.').collect();
        if !parts.is_empty() {
            let subdomain = parts[0].to_string();
            if subdomain == "localhost"
                || subdomain == "127.0.0.1"
                || subdomain.starts_with("localhost:")
            {
                return "00000000-0000-0000-0000-000000000001".to_string();
            }
            return subdomain;
        }
    }

    "00000000-0000-0000-0000-000000000001".to_string()
}

pub mod idempotency;

/// Wrapper type for active branch context to avoid type collisions in Request Extensions
#[derive(Debug, Clone)]
pub struct ActiveBranchId(pub String);

/// Extracts the active branch ID from the gRPC `x-branch-id` header if present.
pub fn extract_branch_from_request<T>(request: &Request<T>) -> Option<String> {
    if let Some(branch_id) = request.metadata().get("x-branch-id") {
        if let Ok(bid) = branch_id.to_str() {
            return Some(bid.to_string());
        }
    }
    None
}

/// A Tonic Interceptor that verifies JWT and injects tenant/user context.
pub fn get_auth_interceptor(
    secret: String,
) -> impl Fn(Request<()>) -> Result<Request<()>, Status> + Clone {
    let security = std::sync::Arc::new(SecurityService::new(&secret));

    move |mut req: Request<()>| {
        if let Some(auth_header) = req.metadata().get("authorization") {
            let auth_str = auth_header
                .to_str()
                .map_err(|_| Status::unauthenticated("Invalid authorization header encoding"))?;

            if !auth_str.starts_with("Bearer ") {
                return Err(Status::unauthenticated(
                    "Authorization header must start with 'Bearer '",
                ));
            }

            let token = &auth_str[7..];
            let claims = security
                .verify_token(token)
                .map_err(|e| Status::unauthenticated(format!("Invalid token: {}", e)))?;

            req.extensions_mut().insert(claims);
        }

        // Use a block to handle the error from extract_tenant_from_request
        let tenant = extract_tenant_from_request(&req)?;
        req.extensions_mut().insert(tenant);

        // Extract branch ID context and insert if present
        if let Some(branch) = extract_branch_from_request(&req) {
            req.extensions_mut().insert(ActiveBranchId(branch));
        }

        Ok(req)
    }
}

tokio::task_local! {
    pub static CURRENT_CONTEXT: ScopedContext;
}

#[derive(Debug, Clone)]
pub struct ScopedContext {
    pub tenant_id: uuid::Uuid,
    pub user_id: Option<uuid::Uuid>,
    pub branch_id: Option<uuid::Uuid>,
}

#[derive(Clone)]
pub struct ScopingLayer;

impl<S> Layer<S> for ScopingLayer {
    type Service = ScopingService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        ScopingService { inner }
    }
}

#[derive(Clone)]
pub struct ScopingService<S> {
    inner: S,
}

impl<S, ReqBody> Service<http::Request<ReqBody>> for ScopingService<S>
where
    S: Service<http::Request<ReqBody>> + Clone + Send + 'static,
    S::Future: Send + 'static,
    ReqBody: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = BoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: http::Request<ReqBody>) -> Self::Future {
        let mut inner = self.inner.clone();

        let claims = req.extensions().get::<crate::security::Claims>().cloned();
        let active_branch = req.extensions().get::<ActiveBranchId>().cloned();

        let context = if let Some(claims) = claims {
            let tenant_id = uuid::Uuid::parse_str(&claims.tenant_id).unwrap_or_default();
            let user_id = uuid::Uuid::parse_str(&claims.sub).ok();
            let branch_id = active_branch.and_then(|ab| uuid::Uuid::parse_str(&ab.0).ok());

            Some(ScopedContext {
                tenant_id,
                user_id,
                branch_id,
            })
        } else if let Some(tenant_str) = req.extensions().get::<String>().cloned() {
            let tenant_id = uuid::Uuid::parse_str(&tenant_str).unwrap_or_default();
            Some(ScopedContext {
                tenant_id,
                user_id: None,
                branch_id: None,
            })
        } else {
            None
        };

        Box::pin(async move {
            if let Some(ctx) = context {
                CURRENT_CONTEXT
                    .scope(ctx, async move { inner.call(req).await })
                    .await
            } else {
                inner.call(req).await
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_tenant_from_x_tenant_id() {
        let mut req = Request::new(());
        req.metadata_mut()
            .insert("x-tenant-id", "alpha".parse().unwrap());

        let tenant = extract_tenant_from_request(&req).unwrap();
        assert_eq!(tenant, "alpha");
    }

    #[test]
    fn test_extract_tenant_from_host() {
        let mut req = Request::new(());
        req.metadata_mut()
            .insert("host", "beta.mylocalpos.com".parse().unwrap());

        let tenant = extract_tenant_from_request(&req).unwrap();
        assert_eq!(tenant, "beta");
    }
}
