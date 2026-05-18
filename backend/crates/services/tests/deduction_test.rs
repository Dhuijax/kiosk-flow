use domain::models::inventory::InventoryTransactionType;
use infra::db::{create_pool, run_migrations};
use infra::recipe_repository::RecipeRepository;
use infra::repository::{InventoryRepository, OrderRepository};
use services::deduction::DeductionService;
use sqlx::types::BigDecimal;
use std::sync::Arc;
use uuid::Uuid;

#[tokio::test]
async fn test_served_triggered_bom_deduction_and_rollback() -> anyhow::Result<()> {
    if std::env::var("DATABASE_URL").is_err() {
        println!("Skipping deduction integration test as DATABASE_URL is not set");
        return Ok(());
    }
    let pool = create_pool().await?;
    run_migrations(&pool).await?;

    let tenant_id = Uuid::new_v4();
    let branch_id = Uuid::new_v4();
    let category_id = Uuid::new_v4();

    // 1. Seed Tenant, Branch and Category
    sqlx::query("INSERT INTO tenants (id, name, subdomain) VALUES ($1, $2, $3)")
        .bind(tenant_id)
        .bind("Deduction Tenant")
        .bind(format!("deduct-{}", tenant_id))
        .execute(&pool)
        .await?;

    sqlx::query(
        "INSERT INTO branches (id, tenant_id, name, address, phone) VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(branch_id)
    .bind(tenant_id)
    .bind("Deduction Branch")
    .bind("123 Test St")
    .bind("123456789")
    .execute(&pool)
    .await?;

    // Enable RLS for connection
    let mut tx = pool.begin().await?;
    sqlx::query(&format!("SET LOCAL app.current_tenant = '{}'", tenant_id))
        .execute(&mut *tx)
        .await?;

    sqlx::query("INSERT INTO categories (id, tenant_id, name) VALUES ($1, $2, $3)")
        .bind(category_id)
        .bind(tenant_id)
        .bind("Beverages")
        .execute(&mut *tx)
        .await?;

    // 2. Seed Ingredient and Inventory
    let ingredient_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO ingredients (id, tenant_id, name, unit, cost_price, is_active) VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(ingredient_id)
    .bind(tenant_id)
    .bind("Coffee Beans")
    .bind("gram")
    .bind(BigDecimal::from(100))
    .bind(true)
    .execute(&mut *tx)
    .await?;

    // Seed stock of 1000g Coffee Beans
    let inventory_id = Uuid::new_v4();
    let initial_qty = BigDecimal::from(1000);
    sqlx::query(
        "INSERT INTO inventory (id, tenant_id, branch_id, ingredient_id, quantity, min_quantity) VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(inventory_id)
    .bind(tenant_id)
    .bind(branch_id)
    .bind(ingredient_id)
    .bind(initial_qty)
    .bind(BigDecimal::from(100))
    .execute(&mut *tx)
    .await?;

    // 3. Seed Product
    let product_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO products (id, tenant_id, category_id, sku, name, price, is_active, allow_topping, track_inventory) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
    )
    .bind(product_id)
    .bind(tenant_id)
    .bind(category_id)
    .bind("PROD-ESPRESSO")
    .bind("Espresso")
    .bind(BigDecimal::from(30000))
    .bind(true)
    .bind(true)
    .bind(true)
    .execute(&mut *tx)
    .await?;

    // 4. Seed Recipe (18g Coffee Beans for 1 Espresso)
    sqlx::query(
        "INSERT INTO product_ingredients (tenant_id, product_id, ingredient_id, quantity, is_customizable) VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(tenant_id)
    .bind(product_id)
    .bind(ingredient_id)
    .bind(BigDecimal::from(18))
    .bind(false)
    .execute(&mut *tx)
    .await?;

    // 5. Seed Order (2 Espressos -> deduction should be 2 * 18 = 36g)
    let order_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO orders (id, tenant_id, branch_id, order_number, total, status) VALUES ($1, $2, $3, $4, $5, $6::order_status)"
    )
    .bind(order_id)
    .bind(tenant_id)
    .bind(branch_id)
    .bind("ORD-9999")
    .bind(BigDecimal::from(60000))
    .bind("draft")
    .execute(&mut *tx)
    .await?;

    let order_item_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO order_items (id, order_id, tenant_id, product_id, product_name, unit_price, quantity, subtotal, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::order_item_status)"
    )
    .bind(order_item_id)
    .bind(order_id)
    .bind(tenant_id)
    .bind(product_id)
    .bind("Espresso")
    .bind(BigDecimal::from(30000))
    .bind(2)
    .bind(BigDecimal::from(60000))
    .bind("pending")
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    // 6. Test Services
    let order_repo = Arc::new(OrderRepository::new(pool.clone()));
    let inventory_repo = Arc::new(InventoryRepository::new(pool.clone()));
    let recipe_repo = Arc::new(RecipeRepository::new(pool.clone()));

    let deduction_service = DeductionService::new(
        order_repo.clone(),
        inventory_repo.clone(),
        recipe_repo.clone(),
    );

    // --- PHASE A: Deduct stock ---
    deduction_service
        .deduct_stock_for_order(&tenant_id, &branch_id, &order_id)
        .await?;

    // Check inventory stock: should be 1000 - 36 = 964g
    let mut check_tx = pool.begin().await?;
    sqlx::query(&format!("SET LOCAL app.current_tenant = '{}'", tenant_id))
        .execute(&mut *check_tx)
        .await?;

    let stock_qty: BigDecimal =
        sqlx::query_scalar("SELECT quantity FROM inventory WHERE ingredient_id = $1")
            .bind(ingredient_id)
            .fetch_one(&mut *check_tx)
            .await?;
    assert_eq!(stock_qty, BigDecimal::from(964));

    // Verify double-deduction protection (calling deduct again should do nothing)
    deduction_service
        .deduct_stock_for_order(&tenant_id, &branch_id, &order_id)
        .await?;

    let stock_qty_after_second: BigDecimal =
        sqlx::query_scalar("SELECT quantity FROM inventory WHERE ingredient_id = $1")
            .bind(ingredient_id)
            .fetch_one(&mut *check_tx)
            .await?;
    assert_eq!(stock_qty_after_second, BigDecimal::from(964)); // still 964

    // Check that we have a Sale transaction
    let has_sale = inventory_repo
        .has_transaction_for_reference(&tenant_id, &order_id, InventoryTransactionType::Sale)
        .await?;
    assert!(has_sale);

    // --- PHASE B: Rollback stock ---
    deduction_service
        .rollback_stock_for_order(&tenant_id, &branch_id, &order_id)
        .await?;

    let stock_qty_after_rollback: BigDecimal =
        sqlx::query_scalar("SELECT quantity FROM inventory WHERE ingredient_id = $1")
            .bind(ingredient_id)
            .fetch_one(&mut *check_tx)
            .await?;
    assert_eq!(stock_qty_after_rollback, BigDecimal::from(1000)); // restored to 1000g!

    // Verify double-rollback protection (calling rollback again should do nothing)
    deduction_service
        .rollback_stock_for_order(&tenant_id, &branch_id, &order_id)
        .await?;

    let stock_qty_after_second_rollback: BigDecimal =
        sqlx::query_scalar("SELECT quantity FROM inventory WHERE ingredient_id = $1")
            .bind(ingredient_id)
            .fetch_one(&mut *check_tx)
            .await?;
    assert_eq!(stock_qty_after_second_rollback, BigDecimal::from(1000)); // still 1000

    // Check that we have a Return transaction
    let has_return = inventory_repo
        .has_transaction_for_reference(&tenant_id, &order_id, InventoryTransactionType::Return)
        .await?;
    assert!(has_return);

    check_tx.commit().await?;
    Ok(())
}
