use dotenvy::dotenv;
use infra::db::{create_pool, run_migrations};
use uuid::Uuid;

#[tokio::test]
async fn test_tenant_rls_isolation() -> anyhow::Result<()> {
    dotenv().ok();
    if std::env::var("DATABASE_URL").is_err() {
        println!("Skipping RLS integration test as DATABASE_URL is not set");
        return Ok(());
    }
    let pool = create_pool().await?;
    run_migrations(&pool).await?;

    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();

    // 1. Seed Tenants
    sqlx::query!(
        "INSERT INTO tenants (id, name, subdomain) VALUES ($1, $2, $3)",
        tenant_a,
        "Tenant A",
        format!("a-{}", tenant_a)
    )
    .execute(&pool)
    .await?;
    sqlx::query!(
        "INSERT INTO tenants (id, name, subdomain) VALUES ($1, $2, $3)",
        tenant_b,
        "Tenant B",
        format!("b-{}", tenant_b)
    )
    .execute(&pool)
    .await?;

    // 2. Insert category for Tenant A
    sqlx::query!(
        "INSERT INTO categories (id, tenant_id, name) VALUES ($1, $2, $3)",
        Uuid::new_v4(),
        tenant_a,
        "Category A"
    )
    .execute(&pool)
    .await?;

    // 3. Insert category for Tenant B
    sqlx::query!(
        "INSERT INTO categories (id, tenant_id, name) VALUES ($1, $2, $3)",
        Uuid::new_v4(),
        tenant_b,
        "Category B"
    )
    .execute(&pool)
    .await?;

    // 4. Verify isolation for Tenant A
    {
        let mut tx = pool.begin().await?;
        sqlx::query(&format!("SET LOCAL app.current_tenant = '{}'", tenant_a))
            .execute(&mut *tx)
            .await?;

        let categories = sqlx::query!("SELECT name FROM categories")
            .fetch_all(&mut *tx)
            .await?;

        assert!(categories.iter().any(|c| c.name == "Category A"));
        tx.rollback().await?;
    }

    // 5. Verify isolation for Tenant B
    {
        let mut tx = pool.begin().await?;
        sqlx::query(&format!("SET LOCAL app.current_tenant = '{}'", tenant_b))
            .execute(&mut *tx)
            .await?;

        let categories = sqlx::query!("SELECT name FROM categories")
            .fetch_all(&mut *tx)
            .await?;

        assert!(categories.iter().any(|c| c.name == "Category B"));
        tx.rollback().await?;
    }

    Ok(())
}
