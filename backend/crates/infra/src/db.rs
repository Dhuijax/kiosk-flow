use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use std::env;
use std::time::Duration;
use tracing::{error, info};
use uuid::Uuid;

pub type DbPool = Pool<Postgres>;

pub async fn create_pool() -> anyhow::Result<DbPool> {
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set in .env");

    info!("Connecting to database...");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .idle_timeout(Duration::from_secs(60))
        .connect(&database_url)
        .await
        .map_err(|e| {
            error!("Failed to connect to database: {}", e);
            e
        })?;

    info!("Database connection established.");
    Ok(pool)
}

pub async fn run_migrations(pool: &DbPool) -> anyhow::Result<()> {
    info!("Running database migrations...");

    sqlx::migrate!("../../migrations")
        .run(pool)
        .await
        .map_err(|e| {
            error!("Migration failure: {}", e);
            e
        })?;

    info!("Database migrations completed successfully.");
    Ok(())
}

/// Sets the current tenant for the session using PostgreSQL `SET LOCAL`.
/// This is used for Row-Level Security isolation.
pub async fn set_tenant_context(pool: &DbPool, tenant_id: &str) -> anyhow::Result<()> {
    sqlx::query(&format!("SET LOCAL app.current_tenant = '{}'", tenant_id))
        .execute(pool)
        .await?;
    Ok(())
}

/// Begins a transaction and sets the search_path to the tenant-specific schema,
/// as well as configuring app.current_tenant, app.current_user, and app.current_branch session variables
/// locally within the transaction for robust multi-tenant and branch RLS scoping.
pub async fn begin_scoped_tx<'a>(
    pool: &DbPool,
    tenant_id: &Uuid,
    user_id: Option<&Uuid>,
    branch_id: Option<&Uuid>,
) -> anyhow::Result<sqlx::Transaction<'a, Postgres>> {
    let mut tx = pool.begin().await?;

    // Attempt to extract task-local ScopedContext context if active
    let ctx = crate::middleware::CURRENT_CONTEXT
        .try_with(|c| c.clone())
        .ok();
    let final_user_id = user_id
        .cloned()
        .or_else(|| ctx.as_ref().and_then(|c| c.user_id));
    let final_branch_id = branch_id
        .cloned()
        .or_else(|| ctx.as_ref().and_then(|c| c.branch_id));

    // 1. Prioritize tenant schema search path
    let schema_name = format!("tenant_{}", tenant_id.to_string().replace('-', "_"));
    sqlx::query("SELECT set_config('search_path', $1, true)")
        .bind(format!("{}, public", schema_name))
        .execute(&mut *tx)
        .await?;

    // 2. Set tenant ID variable
    sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
        .bind(tenant_id.to_string())
        .execute(&mut *tx)
        .await?;

    // 3. Set user ID variable
    let uid_str = final_user_id.map(|uid| uid.to_string()).unwrap_or_default();
    sqlx::query("SELECT set_config('app.current_user', $1, true)")
        .bind(uid_str)
        .execute(&mut *tx)
        .await?;

    // 4. Set branch ID variable
    let bid_str = final_branch_id
        .map(|bid| bid.to_string())
        .unwrap_or_default();
    sqlx::query("SELECT set_config('app.current_branch', $1, true)")
        .bind(bid_str)
        .execute(&mut *tx)
        .await?;

    Ok(tx)
}
