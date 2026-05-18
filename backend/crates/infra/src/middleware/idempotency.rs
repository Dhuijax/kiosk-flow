use http::{Request, Response};
use http_body_util::{BodyExt, Full};
use redis::aio::ConnectionManager;
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use tonic::body::BoxBody;
use tower::Layer;

#[derive(Clone)]
pub struct IdempotencyLayer {
    redis: ConnectionManager,
}

impl IdempotencyLayer {
    pub fn new(redis: ConnectionManager) -> Self {
        Self { redis }
    }
}

impl<S> Layer<S> for IdempotencyLayer {
    type Service = IdempotencyService<S>;

    fn layer(&self, inner: S) -> IdempotencyService<S> {
        IdempotencyService {
            inner,
            redis: self.redis.clone(),
        }
    }
}

#[derive(Clone)]
pub struct IdempotencyService<S> {
    inner: S,
    redis: ConnectionManager,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct CachedResponse {
    status_code: u32,
    status_message: String,
    headers: Vec<(String, String)>,
    body_base64: String,
}

fn bytes_to_box_body(bytes: bytes::Bytes) -> BoxBody {
    Full::new(bytes)
        .map_err(|_| tonic::Status::internal("impossible"))
        .boxed_unsync()
}

fn status_to_response(status: tonic::Status) -> Response<BoxBody> {
    let mut response = Response::new(bytes_to_box_body(bytes::Bytes::new()));
    *response.status_mut() = http::StatusCode::OK;
    response
        .headers_mut()
        .insert("content-type", "application/grpc".parse().unwrap());
    response.headers_mut().insert(
        "grpc-status",
        (status.code() as i32).to_string().parse().unwrap(),
    );
    if !status.message().is_empty() {
        response
            .headers_mut()
            .insert("grpc-message", status.message().parse().unwrap());
    }
    response
}

async fn collect_body(body: BoxBody) -> Result<bytes::Bytes, tonic::Status> {
    let collected = body
        .collect()
        .await
        .map_err(|e| tonic::Status::internal(format!("Body read error: {}", e)))?;
    Ok(collected.to_bytes())
}

impl<S> tower::Service<Request<BoxBody>> for IdempotencyService<S>
where
    S: tower::Service<Request<BoxBody>, Response = Response<BoxBody>> + Clone + Send + 'static,
    S::Error: Send + 'static,
    S::Future: Send + 'static,
{
    type Response = Response<BoxBody>;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Response<BoxBody>, S::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), S::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(
        &mut self,
        req: Request<BoxBody>,
    ) -> Pin<Box<dyn Future<Output = Result<Response<BoxBody>, S::Error>> + Send>> {
        let mut inner = self.inner.clone();
        let mut redis = self.redis.clone();

        Box::pin(async move {
            let path = req.uri().path();
            let is_mutating = path.contains("Create")
                || path.contains("Process")
                || path.contains("Update")
                || path.contains("Set")
                || path.contains("Delete")
                || path.contains("Adjust");

            if !is_mutating {
                return inner.call(req).await;
            }

            // 1. Get tenant subdomain/id from request headers
            let tenant_id = super::extract_tenant_from_request_http(req.headers());

            // 2. Look for idempotency key in headers
            let idempotency_key = req
                .headers()
                .get("x-idempotency-key")
                .or_else(|| req.headers().get("idempotency-key"))
                .and_then(|v| v.to_str().ok().map(|s| s.to_string()));

            // 3. Extract the body bytes and resolve final key
            let (req_parts, req_body) = req.into_parts();
            let req_bytes = match collect_body(req_body).await {
                Ok(b) => b,
                Err(status) => {
                    return Ok(status_to_response(status));
                }
            };

            let final_key = match idempotency_key {
                Some(key) => key,
                None => {
                    use sha2::{Digest, Sha256};
                    let mut hasher = Sha256::new();
                    hasher.update(&req_bytes);
                    hex::encode(hasher.finalize())
                }
            };

            let redis_key = format!("kioskflow:idempotency:{}:{}", tenant_id, final_key);

            // 4. Redis Locking & Check
            let redis_val: Option<String> = redis::cmd("GET")
                .arg(&redis_key)
                .query_async(&mut redis)
                .await
                .ok()
                .flatten();

            if let Some(val) = redis_val {
                if val == "in_flight" {
                    let status = tonic::Status::aborted("Duplicate request in progress");
                    return Ok(status_to_response(status));
                } else if let Some(json_str) = val.strip_prefix("resolved:") {
                    if let Ok(cached) = serde_json::from_str::<CachedResponse>(json_str) {
                        let body_bytes = hex::decode(&cached.body_base64).unwrap_or_default();
                        let mut response =
                            Response::new(bytes_to_box_body(bytes::Bytes::from(body_bytes)));
                        *response.status_mut() = http::StatusCode::OK;

                        for (k, v) in cached.headers {
                            if let (Ok(hname), Ok(hval)) = (
                                http::header::HeaderName::from_bytes(k.as_bytes()),
                                http::header::HeaderValue::from_bytes(v.as_bytes()),
                            ) {
                                response.headers_mut().insert(hname, hval);
                            }
                        }
                        // Force gRPC status
                        response.headers_mut().insert(
                            "grpc-status",
                            cached.status_code.to_string().parse().unwrap(),
                        );
                        if !cached.status_message.is_empty() {
                            response
                                .headers_mut()
                                .insert("grpc-message", cached.status_message.parse().unwrap());
                        }
                        return Ok(response);
                    }
                }
            }

            // Acquire Lock
            let lock_acquired: Option<String> = redis::cmd("SET")
                .arg(&redis_key)
                .arg("in_flight")
                .arg("NX")
                .arg("EX")
                .arg(15) // 15 second lock
                .query_async(&mut redis)
                .await
                .ok();

            if lock_acquired.is_none() {
                let status = tonic::Status::aborted("Duplicate request lock conflict");
                return Ok(status_to_response(status));
            }

            // Reconstruct the request to call the inner service
            let reconstructed_body = bytes_to_box_body(req_bytes);
            let reconstructed_req = Request::from_parts(req_parts, reconstructed_body);

            // Execute the call!
            let res = inner.call(reconstructed_req).await;

            match res {
                Ok(response) => {
                    let (res_parts, res_body) = response.into_parts();

                    let mut response_headers = Vec::new();
                    for (k, v) in res_parts.headers.iter() {
                        if let Ok(val_str) = v.to_str() {
                            response_headers.push((k.to_string(), val_str.to_string()));
                        }
                    }

                    let grpc_status = res_parts
                        .headers
                        .get("grpc-status")
                        .and_then(|v| v.to_str().ok())
                        .and_then(|s| s.parse::<u32>().ok())
                        .unwrap_or(0); // default to 0 = OK

                    let grpc_message = res_parts
                        .headers
                        .get("grpc-message")
                        .and_then(|v| v.to_str().ok())
                        .unwrap_or("")
                        .to_string();

                    let res_bytes = match collect_body(res_body).await {
                        Ok(b) => b,
                        Err(_) => bytes::Bytes::new(),
                    };

                    let cached = CachedResponse {
                        status_code: grpc_status,
                        status_message: grpc_message,
                        headers: response_headers,
                        body_base64: hex::encode(&res_bytes),
                    };

                    if let Ok(json_str) = serde_json::to_string(&cached) {
                        let cache_val = format!("resolved:{}", json_str);
                        let _: () = redis::cmd("SET")
                            .arg(&redis_key)
                            .arg(&cache_val)
                            .arg("EX")
                            .arg(3600) // 1 hour TTL
                            .query_async(&mut redis)
                            .await
                            .unwrap_or(());
                    }

                    let final_res_body = bytes_to_box_body(res_bytes);
                    let final_response = Response::from_parts(res_parts, final_res_body);
                    Ok(final_response)
                }
                Err(e) => {
                    // Release lock on server error
                    let _: () = redis::cmd("DEL")
                        .arg(&redis_key)
                        .query_async(&mut redis)
                        .await
                        .unwrap_or(());
                    Err(e)
                }
            }
        })
    }
}
