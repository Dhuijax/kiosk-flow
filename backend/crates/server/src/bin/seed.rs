use infra::db::create_pool;
use infra::security::SecurityService;
use uuid::Uuid;
use dotenvy::dotenv;
use rand::Rng;
use sqlx::{Pool, Postgres, Row, types::BigDecimal};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    let pool = create_pool().await?;

    println!("🚀 Seeding Employees and Customers for Demo...");

    let tenant_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001")?;
    
    // 1. Ensure Tenant & Admin
    ensure_tenant_and_admin(&pool, tenant_id).await?;

    // 2. Get Branches
    let branches = sqlx::query("SELECT id FROM branches WHERE tenant_id = $1").bind(tenant_id).fetch_all(&pool).await?;
    let branch_ids: Vec<Uuid> = branches.into_iter().map(|r| r.get(0)).collect();
    
    if branch_ids.is_empty() {
        println!("❌ No branches found. Please run the full seeder first.");
        return Ok(());
    }

    // 3. Seed Employees (50)
    seed_employees(&pool, tenant_id, &branch_ids, 50).await?;

    // 4. Seed Customers (50) - Already done but can ensure
    seed_customers(&pool, tenant_id, 50).await?;

    println!("\n✅ Staff and Customers seeded successfully!");
    Ok(())
}

async fn ensure_tenant_and_admin(pool: &Pool<Postgres>, tenant_id: Uuid) -> anyhow::Result<()> {
    let exists = sqlx::query("SELECT id FROM tenants WHERE id = $1").bind(tenant_id).fetch_optional(pool).await?;
    if exists.is_none() {
        sqlx::query("INSERT INTO tenants (id, name, subdomain) VALUES ($1, $2, $3)").bind(tenant_id).bind("Demo Store").bind("demo").execute(pool).await?;
    }
    let email = "admin@demo.com";
    let user_exists = sqlx::query("SELECT id FROM users WHERE email = $1 AND tenant_id = $2").bind(email).bind(tenant_id).fetch_optional(pool).await?;
    if user_exists.is_none() {
        let hash = SecurityService::hash_password("password123")?;
        sqlx::query("INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5, 'owner')")
            .bind(Uuid::new_v4()).bind(tenant_id).bind(email).bind(hash).bind("Demo Admin").execute(pool).await?;
    }
    Ok(())
}

async fn seed_employees(pool: &Pool<Postgres>, tenant_id: Uuid, branch_ids: &[Uuid], count: usize) -> anyhow::Result<()> {
    let current_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role != 'owner'")
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

    if current_count.0 >= count as i64 {
        println!("  - Users already seeded ({} found)", current_count.0);
        return Ok(());
    }

    println!("  - Seeding {} employees...", count);
    let roles = ["manager", "cashier", "waiter", "chef"];
    let first_names = ["Thanh", "Hoang", "Mai", "Lan", "Son", "Phuong", "Tuan", "Huong", "Viet", "Trang"];
    let last_names = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vu", "Phan", "Dang", "Bui", "Do"];
    let mut rng = rand::thread_rng();
    let password_hash = SecurityService::hash_password("password123")?;

    for i in 1..=count {
        let branch_id = branch_ids[i % branch_ids.len()];
        let first = first_names[rng.gen_range(0..10)];
        let last = last_names[rng.gen_range(0..10)];
        let full_name = format!("{} {}", last, first);
        let email = format!("staff{}@demo.com", i);
        let role = roles[i % roles.len()];

        sqlx::query(
            "INSERT INTO users (id, tenant_id, branch_id, email, password_hash, full_name, role, is_active) \
             VALUES ($1, $2, $3, $4, $5, $6, $7::user_role, true) ON CONFLICT DO NOTHING"
        )
        .bind(Uuid::new_v4())
        .bind(tenant_id)
        .bind(branch_id)
        .bind(email)
        .bind(&password_hash)
        .bind(full_name)
        .bind(role)
        .execute(pool)
        .await?;
    }
    Ok(())
}

async fn seed_customers(pool: &Pool<Postgres>, tenant_id: Uuid, count: usize) -> anyhow::Result<()> {
    let current_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM customers WHERE tenant_id = $1")
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

    if current_count.0 >= count as i64 {
        println!("  - Customers already seeded ({} found)", current_count.0);
        return Ok(());
    }

    println!("  - Seeding {} customers...", count);
    let mut rng = rand::thread_rng();
    let first_names = ["Minh", "An", "Binh", "Chi", "Duy", "Giang", "Hanh", "Khoa", "Linh", "Nam"];
    let last_names = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Phan", "Vu", "Dang", "Bui", "Do"];

    for i in 1..=count {
        let name = format!("{} {}", last_names[rng.gen_range(0..10)], first_names[rng.gen_range(0..10)]);
        let phone = format!("0987654{:03}", i);
        
        sqlx::query("INSERT INTO customers (id, tenant_id, name, phone, points) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING")
            .bind(Uuid::new_v4())
            .bind(tenant_id)
            .bind(name)
            .bind(phone)
            .bind(rng.gen_range(0..1000))
            .execute(pool)
            .await?;
    }
    Ok(())
}
