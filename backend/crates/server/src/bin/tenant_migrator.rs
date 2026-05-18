use dotenvy::dotenv;
use infra::db::create_pool;
use sqlx::Row;
use std::env;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    let pool = create_pool().await?;

    let args: Vec<String> = env::args().collect();
    let is_dry_run = args.contains(&"--dry-run".to_string()) || args.len() < 2;
    let is_migrate = args.contains(&"--migrate".to_string());

    println!("🚀 SaaS Tenant Schema Migrator starting...");

    // Fetch all active tenants
    let tenants = sqlx::query("SELECT id, name, subdomain FROM public.tenants")
        .fetch_all(&pool)
        .await?;

    println!(
        "📊 Found {} active tenant(s) in main registry.",
        tenants.len()
    );

    if is_dry_run {
        println!("\n🔍 Running in DRY-RUN mode. Active tenants listed below:");
        for tenant in &tenants {
            let tenant_id: Uuid = tenant.get("id");
            let name: String = tenant.get("name");
            let subdomain: String = tenant.get("subdomain");
            let schema_name = format!("tenant_{}", tenant_id.to_string().replace('-', "_"));
            println!(
                "  - Tenant: {} ({}), Subdomain: '{}' -> Target Schema: '{}'",
                name, tenant_id, subdomain, schema_name
            );
        }
        println!("\n💡 To run migrations across all schemas, run with: `--migrate` flag.");
        return Ok(());
    }

    if is_migrate {
        println!("\n🔨 Executing migrations across all tenant schemas...");

        for tenant in &tenants {
            let tenant_id: Uuid = tenant.get("id");
            let name: String = tenant.get("name");
            let schema_name = format!("tenant_{}", tenant_id.to_string().replace('-', "_"));

            println!("\n--------------------------------------------------");
            println!("📦 Migrating Tenant: {} ({})", name, tenant_id);
            println!("📂 Schema: '{}'", schema_name);

            // 1. Ensure Schema exists
            let create_schema_sql = format!("CREATE SCHEMA IF NOT EXISTS {};", schema_name);
            sqlx::query(&create_schema_sql).execute(&pool).await?;
            println!("  ✅ Schema '{}' created or verified.", schema_name);

            // 2. Establish connection to run scoped migration
            let mut conn = pool.acquire().await?;

            // 3. Set search_path to scope the migration to this tenant schema
            // We set the path so any table creations in migrations land in this tenant's schema.
            // We also include public as fallback for shared extensions, tools, functions.
            let set_path_sql = format!("SET search_path TO {}, public;", schema_name);
            sqlx::query(&set_path_sql).execute(&mut *conn).await?;
            println!(
                "  ✅ Active database connection search_path set to '{}'.",
                schema_name
            );

            // 4. Run SQLx migrations scoped to tenant schema
            println!("  🔄 Running migrations...");
            sqlx::migrate!("../../migrations").run(&mut *conn).await?;
            println!(
                "  🎉 Migrations applied successfully to schema '{}'!",
                schema_name
            );
        }

        println!("\n✅ SaaS auto-migrations completed successfully for 100% of separate tenant DB schemas!");
    }

    Ok(())
}
