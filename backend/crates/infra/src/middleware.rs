use crate::security::SecurityService;
use tonic::{Request, Status};

/// Extracts the tenant subdomain from the gRPC `:authority` or `host` header,
/// or from the `x-tenant-id` header if provided by a proxy.
pub fn extract_tenant_from_request<T>(request: &Request<T>) -> Result<String, Status> {
    // 1. Check x-tenant-id (passed by Envoy/Frontend)
    if let Some(tenant_id) = request.metadata().get("x-tenant-id") {
        if let Ok(tid) = tenant_id.to_str() {
            return Ok(tid.to_string());
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

    Ok(parts[0].to_string())
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

        Ok(req)
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
