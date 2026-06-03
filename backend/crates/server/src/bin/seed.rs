use dotenvy::dotenv;
use infra::db::create_pool;
use infra::security::SecurityService;
use rand::Rng;
use sqlx::{types::BigDecimal, Pool, Postgres, Row};
use std::str::FromStr;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    let pool = create_pool().await?;

    println!("🚀 Seeding Data for Demo...");

    let tenant_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001")?;

    // 1. Ensure Tenant & Admin
    ensure_tenant_and_admin(&pool, tenant_id).await?;

    // 2. Get Branches (Automatically created by PostgreSQL tenant default trigger)
    let branches = sqlx::query("SELECT id FROM branches WHERE tenant_id = $1")
        .bind(tenant_id)
        .fetch_all(&pool)
        .await?;
    let branch_ids: Vec<Uuid> = branches.into_iter().map(|r| r.get(0)).collect();

    if branch_ids.is_empty() {
        println!("❌ No branches found.");
        return Ok(());
    }

    // 3. Seed Products
    seed_products(&pool, tenant_id).await?;

    // 4. Seed Toppings and Junction M2M Product Toppings
    seed_toppings(&pool, tenant_id).await?;

    // 5. Seed Floor Plans and Tables (Grid structures)
    seed_table_service(&pool, tenant_id, &branch_ids).await?;

    // 6. Seed Employees (50)
    seed_employees(&pool, tenant_id, &branch_ids, 50).await?;

    // 7. Seed Customers (50)
    seed_customers(&pool, tenant_id, 50).await?;

    // 8. Seed Ingredients and Recipes (BOM structures)
    seed_recipes(&pool, tenant_id).await?;

    // 9. Seed Inventory (For both products and ingredients with partial indexes)
    seed_inventory(&pool, tenant_id, &branch_ids).await?;

    // 10. Seed Procurement (Suppliers, POs, alerts)
    seed_procurement(&pool, tenant_id, &branch_ids).await?;

    // 11. Seed SaaS Billing (Subscription and billing transactions)
    seed_billing(&pool, tenant_id).await?;

    // 12. Seed Storefront CMS
    seed_storefront_cms(&pool, tenant_id).await?;

    // 13. Seed Orders (Orders, order items, toppings, table mapping, payments)
    seed_orders(&pool, tenant_id, &branch_ids).await?;

    println!("\n✅ All data seeded successfully!");
    Ok(())
}

async fn ensure_tenant_and_admin(pool: &Pool<Postgres>, tenant_id: Uuid) -> anyhow::Result<()> {
    // Delete existing demo tenant (will cascade delete related entries)
    sqlx::query("DELETE FROM tenants WHERE subdomain = 'demo' OR id = $1")
        .bind(tenant_id)
        .execute(pool)
        .await?;

    // Create new demo tenant
    sqlx::query("INSERT INTO tenants (id, name, subdomain) VALUES ($1, $2, $3)")
        .bind(tenant_id)
        .bind("Demo Store")
        .bind("demo")
        .execute(pool)
        .await?;

    let email = "admin@demo.com";
    let hash = SecurityService::hash_password("password123")?;

    sqlx::query(
        "INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active) \
         VALUES ($1, $2, $3, $4, $5, 'owner', true)",
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(email)
    .bind(hash)
    .bind("Demo Admin")
    .execute(pool)
    .await?;

    Ok(())
}

async fn seed_products(pool: &Pool<Postgres>, tenant_id: Uuid) -> anyhow::Result<()> {
    println!("  - Seeding categories and products...");

    // Create categories
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

    // Create products
    let products = [
        (
            "Cà phê đen",
            "CF001",
            categories[0].1,
            25000.0,
            "Cà phê Robusta rang đậm pha phin truyền thống mạnh mẽ.",
            "Ly",
        ),
        (
            "Cà phê sữa",
            "CF002",
            categories[0].1,
            29000.0,
            "Cà phê phin kết hợp sữa đặc Ông Thọ béo ngậy quyến rũ.",
            "Ly",
        ),
        (
            "Trà sữa truyền thống",
            "TS001",
            categories[1].1,
            35000.0,
            "Trà đen chọn lọc pha sữa thơm béo kèm trân châu giòn sần sật.",
            "Ly",
        ),
        (
            "Trà sữa matcha",
            "TS002",
            categories[1].1,
            45000.0,
            "Bột trà xanh Uji nhập khẩu trực tiếp từ Nhật Bản hòa quyện sữa tươi thanh trùng.",
            "Ly",
        ),
        (
            "Croissant",
            "BN001",
            categories[2].1,
            20000.0,
            "Bánh sừng bò ngàn lớp thơm bơ tỏi giòn tan từ Pháp.",
            "Cái",
        ),
    ];

    for (name, sku, cat_id, price, desc, unit) in products {
        sqlx::query(
            "INSERT INTO products (id, tenant_id, category_id, sku, name, price, description, unit, is_active, allow_topping, track_inventory) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, true)"
        )
        .bind(Uuid::new_v4())
        .bind(tenant_id)
        .bind(cat_id)
        .bind(sku)
        .bind(name)
        .bind(BigDecimal::from(price as i64))
        .bind(desc)
        .bind(unit)
        .execute(pool)
        .await?;
    }

    Ok(())
}

async fn seed_toppings(pool: &Pool<Postgres>, tenant_id: Uuid) -> anyhow::Result<()> {
    println!("  - Seeding toppings...");
    let toppings = [
        ("Trân châu đen", 5000.0),
        ("Trân châu trắng", 5000.0),
        ("Kem phô mai", 10000.0),
        ("Thạch sương sáo", 5000.0),
        ("Extra Espresso Shot", 10000.0),
    ];

    let mut topping_ids = Vec::new();
    for (name, price) in toppings {
        let topping_id = Uuid::new_v4();
        sqlx::query("INSERT INTO toppings (id, tenant_id, name, price, is_active) VALUES ($1, $2, $3, $4, true)")
            .bind(topping_id)
            .bind(tenant_id)
            .bind(name)
            .bind(BigDecimal::from(price as i64))
            .execute(pool)
            .await?;
        topping_ids.push((name, topping_id));
    }

    // Link toppings to products
    let products = sqlx::query("SELECT id, name FROM products WHERE tenant_id = $1")
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

    for product in products {
        let product_id: Uuid = product.get(0);
        let product_name: String = product.get(1);

        if product_name.contains("Trà sữa") {
            for (name, tid) in &topping_ids {
                if *name != "Extra Espresso Shot" {
                    sqlx::query("INSERT INTO product_toppings (product_id, topping_id) VALUES ($1, $2) ON CONFLICT DO NOTHING")
                        .bind(product_id)
                        .bind(tid)
                        .execute(pool)
                        .await?;
                }
            }
        } else if product_name.contains("Cà phê") {
            for (name, tid) in &topping_ids {
                if *name == "Extra Espresso Shot" {
                    sqlx::query("INSERT INTO product_toppings (product_id, topping_id) VALUES ($1, $2) ON CONFLICT DO NOTHING")
                        .bind(product_id)
                        .bind(tid)
                        .execute(pool)
                        .await?;
                }
            }
        }
    }

    Ok(())
}

async fn seed_table_service(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    branch_ids: &[Uuid],
) -> anyhow::Result<()> {
    println!("  - Seeding floor plans and tables...");

    for &branch_id in branch_ids {
        // Floor Plan 1: Tầng 1 (Trong nhà)
        let fp1_id = Uuid::new_v4();
        sqlx::query("INSERT INTO floor_plans (id, tenant_id, branch_id, name, layout_data) VALUES ($1, $2, $3, $4, $5)")
            .bind(fp1_id)
            .bind(tenant_id)
            .bind(branch_id)
            .bind("Tầng 1 (Trong nhà)")
            .bind(serde_json::json!({ "columns": 5, "rows": 5 }))
            .execute(pool)
            .await?;

        // Add 12 tables for Floor Plan 1
        let mut count1 = 1;
        for y in 1..=4 {
            for x in 1..=3 {
                let table_id = Uuid::new_v4();
                let name = format!("Bàn {:02}", count1);
                let capacity = if count1 % 3 == 0 { 4 } else { 2 };
                let status = if count1 == 3 {
                    "occupied"
                } else if count1 == 7 {
                    "reserved"
                } else {
                    "available"
                };

                sqlx::query(
                    "INSERT INTO tables (id, tenant_id, branch_id, floor_plan_id, name, capacity, position_x, position_y, status) \
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::table_status)"
                )
                .bind(table_id)
                .bind(tenant_id)
                .bind(branch_id)
                .bind(fp1_id)
                .bind(name)
                .bind(capacity)
                .bind(x)
                .bind(y)
                .bind(status)
                .execute(pool)
                .await?;
                count1 += 1;
            }
        }

        // Floor Plan 2: Sân vườn (Ngoài trời)
        let fp2_id = Uuid::new_v4();
        sqlx::query("INSERT INTO floor_plans (id, tenant_id, branch_id, name, layout_data) VALUES ($1, $2, $3, $4, $5)")
            .bind(fp2_id)
            .bind(tenant_id)
            .bind(branch_id)
            .bind("Sân vườn (Ngoài trời)")
            .bind(serde_json::json!({ "columns": 4, "rows": 4 }))
            .execute(pool)
            .await?;

        // Add 8 tables for Floor Plan 2
        let mut count2 = 1;
        for y in 1..=3 {
            for x in 1..=3 {
                if x == 2 && y == 2 {
                    continue;
                } // Keep center free
                let table_id = Uuid::new_v4();
                let name = format!("Sân Vườn {:02}", count2);
                let capacity = if count2 % 2 == 0 { 6 } else { 4 };
                let status = if count2 == 2 { "occupied" } else { "available" };

                sqlx::query(
                    "INSERT INTO tables (id, tenant_id, branch_id, floor_plan_id, name, capacity, position_x, position_y, status) \
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::table_status)"
                )
                .bind(table_id)
                .bind(tenant_id)
                .bind(branch_id)
                .bind(fp2_id)
                .bind(name)
                .bind(capacity)
                .bind(x)
                .bind(y)
                .bind(status)
                .execute(pool)
                .await?;
                count2 += 1;
            }
        }
    }

    Ok(())
}

async fn seed_employees(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    branch_ids: &[Uuid],
    count: usize,
) -> anyhow::Result<()> {
    println!("  - Seeding {} employees...", count);
    let roles = ["manager", "cashier", "waiter", "chef"];
    let first_names = [
        "Thanh", "Hoàng", "Mai", "Lan", "Sơn", "Phương", "Tuấn", "Hương", "Việt", "Trang",
    ];
    let last_names = [
        "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Phan", "Đặng", "Bùi", "Đỗ",
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
    println!("  - Seeding {} customers...", count);
    let mut rng = rand::thread_rng();
    let first_names = [
        "Minh", "An", "Bình", "Chi", "Duy", "Giang", "Hạnh", "Khoa", "Linh", "Nam",
    ];
    let last_names = [
        "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Đặng", "Bùi", "Đỗ",
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

fn to_bigdecimal(val: f64) -> BigDecimal {
    BigDecimal::from_str(&val.to_string()).unwrap_or_default()
}

async fn seed_recipes(pool: &Pool<Postgres>, tenant_id: Uuid) -> anyhow::Result<()> {
    println!("  - Seeding ingredients and recipes...");

    // Ingredients
    let ingredients = [
        ("Hạt cà phê Robusta", "kg", 120000.0),
        ("Hạt cà phê Arabica", "kg", 180000.0),
        ("Sữa đặc Ông Thọ", "can", 18000.0),
        ("Sữa tươi thanh trùng", "L", 35000.0),
        ("Bột Matcha Uji", "kg", 1200000.0),
        ("Trà đen nguyên lá", "kg", 150000.0),
        ("Đường nước", "L", 25000.0),
    ];

    let mut ingredient_ids = Vec::new();
    for (name, unit, cost) in ingredients {
        let ing_id = Uuid::new_v4();
        sqlx::query("INSERT INTO ingredients (id, tenant_id, name, unit, cost_price, is_active) VALUES ($1, $2, $3, $4, $5, true)")
            .bind(ing_id)
            .bind(tenant_id)
            .bind(name)
            .bind(unit)
            .bind(BigDecimal::from(cost as i64))
            .execute(pool)
            .await?;
        ingredient_ids.push((name, ing_id));
    }

    // Get products to map recipes
    let products = sqlx::query("SELECT id, name FROM products WHERE tenant_id = $1")
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

    for product in products {
        let product_id: Uuid = product.get(0);
        let product_name: String = product.get(1);

        if product_name == "Cà phê đen" {
            // 20g Robusta, 5g Arabica
            if let Some(robusta_id) = ingredient_ids
                .iter()
                .find(|(name, _)| *name == "Hạt cà phê Robusta")
                .map(|(_, id)| id)
            {
                sqlx::query("INSERT INTO product_ingredients (product_id, ingredient_id, tenant_id, quantity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING")
                    .bind(product_id).bind(robusta_id).bind(tenant_id).bind(to_bigdecimal(0.020)).execute(pool).await?;
            }
            if let Some(arabica_id) = ingredient_ids
                .iter()
                .find(|(name, _)| *name == "Hạt cà phê Arabica")
                .map(|(_, id)| id)
            {
                sqlx::query("INSERT INTO product_ingredients (product_id, ingredient_id, tenant_id, quantity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING")
                    .bind(product_id).bind(arabica_id).bind(tenant_id).bind(to_bigdecimal(0.005)).execute(pool).await?;
            }
        } else if product_name == "Cà phê sữa" {
            // 15g Robusta, 5g Arabica, 30g Condensed Milk (approx 0.08 can)
            if let Some(robusta_id) = ingredient_ids
                .iter()
                .find(|(name, _)| *name == "Hạt cà phê Robusta")
                .map(|(_, id)| id)
            {
                sqlx::query("INSERT INTO product_ingredients (product_id, ingredient_id, tenant_id, quantity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING")
                    .bind(product_id).bind(robusta_id).bind(tenant_id).bind(to_bigdecimal(0.015)).execute(pool).await?;
            }
            if let Some(arabica_id) = ingredient_ids
                .iter()
                .find(|(name, _)| *name == "Hạt cà phê Arabica")
                .map(|(_, id)| id)
            {
                sqlx::query("INSERT INTO product_ingredients (product_id, ingredient_id, tenant_id, quantity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING")
                    .bind(product_id).bind(arabica_id).bind(tenant_id).bind(to_bigdecimal(0.005)).execute(pool).await?;
            }
            if let Some(milk_id) = ingredient_ids
                .iter()
                .find(|(name, _)| *name == "Sữa đặc Ông Thọ")
                .map(|(_, id)| id)
            {
                sqlx::query("INSERT INTO product_ingredients (product_id, ingredient_id, tenant_id, quantity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING")
                    .bind(product_id).bind(milk_id).bind(tenant_id).bind(to_bigdecimal(0.080)).execute(pool).await?;
            }
        } else if product_name == "Trà sữa truyền thống" {
            // 10g Black Tea Leaves (0.010 kg), 40ml Fresh Milk (0.040 L), 20ml Liquid Sugar (0.020 L)
            if let Some(tea_id) = ingredient_ids
                .iter()
                .find(|(name, _)| *name == "Trà đen nguyên lá")
                .map(|(_, id)| id)
            {
                sqlx::query("INSERT INTO product_ingredients (product_id, ingredient_id, tenant_id, quantity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING")
                    .bind(product_id).bind(tea_id).bind(tenant_id).bind(to_bigdecimal(0.010)).execute(pool).await?;
            }
            if let Some(milk_id) = ingredient_ids
                .iter()
                .find(|(name, _)| *name == "Sữa tươi thanh trùng")
                .map(|(_, id)| id)
            {
                sqlx::query("INSERT INTO product_ingredients (product_id, ingredient_id, tenant_id, quantity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING")
                    .bind(product_id).bind(milk_id).bind(tenant_id).bind(to_bigdecimal(0.040)).execute(pool).await?;
            }
            if let Some(sugar_id) = ingredient_ids
                .iter()
                .find(|(name, _)| *name == "Đường nước")
                .map(|(_, id)| id)
            {
                sqlx::query("INSERT INTO product_ingredients (product_id, ingredient_id, tenant_id, quantity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING")
                    .bind(product_id).bind(sugar_id).bind(tenant_id).bind(to_bigdecimal(0.020)).execute(pool).await?;
            }
        } else if product_name == "Trà sữa matcha" {
            // 5g Matcha Powder (0.005 kg), 50ml Fresh Milk (0.050 L), 15ml Liquid Sugar (0.015 L)
            if let Some(matcha_id) = ingredient_ids
                .iter()
                .find(|(name, _)| *name == "Bột Matcha Uji")
                .map(|(_, id)| id)
            {
                sqlx::query("INSERT INTO product_ingredients (product_id, ingredient_id, tenant_id, quantity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING")
                    .bind(product_id).bind(matcha_id).bind(tenant_id).bind(to_bigdecimal(0.005)).execute(pool).await?;
            }
            if let Some(milk_id) = ingredient_ids
                .iter()
                .find(|(name, _)| *name == "Sữa tươi thanh trùng")
                .map(|(_, id)| id)
            {
                sqlx::query("INSERT INTO product_ingredients (product_id, ingredient_id, tenant_id, quantity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING")
                    .bind(product_id).bind(milk_id).bind(tenant_id).bind(to_bigdecimal(0.050)).execute(pool).await?;
            }
            if let Some(sugar_id) = ingredient_ids
                .iter()
                .find(|(name, _)| *name == "Đường nước")
                .map(|(_, id)| id)
            {
                sqlx::query("INSERT INTO product_ingredients (product_id, ingredient_id, tenant_id, quantity) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING")
                    .bind(product_id).bind(sugar_id).bind(tenant_id).bind(to_bigdecimal(0.015)).execute(pool).await?;
            }
        }
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

    let ingredients = sqlx::query("SELECT id FROM ingredients WHERE tenant_id = $1")
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;
    let ingredient_ids: Vec<Uuid> = ingredients.into_iter().map(|r| r.get(0)).collect();

    println!("  - Seeding inventory for products and ingredients...");
    let mut rng = rand::thread_rng();

    for &branch_id in branch_ids {
        // 1. Seed Product Inventory
        for &product_id in &product_ids {
            let quantity = rng.gen_range(50..150) as i64;
            let min_quantity = rng.gen_range(10..30) as i64;

            let res = sqlx::query(
                "INSERT INTO inventory (id, tenant_id, branch_id, product_id, quantity, min_quantity) \
                 VALUES ($1, $2, $3, $4, $5, $6) \
                 ON CONFLICT (tenant_id, branch_id, product_id) WHERE product_id IS NOT NULL DO NOTHING"
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
                sqlx::query(
                    "INSERT INTO inventory_transactions (id, tenant_id, branch_id, product_id, type, quantity_change, note) \
                     VALUES ($1, $2, $3, $4, 'adjustment', $5, 'Initial product seeding')"
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

        // 2. Seed Ingredient Inventory
        for &ingredient_id in &ingredient_ids {
            let quantity = rng.gen_range(100..500) as i64;
            let min_quantity = rng.gen_range(20..50) as i64;

            let res = sqlx::query(
                "INSERT INTO inventory (id, tenant_id, branch_id, ingredient_id, quantity, min_quantity) \
                 VALUES ($1, $2, $3, $4, $5, $6) \
                 ON CONFLICT (tenant_id, branch_id, ingredient_id) WHERE ingredient_id IS NOT NULL DO NOTHING"
            )
            .bind(Uuid::new_v4())
            .bind(tenant_id)
            .bind(branch_id)
            .bind(ingredient_id)
            .bind(BigDecimal::from(quantity))
            .bind(BigDecimal::from(min_quantity))
            .execute(pool)
            .await?;

            if res.rows_affected() > 0 {
                sqlx::query(
                    "INSERT INTO inventory_transactions (id, tenant_id, branch_id, ingredient_id, type, quantity_change, note) \
                     VALUES ($1, $2, $3, $4, 'adjustment', $5, 'Initial ingredient seeding')"
                )
                .bind(Uuid::new_v4())
                .bind(tenant_id)
                .bind(branch_id)
                .bind(ingredient_id)
                .bind(BigDecimal::from(quantity))
                .execute(pool)
                .await?;
            }
        }
    }
    Ok(())
}

async fn seed_procurement(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    branch_ids: &[Uuid],
) -> anyhow::Result<()> {
    println!("  - Seeding procurement data (suppliers, POs, alerts)...");

    // Suppliers
    let suppliers = [
        (
            "Công ty Cà phê Trung Nguyên",
            "0901234567",
            "contact@trungnguyen.com.vn",
            "82-84 Bùi Thị Xuân, Phường Bến Thành, Quận 1, TP. HCM",
        ),
        (
            "Nhà phân phối Sữa Vinamilk",
            "0909876543",
            "sales@vinamilk.com.vn",
            "10 Tân Trào, Phường Tân Phú, Quận 7, TP. HCM",
        ),
        (
            "Tổng đại lý Nguyên liệu Trà sữa Đạt Phú",
            "0988776655",
            "datphu@milkteasupplies.vn",
            "142/5 Nguyễn Thị Thập, Quận 7, TP. HCM",
        ),
    ];

    let mut supplier_ids = Vec::new();
    for (name, phone, email, address) in suppliers {
        let sup_id = Uuid::new_v4();
        sqlx::query("INSERT INTO suppliers (id, tenant_id, name, phone, email, address) VALUES ($1, $2, $3, $4, $5, $6)")
            .bind(sup_id)
            .bind(tenant_id)
            .bind(name)
            .bind(phone)
            .bind(email)
            .bind(address)
            .execute(pool)
            .await?;
        supplier_ids.push((name, sup_id));
    }

    // Get ingredients
    let ingredients =
        sqlx::query("SELECT id, name, cost_price FROM ingredients WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_all(pool)
            .await?;

    // Get admin user
    let admin_id: Uuid = sqlx::query("SELECT id FROM users WHERE email = 'admin@demo.com'")
        .fetch_one(pool)
        .await?
        .get(0);

    let mut rng = rand::thread_rng();

    for &branch_id in branch_ids {
        // Create 2-3 POs
        for (sup_name, sup_id) in &supplier_ids {
            let po_id = Uuid::new_v4();
            let mut total_amount = 0.0;

            // Purchase relevant ingredients
            let purchased_items: Vec<(Uuid, f64, f64)> = ingredients
                .iter()
                .filter(|row| {
                    let ing_name: String = row.get(1);
                    (*sup_name == "Công ty Cà phê Trung Nguyên" && ing_name.contains("cà phê"))
                        || (*sup_name == "Nhà phân phối Sữa Vinamilk" && ing_name.contains("Sữa"))
                        || (*sup_name == "Tổng đại lý Nguyên liệu Trà sữa Đạt Phú"
                            && (ing_name.contains("Trà")
                                || ing_name.contains("Matcha")
                                || ing_name.contains("Đường")))
                })
                .map(|row| {
                    let ing_id: Uuid = row.get(0);
                    let cost_price: BigDecimal = row.get(2);
                    let cost = cost_price.to_string().parse::<f64>().unwrap_or(0.0);
                    let qty = rng.gen_range(10..50) as f64;
                    (ing_id, qty, cost)
                })
                .collect();

            if purchased_items.is_empty() {
                continue;
            }

            for &(_, qty, cost) in &purchased_items {
                total_amount += qty * cost;
            }

            // Insert PO
            sqlx::query("INSERT INTO purchase_orders (id, tenant_id, branch_id, supplier_id, total_amount, created_by) VALUES ($1, $2, $3, $4, $5, $6)")
                .bind(po_id)
                .bind(tenant_id)
                .bind(branch_id)
                .bind(sup_id)
                .bind(BigDecimal::from(total_amount as i64))
                .bind(admin_id)
                .execute(pool)
                .await?;

            // Insert PO items
            for &(ing_id, qty, cost) in &purchased_items {
                sqlx::query("INSERT INTO purchase_order_items (id, tenant_id, purchase_order_id, ingredient_id, quantity, unit_price) VALUES ($1, $2, $3, $4, $5, $6)")
                    .bind(Uuid::new_v4())
                    .bind(tenant_id)
                    .bind(po_id)
                    .bind(ing_id)
                    .bind(to_bigdecimal(qty))
                    .bind(BigDecimal::from(cost as i64))
                    .execute(pool)
                    .await?;
            }
        }

        // Seed stock alert
        if !ingredients.is_empty() {
            let alert_ing = &ingredients[rng.gen_range(0..ingredients.len())];
            let ing_id: Uuid = alert_ing.get(0);
            let ing_name: String = alert_ing.get(1);

            sqlx::query("INSERT INTO stock_alerts (id, tenant_id, branch_id, ingredient_id, message, is_read) VALUES ($1, $2, $3, $4, $5, false)")
                .bind(Uuid::new_v4())
                .bind(tenant_id)
                .bind(branch_id)
                .bind(ing_id)
                .bind(format!("Nguyên liệu '{}' sắp hết hàng! Vui lòng tạo yêu cầu nhập kho bổ sung.", ing_name))
                .execute(pool)
                .await?;
        }
    }

    Ok(())
}

async fn seed_billing(pool: &Pool<Postgres>, tenant_id: Uuid) -> anyhow::Result<()> {
    println!("  - Seeding SaaS billing data (subscriptions, billing transactions)...");

    // Insert Tenant Subscription
    let expires_at = chrono::Utc::now() + chrono::Duration::days(365);
    sqlx::query(
        "INSERT INTO tenant_subscriptions (id, tenant_id, plan_type, status, expires_at, max_tables, max_products) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind("PRO")
    .bind("ACTIVE")
    .bind(expires_at)
    .bind(50)
    .bind(100)
    .execute(pool)
    .await?;

    // Insert Billing Transactions
    sqlx::query(
        "INSERT INTO billing_transactions (id, tenant_id, amount, gateway, transaction_id, status) \
         VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(BigDecimal::from(12000000_i64)) // 12,000,000 VND
    .bind("VNPAY")
    .bind("VNPAY-TXN-987654321")
    .bind("SUCCESS")
    .execute(pool)
    .await?;

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

    let toppings_rows = sqlx::query("SELECT id, name, price FROM toppings WHERE tenant_id = $1")
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

    println!("  - Seeding orders and transactions...");
    let mut rng = rand::thread_rng();

    for i in 1..=40 {
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

        // Generate items in memory first to compute totals correctly before inserting
        let num_items = rng.gen_range(1..4);
        let mut subtotal: i64 = 0;
        let mut items_to_insert = Vec::new();
        let mut toppings_to_insert = Vec::new();

        for _ in 0..num_items {
            let product = &products[rng.gen_range(0..products.len())];
            let product_id: Uuid = product.get(0);
            let product_name: String = product.get(1);
            let unit_price: BigDecimal = product.get(2);
            let price_i64 = unit_price.to_string().parse::<f64>().unwrap_or(0.0) as i64;

            let qty = rng.gen_range(1..3);
            let item_subtotal = price_i64 * qty as i64;
            subtotal += item_subtotal;

            let order_item_id = Uuid::new_v4();
            items_to_insert.push((
                order_item_id,
                product_id,
                product_name.clone(),
                unit_price,
                qty,
                item_subtotal,
            ));

            // Add toppings to milk tea or coffee
            if (product_name.contains("Trà sữa") || product_name.contains("Cà phê"))
                && !toppings_rows.is_empty()
            {
                let num_toppings = rng.gen_range(0..3);
                for _ in 0..num_toppings {
                    let topping = &toppings_rows[rng.gen_range(0..toppings_rows.len())];
                    let topping_id: Uuid = topping.get(0);
                    let topping_name: String = topping.get(1);
                    let topping_price: BigDecimal = topping.get(2);
                    let t_price_i64 =
                        topping_price.to_string().parse::<f64>().unwrap_or(0.0) as i64;

                    if product_name.contains("Trà sữa") && topping_name == "Extra Espresso Shot"
                    {
                        continue;
                    }
                    if product_name.contains("Cà phê") && topping_name != "Extra Espresso Shot" {
                        continue;
                    }

                    toppings_to_insert.push((
                        Uuid::new_v4(),
                        order_item_id,
                        topping_id,
                        topping_name,
                        topping_price,
                    ));
                    subtotal += t_price_i64 * qty as i64;
                }
            }
        }

        let tax = subtotal / 10;
        let total = subtotal + tax;

        // Fetch a random table
        let table_id = if rng.gen_bool(0.7) {
            let tables = sqlx::query("SELECT id FROM tables WHERE tenant_id = $1 LIMIT 5")
                .bind(tenant_id)
                .fetch_all(pool)
                .await?;
            if !tables.is_empty() {
                Some(tables[rng.gen_range(0..tables.len())].get::<Uuid, _>(0))
            } else {
                None
            }
        } else {
            None
        };

        // 1. Insert Order first (violates no foreign key constraint)
        sqlx::query(
            "INSERT INTO orders (id, tenant_id, branch_id, table_id, order_number, status, customer_name, customer_id, cashier_name, subtotal, tax_amount, total, created_by) \
             VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, $8, $9, $10, $11, $12)"
        )
        .bind(order_id)
        .bind(tenant_id)
        .bind(branch_id)
        .bind(table_id)
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

        // 2. Insert Order Items
        for (item_id, prod_id, prod_name, u_price, quantity, item_sub) in items_to_insert {
            sqlx::query(
                "INSERT INTO order_items (id, order_id, tenant_id, product_id, product_name, unit_price, quantity, subtotal, status) \
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'served')"
            )
            .bind(item_id)
            .bind(order_id)
            .bind(tenant_id)
            .bind(prod_id)
            .bind(prod_name)
            .bind(u_price)
            .bind(quantity)
            .bind(BigDecimal::from(item_sub))
            .execute(pool)
            .await?;
        }

        // 3. Insert Order Item Toppings
        for (t_item_id, item_id, top_id, top_name, top_price) in toppings_to_insert {
            sqlx::query(
                "INSERT INTO order_item_toppings (id, order_item_id, tenant_id, topping_id, name, price) \
                 VALUES ($1, $2, $3, $4, $5, $6)"
            )
            .bind(t_item_id)
            .bind(item_id)
            .bind(tenant_id)
            .bind(top_id)
            .bind(top_name)
            .bind(top_price)
            .execute(pool)
            .await?;
        }

        // 4. Insert Payment
        let methods = ["cash", "card", "transfer", "momo", "zalopay"];
        let method = methods[rng.gen_range(0..methods.len())];

        sqlx::query(
            "INSERT INTO payments (id, tenant_id, branch_id, order_id, method, amount, received_amount, change_amount, status, created_by) \
             VALUES ($1, $2, $3, $4, $5::payment_method, $6, $7, $8, 'completed', $9)"
        )
        .bind(Uuid::new_v4())
        .bind(tenant_id)
        .bind(branch_id)
        .bind(order_id)
        .bind(method)
        .bind(BigDecimal::from(total))
        .bind(BigDecimal::from(total))
        .bind(BigDecimal::from(0))
        .bind(user_id)
        .execute(pool)
        .await?;
    }

    Ok(())
}

async fn seed_storefront_cms(pool: &Pool<Postgres>, tenant_id: Uuid) -> anyhow::Result<()> {
    println!("  - Seeding storefront CMS data (promotions, news, partners, announcements)...");

    // Clear old data first to avoid duplicate primary key or unique errors on re-seed
    sqlx::query("DELETE FROM promotions WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(pool)
        .await?;
    sqlx::query("DELETE FROM news WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(pool)
        .await?;
    sqlx::query("DELETE FROM partners WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(pool)
        .await?;
    sqlx::query("DELETE FROM announcements WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(pool)
        .await?;

    let now = chrono::Utc::now();
    let start_date = now - chrono::Duration::days(1);
    let end_date = now + chrono::Duration::days(30);

    // 1. Seed Promotions
    sqlx::query(
        "INSERT INTO promotions (id, tenant_id, title, description, code, discount_percent, discount_amount, start_date, end_date, is_active) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind("Giảm 10% Tổng Hóa Đơn")
    .bind(Some("Nhập mã KM10 để được giảm 10% tổng giá trị hóa đơn cho lần đặt bàn tiếp theo."))
    .bind("KM10")
    .bind(Some(10))
    .bind(None::<i64>)
    .bind(start_date)
    .bind(end_date)
    .execute(pool)
    .await?;

    sqlx::query(
        "INSERT INTO promotions (id, tenant_id, title, description, code, discount_percent, discount_amount, start_date, end_date, is_active) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind("Tặng Bánh Ngọt Cho Tiệc Sinh Nhật")
    .bind(Some("Ưu đãi đặc biệt: Tặng kèm 01 phần bánh Croissant bơ tỏi thơm giòn khi đặt bàn tiệc sinh nhật từ 4 người trở lên."))
    .bind("SINHNHAT")
    .bind(None::<i32>)
    .bind(Some(20000))
    .bind(start_date)
    .bind(end_date)
    .execute(pool)
    .await?;

    // 2. Seed News
    sqlx::query(
        "INSERT INTO news (id, tenant_id, title, summary, content, author, image_url) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind("Ra Mắt Menu Đồ Uống Mùa Hè 2026")
    .bind(Some("Khám phá hương vị tươi mát mới từ dòng Trà Trái Cây và Matcha Latte đá xay cực đã."))
    .bind("Mùa hè này, chúng tôi mang đến cho bạn bộ sưu tập đồ uống hoàn toàn mới với các nguyên liệu trái cây nhiệt đới tươi ngon và Matcha Uji hảo hạng giúp giải nhiệt tức thì. Menu mới đã chính thức có mặt tại tất cả các chi nhánh từ ngày 01/06/2026.")
    .bind(Some("Bếp Trưởng"))
    .bind(Some("https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80"))
    .execute(pool)
    .await?;

    sqlx::query(
        "INSERT INTO news (id, tenant_id, title, summary, content, author, image_url) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind("Câu Chuyện Thương Hiệu KioskFlow Bistro")
    .bind(Some("Hành trình từ một quán cà phê phin nhỏ ở lòng Sài Gòn đến chuỗi Bistro hiện đại, ấm cúng."))
    .bind("Khởi nguồn từ niềm đam mê hạt Robusta đậm đà rang mộc, chúng tôi đã xây dựng nên không gian thưởng thức ẩm thực kết hợp giữa cafe truyền thống Việt Nam và các món bánh sừng bò chuẩn Âu thơm ngậy. Sự hài lòng của quý khách là động lực phát triển mỗi ngày của chúng tôi.")
    .bind(Some("Nhà Sáng Lập"))
    .bind(Some("https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80"))
    .execute(pool)
    .await?;

    // 3. Seed Partners
    sqlx::query(
        "INSERT INTO partners (id, tenant_id, name, logo_url, website_url) \
         VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind("Vinamilk")
    .bind(Some("https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Vinamilk_logo.svg/320px-Vinamilk_logo.svg.png"))
    .bind(Some("https://www.vinamilk.com.vn"))
    .execute(pool)
    .await?;

    sqlx::query(
        "INSERT INTO partners (id, tenant_id, name, logo_url, website_url) \
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind("Momo E-Wallet")
    .bind(Some(
        "https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png",
    ))
    .bind(Some("https://momo.vn"))
    .execute(pool)
    .await?;

    // 4. Seed Announcements
    sqlx::query(
        "INSERT INTO announcements (id, tenant_id, title, content, level, start_date, end_date) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind("Lịch Bảo Trì Hệ Thống Đặt Bàn")
    .bind("Hệ thống đặt bàn trực tuyến sẽ được bảo trì định kỳ từ 23:00 ngày 10/06 đến 02:00 ngày 11/06. Quý khách vui lòng liên hệ hotline chi nhánh trong thời gian này.")
    .bind("warning")
    .bind(start_date)
    .bind(end_date)
    .execute(pool)
    .await?;

    sqlx::query(
        "INSERT INTO announcements (id, tenant_id, title, content, level, start_date, end_date) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind("Khai Trương Chi Nhánh 3 Tại Quận 2")
    .bind("KioskFlow Bistro chính thức khai trương chi nhánh mới tại số 45 Song Hành, Thảo Điền, Quận 2 vào ngày 15/06/2026 với ưu đãi mua 1 tặng 1 toàn bộ menu uống.")
    .bind("info")
    .bind(start_date)
    .bind(end_date)
    .execute(pool)
    .await?;

    Ok(())
}
