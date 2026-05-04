use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use chrono::{Utc, Duration};
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String, // user_id
    pub exp: usize,
    pub iat: usize,
    pub tenant_id: String,
    pub roles: Vec<String>,
}

pub struct SecurityService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl SecurityService {
    pub fn new(secret: &str) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_ref()),
            decoding_key: DecodingKey::from_secret(secret.as_ref()),
        }
    }

    pub fn hash_password(password: &str) -> Result<String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2.hash_password(password.as_bytes(), &salt)
            .map_err(|e| anyhow::anyhow!("Hashing failed: {}", e))?
            .to_string();
        Ok(password_hash)
    }

    pub fn verify_password(password: &str, hash: &str) -> Result<bool> {
        let parsed_hash = PasswordHash::new(hash)
            .map_err(|e| anyhow::anyhow!("Invalid hash format: {}", e))?;
        Ok(Argon2::default().verify_password(password.as_bytes(), &parsed_hash).is_ok())
    }

    pub fn create_token(&self, user_id: &str, tenant_id: &str, roles: Vec<String>) -> Result<String> {
        let expiration = Utc::now()
            .checked_add_signed(Duration::hours(24))
            .expect("valid timestamp")
            .timestamp();

        let claims = Claims {
            sub: user_id.to_owned(),
            exp: expiration as usize,
            iat: Utc::now().timestamp() as usize,
            tenant_id: tenant_id.to_owned(),
            roles,
        };

        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| anyhow::anyhow!("Token creation failed: {}", e))
    }

    pub fn create_refresh_token(&self, user_id: &str, tenant_id: &str) -> Result<String> {
        let expiration = Utc::now()
            .checked_add_signed(Duration::days(7))
            .expect("valid timestamp")
            .timestamp();

        let claims = Claims {
            sub: user_id.to_owned(),
            exp: expiration as usize,
            iat: Utc::now().timestamp() as usize,
            tenant_id: tenant_id.to_owned(),
            roles: vec!["refresh".to_string()],
        };

        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| anyhow::anyhow!("Refresh token creation failed: {}", e))
    }

    pub fn verify_token(&self, token: &str) -> Result<Claims> {
        let token_data = decode::<Claims>(
            token,
            &self.decoding_key,
            &Validation::default(),
        ).map_err(|e| anyhow::anyhow!("Token verification failed: {}", e))?;
        
        Ok(token_data.claims)
    }
}
