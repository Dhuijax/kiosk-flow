use dotenvy::dotenv;
use infra::db::create_pool;
use infra::security::SecurityService;
use rand::Rng;
use sqlx::{types::BigDecimal, Pool, Postgres, Row};
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    let pool = create_pool().await?;

    println!("🚀 Seeding Data for Demo...");

    let tenant_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001")?;

    // 1. Ensure Tenant & Admin
    ensure_tenant_and_admin(&pool, tenant_id).await?;

    // 2. Get Branches
    let branches = sqlx::query("SELECT id FROM branches WHERE tenant_id = $1")
        .bind(tenant_id)
        .fetch_all(&pool)
        .await?;
    let branch_ids: Vec<Uuid> = branches.into_iter().map(|r| r.get(0)).collect();

    if branch_ids.is_empty() {
        println!("❌ No branches found.");
        return Ok(());
    }

    // 2.5 Seed Products
    seed_products(&pool, tenant_id).await?;

    // 3. Seed Employees (50)
    seed_employees(&pool, tenant_id, &branch_ids, 50).await?;

    // 4. Seed Customers (50)
    seed_customers(&pool, tenant_id, 50).await?;

    // 5. Seed Inventory
    seed_inventory(&pool, tenant_id, &branch_ids).await?;

    // 6. Seed Orders
    seed_orders(&pool, tenant_id, &branch_ids).await?;

    println!("\n✅ All data seeded successfully!");
    Ok(())
}

async fn ensure_tenant_and_admin(pool: &Pool<Postgres>, tenant_id: Uuid) -> anyhow::Result<()> {
    sqlx::query("DELETE FROM tenants WHERE subdomain = 'demo' OR id = $1")
        .bind(tenant_id)
        .execute(pool)
        .await?;
    let exists = sqlx::query("SELECT id FROM tenants WHERE id = $1")
        .bind(tenant_id)
        .fetch_optional(pool)
        .await?;
    if exists.is_none() {
        sqlx::query("INSERT INTO tenants (id, name, subdomain) VALUES ($1, $2, $3)")
            .bind(tenant_id)
            .bind("Demo Store")
            .bind("demo")
            .execute(pool)
            .await?;
    }
    let email = "admin@demo.com";
    let user_exists = sqlx::query("SELECT id FROM users WHERE email = $1 AND tenant_id = $2")
        .bind(email)
        .bind(tenant_id)
        .fetch_optional(pool)
        .await?;
    if user_exists.is_none() {
        let hash = SecurityService::hash_password("password123")?;
        sqlx::query("INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) VALUES ($1, $2, $3, $4, $5, 'owner', true)")
            .bind(Uuid::new_v4()).bind(tenant_id).bind(email).bind(hash).bind("Demo Admin").execute(pool).await?;
    }
    Ok(())
}

async fn seed_products(pool: &Pool<Postgres>, tenant_id: Uuid) -> anyhow::Result<()> {
    let exists = sqlx::query("SELECT id FROM products WHERE tenant_id = $1 LIMIT 1")
        .bind(tenant_id)
        .fetch_optional(pool)
        .await?;
    if exists.is_some() {
        println!("  - Products already seeded.");
        return Ok(());
    }

    println!("  - Seeding products...");

    // Create categories first
    let categories = [
        ("Cà phê", Uuid::new_v4()),
        ("Trà sữa", Uuid::new_v4()),
        ("Bánh ngọt", Uuid::new_v4()),
    ];

    for (name, id) in &categories {
        sqlx::query("INSERT INTO categories (id, tenant_id, name) VALUES ($1, $2, $3)")
            .bind(id)
            .bind(tenant_id)
            .bind(name)
            .execute(pool)
            .await?;
    }

    let products = [
        ("Cà phê đen", "CF001", categories[0].1, 25000.0),
        ("Cà phê sữa", "CF002", categories[0].1, 29000.0),
        ("Trà sữa truyền thống", "TS001", categories[1].1, 35000.0),
        ("Trà sữa matcha", "TS002", categories[1].1, 45000.0),
        ("Croissant", "BN001", categories[2].1, 20000.0),
    ];

    for (name, sku, cat_id, price) in products {
        sqlx::query("INSERT INTO products (id, tenant_id, category_id, sku, name, price, is_active) VALUES ($1, $2, $3, $4, $5, $6, true)")
            .bind(Uuid::new_v4()).bind(tenant_id).bind(cat_id).bind(sku).bind(name).bind(BigDecimal::from(price as i64)).execute(pool).await?;
    }

    Ok(())
}

async fn seed_employees(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    branch_ids: &[Uuid],
    count: usize,
) -> anyhow::Result<()> {
    let current_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role != 'owner'")
            .bind(tenant_id)
            .fetch_one(pool)
            .await?;

    if current_count.0 >= count as i64 {
        println!("  - Users already seeded ({} found)", current_count.0);
        return Ok(());
    }

    println!("  - Seeding {} employees...", count);
    let roles = ["manager", "cashier", "waiter", "chef"];
    let first_names = [
        "Thanh", "Hoang", "Mai", "Lan", "Son", "Phuong", "Tuan", "Huong", "Viet", "Trang",
    ];
    let last_names = [
        "Nguyen", "Tran", "Le", "Pham", "Hoang", "Vu", "Phan", "Dang", "Bui", "Do",
    ];
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

async fn seed_customers(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    count: usize,
) -> anyhow::Result<()> {
    let current_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM customers WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_one(pool)
            .await?;

    if current_count.0 >= count as i64 {
        println!("  - Customers already seeded ({} found)", current_count.0);
        return Ok(());
    }

    println!("  - Seeding {} customers...", count);
    let mut rng = rand::thread_rng();
    let first_names = [
        "Minh", "An", "Binh", "Chi", "Duy", "Giang", "Hanh", "Khoa", "Linh", "Nam",
    ];
    let last_names = [
        "Nguyen", "Tran", "Le", "Pham", "Hoang", "Phan", "Vu", "Dang", "Bui", "Do",
    ];

    for i in 1..=count {
        let name = format!(
            "{} {}",
            last_names[rng.gen_range(0..10)],
            first_names[rng.gen_range(0..10)]
        );
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

async fn seed_inventory(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    branch_ids: &[Uuid],
) -> anyhow::Result<()> {
    let products = sqlx::query("SELECT id FROM products WHERE tenant_id = $1")
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;
    let product_ids: Vec<Uuid> = products.into_iter().map(|r| r.get(0)).collect();

    if product_ids.is_empty() {
        println!("  - Cannot seed inventory: no products found.");
        return Ok(());
    }

    let current_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM inventory WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_one(pool)
            .await?;

    if current_count.0 >= (product_ids.len() * branch_ids.len()) as i64 {
        println!("  - Inventory already seeded.");
        return Ok(());
    }

    println!("  - Seeding inventory...");
    let mut rng = rand::thread_rng();

    for branch_id in branch_ids {
        for product_id in &product_ids {
            let quantity = rng.gen_range(5..150) as i64;
            let min_quantity = rng.gen_range(10..30) as i64;

            let res = sqlx::query(
                "INSERT INTO inventory (id, tenant_id, branch_id, product_id, quantity, min_quantity) 
                 VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (tenant_id, branch_id, product_id) DO NOTHING"
            )
            .bind(Uuid::new_v4())
            .bind(tenant_id)
            .bind(branch_id)
            .bind(product_id)
            .bind(BigDecimal::from(quantity))
            .bind(BigDecimal::from(min_quantity))
            .execute(pool)
            .await?;

            if res.rows_affected() > 0 {
                // Add initial transaction
                sqlx::query(
                    "INSERT INTO inventory_transactions (id, tenant_id, branch_id, product_id, type, quantity_change, note) 
                     VALUES ($1, $2, $3, $4, 'adjustment', $5, 'Initial seeding')"
                )
                .bind(Uuid::new_v4())
                .bind(tenant_id)
                .bind(branch_id)
                .bind(product_id)
                .bind(BigDecimal::from(quantity))
                .execute(pool)
                .await?;
            }
        }
    }
    Ok(())
}

async fn seed_orders(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    branch_ids: &[Uuid],
) -> anyhow::Result<()> {
    let products = sqlx::query("SELECT id, name, price FROM products WHERE tenant_id = $1")
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;
    if products.is_empty() {
        println!("  - Cannot seed orders: no products found.");
        return Ok(());
    }

    let customers = sqlx::query("SELECT id, name FROM customers WHERE tenant_id = $1")
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;
    let users = sqlx::query("SELECT id, full_name FROM users WHERE tenant_id = $1")
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

    let current_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM orders WHERE tenant_id = $1")
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

    if current_count.0 >= 20 {
        println!("  - Orders already seeded ({} found)", current_count.0);
        return Ok(());
    }

    println!("  - Seeding orders...");
    let mut rng = rand::thread_rng();

    for i in 1..=30 {
        let branch_id = branch_ids[rng.gen_range(0..branch_ids.len())];

        let (customer_id, customer_name) = if customers.is_empty() {
            (None, None)
        } else {
            let customer = &customers[rng.gen_range(0..customers.len())];
            (
                Some(customer.get::<Uuid, _>(0)),
                Some(customer.get::<String, _>(1)),
            )
        };

        let (user_id, cashier_name) = if users.is_empty() {
            let admin_id: Uuid = sqlx::query("SELECT id FROM users WHERE email = 'admin@demo.com'")
                .fetch_one(pool)
                .await?
                .get(0);
            (admin_id, "Admin".to_string())
        } else {
            let user = &users[rng.gen_range(0..users.len())];
            (user.get::<Uuid, _>(0), user.get::<String, _>(1))
        };

        let order_id = Uuid::new_v4();
        let order_number = format!("ORD-260511-{:04}", i);

        // Generate items
        let num_items = rng.gen_range(1..5);
        let mut subtotal: i64 = 0;

        for _ in 0..num_items {
            let product = &products[rng.gen_range(0..products.len())];
            let product_id: Uuid = product.get(0);
            let product_name: String = product.get(1);
            let unit_price: BigDecimal = product.get(2);
            let price_i64 = unit_price.to_string().parse::<f64>().unwrap_or(0.0) as i64;

            let qty = rng.gen_range(1..4);
            let item_subtotal = price_i64 * qty as i64;
            subtotal += item_subtotal;

            sqlx::query(
                "INSERT INTO order_items (id, order_id, tenant_id, product_id, product_name, unit_price, quantity, subtotal, status) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'served')"
            )
            .bind(Uuid::new_v4())
            .bind(order_id)
            .bind(tenant_id)
            .bind(product_id)
            .bind(product_name)
            .bind(unit_price)
            .bind(qty)
            .bind(BigDecimal::from(item_subtotal))
            .execute(pool)
            .await?;
        }

        let tax = subtotal / 10;
        let total = subtotal + tax;

        sqlx::query(
            "INSERT INTO orders (id, tenant_id, branch_id, order_number, status, customer_name, customer_id, cashier_name, subtotal, tax_amount, total, created_by) 
             VALUES ($1, $2, $3, $4, 'completed', $5, $6, $7, $8, $9, $10, $11)"
        )
        .bind(order_id)
        .bind(tenant_id)
        .bind(branch_id)
        .bind(order_number)
        .bind(customer_name)
        .bind(customer_id)
        .bind(cashier_name)
        .bind(BigDecimal::from(subtotal))
        .bind(BigDecimal::from(tax))
        .bind(BigDecimal::from(total))
        .bind(user_id)
        .execute(pool)
        .await?;

        // Payment
        sqlx::query(
            "INSERT INTO payments (id, tenant_id, branch_id, order_id, method, amount, received_amount, change_amount, status, created_by) 
             VALUES ($1, $2, $3, $4, 'cash', $5, $6, $7, 'completed', $8)"
        )
        .bind(Uuid::new_v4())
        .bind(tenant_id)
        .bind(branch_id)
        .bind(order_id)
        .bind(BigDecimal::from(total))
        .bind(BigDecimal::from(total))
        .bind(BigDecimal::from(0))
        .bind(user_id)
        .execute(pool)
        .await?;
    }

    Ok(())
}
