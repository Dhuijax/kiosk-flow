use infra::db::create_pool;
use infra::security::SecurityService;
use uuid::Uuid;
use dotenvy::dotenv;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    let pool = create_pool().await?;

    let tenant_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001")?;
    let email = "admin@demo.com";
    let password = "password123";
    
    // 1. Ensure Tenant exists
    let existing_tenant = sqlx::query("SELECT id FROM tenants WHERE id = $1")
        .bind(tenant_id)
        .fetch_optional(&pool)
        .await?;
        
    if existing_tenant.is_none() {
        println!("Creating demo tenant...");
        sqlx::query("INSERT INTO tenants (id, name, subdomain) VALUES ($1, $2, $3)")
            .bind(tenant_id)
            .bind("Demo Store")
            .bind("demo")
            .execute(&pool)
            .await?;
    }

    // 2. Check if user exists
    let existing_user = sqlx::query("SELECT id FROM users WHERE email = $1 AND tenant_id = $2")
        .bind(email)
        .bind(tenant_id)
        .fetch_optional(&pool)
        .await?;
        
    if existing_user.is_some() {
        println!("User {} already exists", email);
    } else {
        println!("Seeding admin user...");
        let password_hash = SecurityService::hash_password(password)?;
        
        sqlx::query(
            "INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) \
             VALUES ($1, $2, $3, $4, $5, $6::user_role, $7)"
        )
        .bind(Uuid::new_v4())
        .bind(tenant_id)
        .bind(email)
        .bind(password_hash)
        .bind("Demo Admin")
        .bind("owner")
        .bind(true)
        .execute(&pool)
        .await?;
        
        println!("Successfully seeded admin user.");
    }

    println!("----------------------------");
    println!("Tenant Slug: demo");
    println!("Email: {}", email);
    println!("Password: {}", password);
    println!("----------------------------");

    Ok(())
}
