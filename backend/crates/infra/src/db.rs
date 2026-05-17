use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use std::env;
use std::time::Duration;
use tracing::{error, info};

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
