use infra::security::Claims;
use proto_gen::billing::{
    billing_service_server::BillingService, CreatePaymentRequest, CreatePaymentResponse,
    GetSubscriptionRequest, GetSubscriptionResponse,
};
use sqlx::{PgPool, Row};
use tonic::{Request, Response, Status};
use uuid::Uuid;

pub struct BillingServiceImpl {
    pool: PgPool,
}

impl BillingServiceImpl {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
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
impl BillingService for BillingServiceImpl {
    async fn create_subscription_payment(
        &self,
        request: Request<CreatePaymentRequest>,
    ) -> Result<Response<CreatePaymentResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();

        let amount = match req.plan_type.as_str() {
            "STARTER" => 99000.00,
            "PRO" => 249000.00,
            "ENTERPRISE" => 999000.00,
            _ => return Err(Status::invalid_argument("Invalid plan type")),
        };

        let txn_ref = format!(
            "{}_TXN_{}",
            req.payment_gateway.to_uppercase(),
            Uuid::new_v4().simple()
        );

        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        sqlx::query(
            "INSERT INTO billing_transactions (tenant_id, amount, gateway, transaction_id, status)
             VALUES ($1, $2, $3, $4, 'PENDING')",
        )
        .bind(tenant_id)
        .bind(amount)
        .bind(&req.payment_gateway)
        .bind(&txn_ref)
        .execute(&mut *tx)
        .await
        .map_err(|e| Status::internal(e.to_string()))?;

        tx.commit()
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        // Generate beautiful mockup URLs for payment gateways
        let payment_url = format!(
            "https://pay.kioskflow.vn/sandbox/{}?txn={}&amount={}",
            req.payment_gateway.to_lowercase(),
            txn_ref,
            amount
        );

        // Simple percent-encoding replacement helper to avoid external dependencies
        let encoded_payment_url = payment_url
            .replace(":", "%3A")
            .replace("/", "%2F")
            .replace("?", "%3F")
            .replace("=", "%3D")
            .replace("&", "%26");

        let qr_code_url = format!(
            "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={}",
            encoded_payment_url
        );

        Ok(Response::new(CreatePaymentResponse {
            payment_url,
            qr_code_url,
            transaction_id: txn_ref,
        }))
    }

    async fn get_subscription_status(
        &self,
        request: Request<GetSubscriptionRequest>,
    ) -> Result<Response<GetSubscriptionResponse>, Status> {
        let tenant_id = self.get_context(&request)?;

        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let subscription = sqlx::query(
            "SELECT plan_type, status, expires_at, max_tables, max_products
             FROM tenant_subscriptions
             WHERE tenant_id = $1",
        )
        .bind(tenant_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| Status::internal(e.to_string()))?;

        if let Some(row) = subscription {
            let plan_type: String = row.get("plan_type");
            let status: String = row.get("status");
            let expires_at: chrono::DateTime<chrono::Utc> = row.get("expires_at");
            let max_tables: i32 = row.get("max_tables");
            let max_products: i32 = row.get("max_products");

            tx.commit()
                .await
                .map_err(|e| Status::internal(e.to_string()))?;
            Ok(Response::new(GetSubscriptionResponse {
                plan_type,
                status,
                expires_at: expires_at.to_rfc3339(),
                max_tables,
                max_products,
            }))
        } else {
            // Create a default STARTER plan if not exist
            let expires_at = chrono::Utc::now() + chrono::Duration::days(30);
            sqlx::query(
                "INSERT INTO tenant_subscriptions (tenant_id, plan_type, status, expires_at, max_tables, max_products)
                 VALUES ($1, 'STARTER', 'ACTIVE', $2, 10, 50)"
            )
            .bind(tenant_id)
            .bind(expires_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

            tx.commit()
                .await
                .map_err(|e| Status::internal(e.to_string()))?;

            Ok(Response::new(GetSubscriptionResponse {
                plan_type: "STARTER".to_string(),
                status: "ACTIVE".to_string(),
                expires_at: expires_at.to_rfc3339(),
                max_tables: 10,
                max_products: 50,
            }))
        }
    }
}
