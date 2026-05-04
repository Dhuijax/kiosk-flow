use std::env;

#[derive(Debug)]
#[allow(dead_code)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub server_addr: String,
    pub jwt_secret: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let database_url = env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set");
        
        let server_addr = env::var("SERVER_ADDR")
            .unwrap_or_else(|_| "0.0.0.0:50051".to_string());

        let jwt_secret = env::var("JWT_SECRET")
            .expect("JWT_SECRET must be set");

        let redis_url = env::var("REDIS_URL")
            .expect("REDIS_URL must be set");

        Ok(Self {
            database_url,
            redis_url,
            server_addr,
            jwt_secret,
        })
    }
}
