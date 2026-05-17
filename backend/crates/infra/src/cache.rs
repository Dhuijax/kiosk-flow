use redis::aio::ConnectionManager;
use redis::Client;
use std::env;
use tracing::info;

pub async fn create_redis_manager() -> anyhow::Result<ConnectionManager> {
    let redis_url = env::var("REDIS_URL").expect("REDIS_URL must be set in .env");

    info!("Connecting to Redis at {}...", redis_url);

    let client = Client::open(redis_url)?;
    let manager = ConnectionManager::new(client).await?;

    info!("Redis connection manager established.");
    Ok(manager)
}
