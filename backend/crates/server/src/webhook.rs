use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use tracing::{error, info};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct WebhookPayload {
    pub transaction_id: String,
    pub amount: f64,
    pub status: String,
    pub signature: String,
}

#[derive(Debug, Serialize)]
pub struct WebhookResponse {
    pub success: bool,
    pub message: String,
}

pub async fn handle_billing_webhook(
    State(pool): State<PgPool>,
    Json(payload): Json<WebhookPayload>,
) -> Result<Json<WebhookResponse>, axum::http::StatusCode> {
    info!("Received billing webhook payload: {:?}", payload);

    if payload.signature.is_empty() {
        error!("Webhook signature is missing");
        return Err(axum::http::StatusCode::BAD_REQUEST);
    }

    let mut tx = pool.begin().await.map_err(|e| {
        error!("Failed to start transaction: {}", e);
        axum::http::StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Find the pending transaction using standard sqlx::query
    let txn_row =
        sqlx::query("SELECT tenant_id, status FROM billing_transactions WHERE transaction_id = $1")
            .bind(&payload.transaction_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| {
                error!("Failed to query transaction: {}", e);
                axum::http::StatusCode::INTERNAL_SERVER_ERROR
            })?;

    let row = match txn_row {
        Some(r) => r,
        None => {
            error!("Transaction not found: {}", payload.transaction_id);
            return Err(axum::http::StatusCode::NOT_FOUND);
        }
    };

    let tenant_id: Uuid = row.get("tenant_id");
    let status: String = row.get("status");

    if status != "PENDING" {
        info!("Transaction {} already processed", payload.transaction_id);
        return Ok(Json(WebhookResponse {
            success: true,
            message: "Transaction already processed".to_string(),
        }));
    }

    // Set PostgreSQL local tenant variable to bypass RLS for administrative updates
    sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
        .bind(tenant_id.to_string())
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            error!("Failed to set tenant context: {}", e);
            axum::http::StatusCode::INTERNAL_SERVER_ERROR
        })?;

    if payload.status == "SUCCESS" {
        // Update transaction status
        sqlx::query("UPDATE billing_transactions SET status = 'SUCCESS' WHERE transaction_id = $1")
            .bind(&payload.transaction_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                error!("Failed to update transaction status: {}", e);
                axum::http::StatusCode::INTERNAL_SERVER_ERROR
            })?;

        // Determine plan details based on transaction amount
        let (plan_type, max_tables, max_products) = if payload.amount >= 999000.00 {
            ("ENTERPRISE", 999, 9999)
        } else if payload.amount >= 249000.00 {
            ("PRO", 50, 200)
        } else {
            ("STARTER", 10, 50)
        };

        // Query existing subscription
        let existing_sub_row =
            sqlx::query("SELECT expires_at FROM tenant_subscriptions WHERE tenant_id = $1")
                .bind(tenant_id)
                .fetch_optional(&mut *tx)
                .await
                .map_err(|e| {
                    error!("Failed to query subscription: {}", e);
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR
                })?;

        let now = chrono::Utc::now();
        let new_expiry = match existing_sub_row {
            Some(r) => {
                let expires_at: chrono::DateTime<chrono::Utc> = r.get("expires_at");
                if expires_at > now {
                    expires_at + chrono::Duration::days(30)
                } else {
                    now + chrono::Duration::days(30)
                }
            }
            None => now + chrono::Duration::days(30),
        };

        sqlx::query(
            "INSERT INTO tenant_subscriptions (tenant_id, plan_type, status, expires_at, max_tables, max_products)
             VALUES ($1, $2, 'ACTIVE', $3, $4, $5)
             ON CONFLICT (tenant_id) DO UPDATE
             SET plan_type = EXCLUDED.plan_type,
                 status = 'ACTIVE',
                 expires_at = EXCLUDED.expires_at,
                 max_tables = EXCLUDED.max_tables,
                 max_products = EXCLUDED.max_products,
                 updated_at = NOW()"
        )
        .bind(tenant_id)
        .bind(plan_type)
        .bind(new_expiry)
        .bind(max_tables)
        .bind(max_products)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            error!("Failed to upsert tenant subscription: {}", e);
            axum::http::StatusCode::INTERNAL_SERVER_ERROR
        })?;

        info!(
            "Subscription updated successfully for tenant: {}",
            tenant_id
        );
    } else {
        // Update transaction status to FAILED
        sqlx::query("UPDATE billing_transactions SET status = 'FAILED' WHERE transaction_id = $1")
            .bind(&payload.transaction_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                error!("Failed to update transaction status: {}", e);
                axum::http::StatusCode::INTERNAL_SERVER_ERROR
            })?;
    }

    tx.commit().await.map_err(|e| {
        error!("Failed to commit transaction: {}", e);
        axum::http::StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(WebhookResponse {
        success: true,
        message: "Webhook processed successfully".to_string(),
    }))
}
