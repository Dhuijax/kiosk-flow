use sqlx::{PgPool, Postgres, Transaction};
use domain::models::user::{User, UserRole};
use domain::models::category::Category;
use domain::models::product::{Product, Topping};
use domain::models::table::{FloorPlan, Table, TableStatus};
use domain::models::order::{Order, OrderItem, OrderItemTopping, OrderStatus};
use domain::models::payment::Payment;
use domain::models::inventory::{Inventory, InventoryTransaction, InventoryTransactionType};
use domain::models::tenant::{Tenant, TenantSettings, Branch};
use domain::models::customer::Customer;
use anyhow::Result;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use bigdecimal::BigDecimal;

pub struct ReportRepository {
    pool: PgPool,
}

impl ReportRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    pub async fn get_revenue_summary(
        &self,
        tenant_id: &Uuid,
        branch_id: Option<Uuid>,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
    ) -> Result<(BigDecimal, i64)> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        // Using manual mapping because SUM returns Option and COUNT returns i64
        let row: (Option<BigDecimal>, Option<i64>) = sqlx::query_as(
            r#"
            SELECT 
                SUM(amount) as total_revenue,
                COUNT(DISTINCT order_id) as total_orders
            FROM payments
            WHERE (branch_id = $1 OR $1 IS NULL)
              AND paid_at >= $2 
              AND paid_at <= $3
              AND status = 'completed'
            "#
        )
        .bind(branch_id)
        .bind(start_date)
        .bind(end_date)
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok((row.0.unwrap_or_default(), row.1.unwrap_or_default()))
    }

    pub async fn get_top_products(
        &self,
        tenant_id: &Uuid,
        branch_id: Option<Uuid>,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
        limit: i32,
    ) -> Result<Vec<(Uuid, String, i64, BigDecimal)>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let rows: Vec<(Uuid, String, i64, BigDecimal)> = sqlx::query_as(
            r#"
            SELECT 
                p.id as product_id,
                p.name as product_name,
                SUM(oi.quantity)::BIGINT as quantity_sold,
                SUM(oi.subtotal) as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE (o.branch_id = $1 OR $1 IS NULL)
              AND o.created_at >= $2
              AND o.created_at <= $3
              AND o.status IN ('completed', 'paid')
            GROUP BY p.id, p.name
            ORDER BY quantity_sold DESC
            LIMIT $4
            "#
        )
        .bind(branch_id)
        .bind(start_date)
        .bind(end_date)
        .bind(limit as i64)
        .fetch_all(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(rows)
    }

    pub async fn get_sales_by_period(
        &self,
        tenant_id: &Uuid,
        branch_id: Option<Uuid>,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
        period: &str, // 'day', 'week', 'month'
    ) -> Result<Vec<(String, BigDecimal, i64)>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let date_trunc = match period {
            "week" => "week",
            "month" => "month",
            _ => "day",
        };

        let rows: Vec<(String, BigDecimal, i64)> = sqlx::query_as(
            &format!(
                r#"
                SELECT 
                    TO_CHAR(DATE_TRUNC('{}', paid_at), 'YYYY-MM-DD') as period_label,
                    SUM(amount) as revenue,
                    COUNT(DISTINCT order_id)::BIGINT as order_count
                FROM payments
                WHERE (branch_id = $1 OR $1 IS NULL)
                  AND paid_at >= $2
                  AND paid_at <= $3
                  AND status = 'completed'
                GROUP BY 1
                ORDER BY 1 ASC
                "#,
                date_trunc
            )
        )
        .bind(branch_id)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(rows)
    }
}

pub struct TenantRepository {
    pool: PgPool,
}

impl TenantRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, tenant: &Tenant) -> Result<Tenant> {
        let created = sqlx::query_as!(
            Tenant,
            r#"
            INSERT INTO tenants (id, name, subdomain, is_active)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, subdomain, is_active as "is_active!", created_at as "created_at!"
            "#,
            tenant.id,
            tenant.name,
            tenant.subdomain,
            tenant.is_active
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(created)
    }

    pub async fn find_by_subdomain(&self, subdomain: &str) -> Result<Option<Tenant>> {
        let tenant = sqlx::query_as!(
            Tenant,
            r#"
            SELECT id, name, subdomain, is_active as "is_active!", created_at as "created_at!"
            FROM tenants
            WHERE subdomain = $1
            "#,
            subdomain
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(tenant)
    }
}

pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Helper to start a transaction and set the tenant context for RLS
    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    pub async fn find_by_id(&self, tenant_id: &Uuid, id: &Uuid) -> Result<Option<User>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;
        
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, tenant_id, branch_id, email, password_hash, full_name, role as "role: _", is_active as "is_active!", created_at as "created_at!", updated_at as "updated_at!"
            FROM users
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(user)
    }

    pub async fn find_by_email(&self, tenant_id: &Uuid, email: &str) -> Result<Option<User>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, tenant_id, branch_id, email, password_hash, full_name, role as "role: _", is_active as "is_active!", created_at as "created_at!", updated_at as "updated_at!"
            FROM users
            WHERE email = $1
            "#,
            email
        )
        .fetch_optional(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(user)
    }

    pub async fn list_by_tenant(&self, tenant_id: &Uuid, branch_id: Option<Uuid>) -> Result<Vec<User>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let users = if let Some(b_id) = branch_id {
            sqlx::query_as!(
                User,
                r#"
                SELECT id, tenant_id, branch_id, email, password_hash, full_name, role as "role: _", is_active as "is_active!", created_at as "created_at!", updated_at as "updated_at!"
                FROM users
                WHERE branch_id = $1
                "#,
                b_id
            )
            .fetch_all(&mut *tx)
            .await?
        } else {
            sqlx::query_as!(
                User,
                r#"
                SELECT id, tenant_id, branch_id, email, password_hash, full_name, role as "role: _", is_active as "is_active!", created_at as "created_at!", updated_at as "updated_at!"
                FROM users
                "#
            )
            .fetch_all(&mut *tx)
            .await?
        };

        tx.commit().await?;
        Ok(users)
    }

    pub async fn create(&self, user: &User) -> Result<User> {
        let mut tx = self.tx_with_tenant(&user.tenant_id).await?;

        let created_user = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (id, tenant_id, branch_id, email, password_hash, full_name, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, tenant_id, branch_id, email, password_hash, full_name, role as "role: _", is_active as "is_active!", created_at as "created_at!", updated_at as "updated_at!"
            "#,
            user.id,
            user.tenant_id,
            user.branch_id,
            user.email,
            user.password_hash,
            user.full_name,
            user.role.to_string() as _,
            user.is_active
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(created_user)
    }

    pub async fn update(&self, tenant_id: &Uuid, user_id: &Uuid, full_name: Option<String>, role: Option<UserRole>, is_active: Option<bool>) -> Result<User> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        // Dynamic update using COALESCE patterns for simplicity in query_as!
        let updated_user = sqlx::query_as!(
            User,
            r#"
            UPDATE users 
            SET 
                full_name = COALESCE($1, full_name),
                role = COALESCE($2, role),
                is_active = COALESCE($3, is_active),
                updated_at = NOW()
            WHERE id = $4
            RETURNING id, tenant_id, branch_id, email, password_hash, full_name, role as "role: _", is_active as "is_active!", created_at as "created_at!", updated_at as "updated_at!"
            "#,
            full_name,
            role.map(|r| r.to_string()) as _,
            is_active,
            user_id
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(updated_user)
    }

    pub async fn delete(&self, tenant_id: &Uuid, id: &Uuid) -> Result<()> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        sqlx::query!("DELETE FROM users WHERE id = $1", id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }
}

pub struct CategoryRepository {
    pool: PgPool,
}

impl CategoryRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    pub async fn create(&self, category: &Category) -> Result<Category> {
        let mut tx = self.tx_with_tenant(&category.tenant_id).await?;

        let created = sqlx::query_as!(
            Category,
            r#"
            INSERT INTO categories (id, tenant_id, name, parent_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, tenant_id, name, parent_id, created_at as "created_at!"
            "#,
            category.id,
            category.tenant_id,
            category.name,
            category.parent_id
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(created)
    }

    pub async fn find_by_id(&self, tenant_id: &Uuid, id: &Uuid) -> Result<Option<Category>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let category = sqlx::query_as!(
            Category,
            r#"
            SELECT id, tenant_id, name, parent_id, created_at as "created_at!"
            FROM categories
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(category)
    }

    pub async fn list_by_tenant(&self, tenant_id: &Uuid) -> Result<Vec<Category>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let categories = sqlx::query_as!(
            Category,
            r#"
            SELECT id, tenant_id, name, parent_id, created_at as "created_at!"
            FROM categories
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(categories)
    }

    pub async fn update(&self, tenant_id: &Uuid, id: &Uuid, name: Option<String>, parent_id: Option<Option<Uuid>>) -> Result<Category> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        // Note: parent_id logic where None means no change, Some(None) means set to NULL, Some(Some(u)) means set to u
        // In SQLx with COALESCE it might be tricky. We can build dynamic or just execute two queries.
        // For simplicity, we just do a select then update, OR we can execute direct query.
        
        let existing = sqlx::query_as!(
            Category,
            r#"
            SELECT id, tenant_id, name, parent_id, created_at as "created_at!"
            FROM categories WHERE id = $1
            "#,
            id
        ).fetch_one(&mut *tx).await?;

        let new_name = name.unwrap_or(existing.name);
        
        let new_parent_id = match parent_id {
            Some(pid) => pid,
            None => existing.parent_id,
        };

        let updated = sqlx::query_as!(
            Category,
            r#"
            UPDATE categories
            SET name = $1, parent_id = $2
            WHERE id = $3
            RETURNING id, tenant_id, name, parent_id, created_at as "created_at!"
            "#,
            new_name,
            new_parent_id,
            id
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(updated)
    }

    pub async fn delete(&self, tenant_id: &Uuid, id: &Uuid) -> Result<()> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        sqlx::query!("DELETE FROM categories WHERE id = $1", id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }
}

pub struct ProductRepository {
    pool: PgPool,
}

impl ProductRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    pub async fn create(&self, product: &Product, topping_ids: &[Uuid]) -> Result<Product> {
        let mut tx = self.tx_with_tenant(&product.tenant_id).await?;

        let created = sqlx::query_as!(
            Product,
            r#"
            INSERT INTO products (id, tenant_id, category_id, sku, name, description, price, cost_price, unit, image_url, is_active, allow_topping, track_inventory)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, tenant_id, category_id, sku, name, description, price, cost_price, unit, image_url, is_active as "is_active!", allow_topping as "allow_topping!", track_inventory as "track_inventory!", created_at as "created_at!", updated_at as "updated_at!"
            "#,
            product.id,
            product.tenant_id,
            product.category_id,
            product.sku,
            product.name,
            product.description,
            product.price,
            product.cost_price,
            product.unit,
            product.image_url,
            product.is_active,
            product.allow_topping,
            product.track_inventory
        )
        .fetch_one(&mut *tx)
        .await?;

        // Handle Toppings
        for tid in topping_ids {
            sqlx::query!(
                "INSERT INTO product_toppings (product_id, topping_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                created.id,
                tid
            )
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(created)
    }

    pub async fn find_by_id(&self, tenant_id: &Uuid, id: &Uuid) -> Result<Option<Product>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let product = sqlx::query_as!(
            Product,
            r#"
            SELECT id, tenant_id, category_id, sku, name, description, price, cost_price, unit, image_url, is_active as "is_active!", allow_topping as "allow_topping!", track_inventory as "track_inventory!", created_at as "created_at!", updated_at as "updated_at!"
            FROM products
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(product)
    }

    pub async fn list_by_tenant(&self, tenant_id: &Uuid, category_id: Option<Uuid>) -> Result<Vec<Product>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let products = if let Some(cat_id) = category_id {
            sqlx::query_as!(
                Product,
                r#"
                SELECT id, tenant_id, category_id, sku, name, description, price, cost_price, unit, image_url, is_active as "is_active!", allow_topping as "allow_topping!", track_inventory as "track_inventory!", created_at as "created_at!", updated_at as "updated_at!"
                FROM products
                WHERE category_id = $1
                ORDER BY created_at DESC
                "#,
                cat_id
            )
            .fetch_all(&mut *tx)
            .await?
        } else {
            sqlx::query_as!(
                Product,
                r#"
                SELECT id, tenant_id, category_id, sku, name, description, price, cost_price, unit, image_url, is_active as "is_active!", allow_topping as "allow_topping!", track_inventory as "track_inventory!", created_at as "created_at!", updated_at as "updated_at!"
                FROM products
                ORDER BY created_at DESC
                "#
            )
            .fetch_all(&mut *tx)
            .await?
        };

        // Note: For MVP we don't load toppings here, but we could if needed for the UI
        tx.commit().await?;
        Ok(products)
    }

    pub async fn update(&self, tenant_id: &Uuid, id: &Uuid, product: &Product, topping_ids: Option<&[Uuid]>) -> Result<Product> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let updated = sqlx::query_as!(
            Product,
            r#"
            UPDATE products
            SET category_id = $1, sku = $2, name = $3, description = $4, price = $5, cost_price = $6, unit = $7, image_url = $8, is_active = $9, allow_topping = $10, track_inventory = $11, updated_at = NOW()
            WHERE id = $12
            RETURNING id, tenant_id, category_id, sku, name, description, price, cost_price, unit, image_url, is_active as "is_active!", allow_topping as "allow_topping!", track_inventory as "track_inventory!", created_at as "created_at!", updated_at as "updated_at!"
            "#,
            product.category_id,
            product.sku,
            product.name,
            product.description,
            product.price,
            product.cost_price,
            product.unit,
            product.image_url,
            product.is_active,
            product.allow_topping,
            product.track_inventory,
            id
        )
        .fetch_one(&mut *tx)
        .await?;

        // Handle Toppings update if provided
        if let Some(tids) = topping_ids {
            // Remove old
            sqlx::query!("DELETE FROM product_toppings WHERE product_id = $1", id)
                .execute(&mut *tx)
                .await?;
            
            // Insert new
            for tid in tids {
                sqlx::query!(
                    "INSERT INTO product_toppings (product_id, topping_id) VALUES ($1, $2)",
                    id,
                    tid
                )
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await?;
        Ok(updated)
    }

    pub async fn delete(&self, tenant_id: &Uuid, id: &Uuid) -> Result<()> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        sqlx::query!("DELETE FROM products WHERE id = $1", id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }
}

pub struct ToppingRepository {
    pool: PgPool,
}

impl ToppingRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    pub async fn create(&self, topping: &Topping) -> Result<Topping> {
        let mut tx = self.tx_with_tenant(&topping.tenant_id).await?;

        let created = sqlx::query_as!(
            Topping,
            r#"
            INSERT INTO toppings (id, tenant_id, name, price, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, tenant_id, name, price, is_active as "is_active!", created_at as "created_at!"
            "#,
            topping.id,
            topping.tenant_id,
            topping.name,
            topping.price,
            topping.is_active
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(created)
    }

    pub async fn list_by_tenant(&self, tenant_id: &Uuid) -> Result<Vec<Topping>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let toppings = sqlx::query_as!(
            Topping,
            r#"
            SELECT id, tenant_id, name, price, is_active as "is_active!", created_at as "created_at!"
            FROM toppings
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(toppings)
    }

    pub async fn find_by_ids(&self, tenant_id: &Uuid, ids: &[Uuid]) -> Result<Vec<Topping>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let toppings = sqlx::query_as!(
            Topping,
            r#"
            SELECT id, tenant_id, name, price, is_active as "is_active!", created_at as "created_at!"
            FROM toppings
            WHERE id = ANY($1)
            "#,
            ids
        )
        .fetch_all(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(toppings)
    }

    pub async fn delete(&self, tenant_id: &Uuid, id: &Uuid) -> Result<()> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        sqlx::query!("DELETE FROM toppings WHERE id = $1", id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }
}

pub struct TableRepository {
    pool: PgPool,
}

impl TableRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    pub async fn create_batch(&self, tables: &[Table]) -> Result<Vec<Table>> {
        if tables.is_empty() { return Ok(vec![]); }
        let tenant_id = tables[0].tenant_id;
        let mut tx = self.tx_with_tenant(&tenant_id).await?;

        let mut created = Vec::new();
        for table in tables {
            let t = sqlx::query_as!(
                Table,
                r#"
                INSERT INTO tables (id, tenant_id, branch_id, floor_plan_id, name, capacity, position_x, position_y, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, tenant_id, branch_id, floor_plan_id, name, capacity, position_x, position_y, status as "status: _", current_order_id, created_at as "created_at!", updated_at as "updated_at!"
                "#,
                table.id,
                table.tenant_id,
                table.branch_id,
                table.floor_plan_id,
                table.name,
                table.capacity,
                table.position_x,
                table.position_y,
                table.status as _
            )
            .fetch_one(&mut *tx)
            .await?;
            created.push(t);
        }

        tx.commit().await?;
        Ok(created)
    }

    pub async fn find_by_id(&self, tenant_id: &Uuid, id: &Uuid) -> Result<Option<Table>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let table = sqlx::query_as!(
            Table,
            r#"
            SELECT id, tenant_id, branch_id, floor_plan_id, name, capacity, position_x, position_y, status as "status: _", current_order_id, created_at as "created_at!", updated_at as "updated_at!"
            FROM tables
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(table)
    }

    pub async fn list_by_floor_plan(&self, tenant_id: &Uuid, floor_plan_id: &Uuid) -> Result<Vec<Table>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let tables = sqlx::query_as!(
            Table,
            r#"
            SELECT id, tenant_id, branch_id, floor_plan_id, name, capacity, position_x, position_y, status as "status: _", current_order_id, created_at as "created_at!", updated_at as "updated_at!"
            FROM tables
            WHERE floor_plan_id = $1
            ORDER BY name ASC
            "#,
            floor_plan_id
        )
        .fetch_all(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(tables)
    }

    pub async fn update(&self, tenant_id: &Uuid, id: &Uuid, name: Option<String>, capacity: Option<i32>, pos_x: Option<i32>, pos_y: Option<i32>) -> Result<Table> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let updated = sqlx::query_as!(
            Table,
            r#"
            UPDATE tables
            SET 
                name = COALESCE($1, name),
                capacity = COALESCE($2, capacity),
                position_x = COALESCE($3, position_x),
                position_y = COALESCE($4, position_y),
                updated_at = NOW()
            WHERE id = $5
            RETURNING id, tenant_id, branch_id, floor_plan_id, name, capacity, position_x, position_y, status as "status: _", current_order_id, created_at as "created_at!", updated_at as "updated_at!"
            "#,
            name,
            capacity,
            pos_x,
            pos_y,
            id
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(updated)
    }

    pub async fn update_status(&self, tenant_id: &Uuid, id: &Uuid, status: TableStatus) -> Result<Table> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let updated = sqlx::query_as!(
            Table,
            r#"
            UPDATE tables
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, tenant_id, branch_id, floor_plan_id, name, capacity, position_x, position_y, status as "status: _", current_order_id, created_at as "created_at!", updated_at as "updated_at!"
            "#,
            status as _,
            id
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(updated)
    }

    pub async fn delete(&self, tenant_id: &Uuid, id: &Uuid) -> Result<()> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;
        sqlx::query!("DELETE FROM tables WHERE id = $1", id)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        Ok(())
    }
}

pub struct FloorPlanRepository {
    pool: PgPool,
}

impl FloorPlanRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    pub async fn create(&self, fp: &FloorPlan) -> Result<FloorPlan> {
        let mut tx = self.tx_with_tenant(&fp.tenant_id).await?;

        let created = sqlx::query_as!(
            FloorPlan,
            r#"
            INSERT INTO floor_plans (id, tenant_id, branch_id, name, layout_data)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, tenant_id, branch_id, name, layout_data, created_at as "created_at!", updated_at as "updated_at!"
            "#,
            fp.id,
            fp.tenant_id,
            fp.branch_id,
            fp.name,
            fp.layout_data
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(created)
    }

    pub async fn list_by_branch(&self, tenant_id: &Uuid, branch_id: &Uuid) -> Result<Vec<FloorPlan>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let plans = sqlx::query_as!(
            FloorPlan,
            r#"
            SELECT id, tenant_id, branch_id, name, layout_data, created_at as "created_at!", updated_at as "updated_at!"
            FROM floor_plans
            WHERE branch_id = $1
            ORDER BY created_at ASC
            "#,
            branch_id
        )
        .fetch_all(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(plans)
    }

    pub async fn update(&self, tenant_id: &Uuid, id: &Uuid, name: Option<String>, layout_data: Option<serde_json::Value>) -> Result<FloorPlan> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let updated = sqlx::query_as!(
            FloorPlan,
            r#"
            UPDATE floor_plans
            SET 
                name = COALESCE($1, name),
                layout_data = COALESCE($2, layout_data),
                updated_at = NOW()
            WHERE id = $3
            RETURNING id, tenant_id, branch_id, name, layout_data, created_at as "created_at!", updated_at as "updated_at!"
            "#,
            name,
            layout_data,
            id
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(updated)
    }

    pub async fn delete(&self, tenant_id: &Uuid, id: &Uuid) -> Result<()> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;
        sqlx::query!("DELETE FROM floor_plans WHERE id = $1", id)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        Ok(())
    }
}

pub struct OrderRepository {
    pool: PgPool,
}

impl OrderRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    /// Generate daily order number: ORD-YYYYMMDD-XXX
    async fn next_order_number(&self, tx: &mut Transaction<'_, Postgres>, branch_id: &Uuid) -> Result<String> {
        let today = chrono::Utc::now().date_naive();
        
        // Using functional query to bypass compile-time check for missing tables
        let row: (i32,) = sqlx::query_as(
            r#"
            INSERT INTO daily_sequences (branch_id, seq_date, last_value)
            VALUES ($1, $2, 1)
            ON CONFLICT (branch_id, seq_date)
            DO UPDATE SET last_value = daily_sequences.last_value + 1
            RETURNING last_value
            "#
        )
        .bind(branch_id)
        .bind(today)
        .fetch_one(&mut **tx)
        .await?;

        let date_str = today.format("%Y%m%d").to_string();
        Ok(format!("ORD-{}-{:03}", date_str, row.0))
    }

    pub async fn create(&self, order: &Order, items: &[(OrderItem, Vec<OrderItemTopping>)]) -> Result<Order> {
        let mut tx = self.tx_with_tenant(&order.tenant_id).await?;

        // 1. Generate Order Number
        let order_number = self.next_order_number(&mut tx, &order.branch_id).await?;

        // 2. Insert Order
        let created_order: Order = sqlx::query_as(
            r#"
            INSERT INTO orders (id, tenant_id, branch_id, table_id, order_number, status, customer_name, customer_id, cashier_name, guest_id, subtotal, tax_amount, discount_amount, total, note, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id, tenant_id, branch_id, table_id, order_number, status, customer_name, customer_id, cashier_name, guest_id, subtotal, tax_amount, discount_amount, total, note, created_by, created_at, updated_at, completed_at
            "#
        )
        .bind(order.id)
        .bind(order.tenant_id)
        .bind(order.branch_id)
        .bind(order.table_id)
        .bind(order_number)
        .bind(&order.status)
        .bind(&order.customer_name)
        .bind(order.customer_id)
        .bind(&order.cashier_name)
        .bind(&order.guest_id)
        .bind(&order.subtotal)
        .bind(&order.tax_amount)
        .bind(&order.discount_amount)
        .bind(&order.total)
        .bind(&order.note)
        .bind(order.created_by)
        .fetch_one(&mut *tx)
        .await?;

        // 3. Insert Items and Toppings
        for (item, toppings) in items {
            let created_item: OrderItem = sqlx::query_as(
                r#"
                INSERT INTO order_items (id, order_id, tenant_id, product_id, product_name, unit_price, quantity, subtotal, note, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, order_id, tenant_id, product_id, product_name, unit_price, quantity, subtotal, note, status, created_at
                "#
            )
            .bind(item.id)
            .bind(created_order.id)
            .bind(order.tenant_id)
            .bind(item.product_id)
            .bind(&item.product_name)
            .bind(&item.unit_price)
            .bind(item.quantity)
            .bind(&item.subtotal)
            .bind(&item.note)
            .bind(&item.status)
            .fetch_one(&mut *tx)
            .await?;

            for topping in toppings {
                sqlx::query(
                    r#"
                    INSERT INTO order_item_toppings (id, order_item_id, tenant_id, topping_id, name, price)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    "#
                )
                .bind(Uuid::new_v4())
                .bind(created_item.id)
                .bind(order.tenant_id)
                .bind(topping.topping_id)
                .bind(&topping.name)
                .bind(&topping.price)
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await?;
        Ok(created_order)
    }

    pub async fn find_by_id(&self, tenant_id: &Uuid, id: &Uuid) -> Result<Option<(Order, Vec<(OrderItem, Vec<OrderItemTopping>)>)>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let order: Option<Order> = sqlx::query_as(
            r#"
            SELECT id, tenant_id, branch_id, table_id, order_number, status, customer_name, customer_id, cashier_name, guest_id, subtotal, tax_amount, discount_amount, total, note, created_by, created_at, updated_at, completed_at
            FROM orders WHERE id = $1
            "#
        )
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?;

        if let Some(order) = order {
            let items_data: Vec<OrderItem> = sqlx::query_as(
                r#"
                SELECT id, order_id, tenant_id, product_id, product_name, unit_price, quantity, subtotal, note, status, created_at
                FROM order_items WHERE order_id = $1
                "#
            )
            .bind(order.id)
            .fetch_all(&mut *tx)
            .await?;

            let mut items_with_toppings = Vec::new();
            for item in items_data {
                let toppings: Vec<OrderItemTopping> = sqlx::query_as(
                    r#"
                    SELECT id, order_item_id, tenant_id, topping_id, name, price
                    FROM order_item_toppings WHERE order_item_id = $1
                    "#
                )
                .bind(item.id)
                .fetch_all(&mut *tx)
                .await?;
                items_with_toppings.push((item, toppings));
            }

            tx.commit().await?;
            Ok(Some((order, items_with_toppings)))
        } else {
            tx.commit().await?;
            Ok(None)
        }
    }

    pub async fn update_status(&self, tenant_id: &Uuid, id: &Uuid, status: OrderStatus) -> Result<Order> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;
        
        let completed_at = if matches!(status, OrderStatus::Completed) {
            Some(chrono::Utc::now())
        } else {
            None
        };

        let updated: Order = sqlx::query_as(
            r#"
            UPDATE orders
            SET status = $1, completed_at = COALESCE($2, completed_at), updated_at = NOW()
            WHERE id = $3
            RETURNING id, tenant_id, branch_id, table_id, order_number, status, customer_name, customer_id, cashier_name, guest_id, subtotal, tax_amount, discount_amount, total, note, created_by, created_at, updated_at, completed_at
            "#
        )
        .bind(&status)
        .bind(completed_at)
        .bind(id)
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(updated)
    }

    pub async fn list_by_branch(&self, tenant_id: &Uuid, branch_id: &Uuid, status: Option<OrderStatus>, limit: i64, offset: i64) -> Result<Vec<Order>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let orders: Vec<Order> = if let Some(s) = status {
            sqlx::query_as(
                r#"
                SELECT id, tenant_id, branch_id, table_id, order_number, status, customer_name, customer_id, cashier_name, guest_id, subtotal, tax_amount, discount_amount, total, note, created_by, created_at, updated_at, completed_at
                FROM orders
                WHERE branch_id = $1 AND status = $2
                ORDER BY created_at DESC
                LIMIT $3 OFFSET $4
                "#
            )
            .bind(branch_id)
            .bind(s)
            .bind(limit)
            .bind(offset)
            .fetch_all(&mut *tx)
            .await?
        } else {
            sqlx::query_as(
                r#"
                SELECT id, tenant_id, branch_id, table_id, order_number, status, customer_name, customer_id, cashier_name, guest_id, subtotal, tax_amount, discount_amount, total, note, created_by, created_at, updated_at, completed_at
                FROM orders
                WHERE branch_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                "#
            )
            .bind(branch_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&mut *tx)
            .await?
        };

        tx.commit().await?;
        Ok(orders)
    }

    pub async fn list_by_customer(&self, tenant_id: &Uuid, customer_id: &Uuid, start_date: DateTime<Utc>) -> Result<Vec<Order>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let orders: Vec<Order> = sqlx::query_as(
            r#"
            SELECT id, tenant_id, branch_id, table_id, order_number, status, customer_name, customer_id, cashier_name, guest_id, subtotal, tax_amount, discount_amount, total, note, created_by, created_at, updated_at, completed_at
            FROM orders
            WHERE customer_id = $1 AND created_at >= $2
            ORDER BY created_at DESC
            "#
        )
        .bind(customer_id)
        .bind(start_date)
        .fetch_all(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(orders)
    }

    pub async fn update_cashier_name(&self, tenant_id: &Uuid, id: &Uuid, cashier_name: &str) -> Result<()> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        sqlx::query!(
            "UPDATE orders SET cashier_name = $1, updated_at = NOW() WHERE id = $2",
            cashier_name,
            id
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(())
    }
}

pub struct PaymentRepository {
    pool: PgPool,
}

impl PaymentRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    pub async fn create_with_order_status(&self, payment: &Payment, next_order_status: OrderStatus) -> Result<Payment> {
        let mut tx = self.tx_with_tenant(&payment.tenant_id).await?;

        // 1. Create Payment
        let created: Payment = sqlx::query_as(
            r#"
            INSERT INTO payments (id, tenant_id, branch_id, order_id, method, amount, received_amount, change_amount, transaction_ref, status, paid_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, tenant_id, branch_id, order_id, method as "method: _", amount, received_amount, change_amount, transaction_ref, status as "status: _", paid_at, created_by
            "#
        )
        .bind(payment.id)
        .bind(payment.tenant_id)
        .bind(payment.branch_id)
        .bind(payment.order_id)
        .bind(&payment.method)
        .bind(&payment.amount)
        .bind(&payment.received_amount)
        .bind(&payment.change_amount)
        .bind(&payment.transaction_ref)
        .bind(&payment.status)
        .bind(payment.paid_at)
        .bind(payment.created_by)
        .fetch_one(&mut *tx)
        .await?;

        // 2. Update Order Status
        sqlx::query(
            "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2"
        )
        .bind(next_order_status)
        .bind(payment.order_id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(created)
    }

    pub async fn create(&self, payment: &Payment) -> Result<Payment> {
        let mut tx = self.tx_with_tenant(&payment.tenant_id).await?;

        let created: Payment = sqlx::query_as(
            r#"
            INSERT INTO payments (id, tenant_id, branch_id, order_id, method, amount, received_amount, change_amount, transaction_ref, status, paid_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, tenant_id, branch_id, order_id, method as "method: _", amount, received_amount, change_amount, transaction_ref, status as "status: _", paid_at, created_by
            "#
        )
        .bind(payment.id)
        .bind(payment.tenant_id)
        .bind(payment.branch_id)
        .bind(payment.order_id)
        .bind(&payment.method)
        .bind(&payment.amount)
        .bind(&payment.received_amount)
        .bind(&payment.change_amount)
        .bind(&payment.transaction_ref)
        .bind(&payment.status)
        .bind(payment.paid_at)
        .bind(payment.created_by)
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(created)
    }

    pub async fn find_by_id(&self, tenant_id: &Uuid, id: &Uuid) -> Result<Option<Payment>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let payment: Option<Payment> = sqlx::query_as(
            r#"
            SELECT id, tenant_id, branch_id, order_id, method as "method: _", amount, received_amount, change_amount, transaction_ref, status as "status: _", paid_at, created_by
            FROM payments WHERE id = $1
            "#
        )
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(payment)
    }

    pub async fn find_by_order_id(&self, tenant_id: &Uuid, order_id: &Uuid) -> Result<Option<Payment>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let payment: Option<Payment> = sqlx::query_as(
            r#"
            SELECT id, tenant_id, branch_id, order_id, method as "method: _", amount, received_amount, change_amount, transaction_ref, status as "status: _", paid_at, created_by
            FROM payments WHERE order_id = $1
            "#
        )
        .bind(order_id)
        .fetch_optional(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(payment)
    }

    pub async fn list_by_branch(&self, tenant_id: &Uuid, branch_id: &Uuid, limit: i64, offset: i64) -> Result<Vec<Payment>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let payments: Vec<Payment> = sqlx::query_as(
            r#"
            SELECT id, tenant_id, branch_id, order_id, method as "method: _", amount, received_amount, change_amount, transaction_ref, status as "status: _", paid_at, created_by
            FROM payments 
            WHERE branch_id = $1
            ORDER BY paid_at DESC
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(branch_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(payments)
    }
}


pub struct InventoryRepository {
    pool: PgPool,
}

impl InventoryRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    pub async fn get_stock(&self, tenant_id: &Uuid, branch_id: &Uuid, product_id: &Uuid) -> Result<Option<Inventory>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let inventory = sqlx::query_as!(
            Inventory,
            r#"
            SELECT id, tenant_id, branch_id, product_id, quantity, min_quantity, updated_at as "updated_at!"
            FROM inventory
            WHERE branch_id = $1 AND product_id = $2
            "#,
            branch_id,
            product_id
        )
        .fetch_optional(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(inventory)
    }

    pub async fn update_stock(
        &self,
        tenant_id: &Uuid,
        branch_id: &Uuid,
        product_id: &Uuid,
        quantity_change: &sqlx::types::BigDecimal,
        r#type: InventoryTransactionType,
        reference_id: Option<Uuid>,
        note: Option<String>,
        created_by: Option<Uuid>,
    ) -> Result<Inventory> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        // 1. Update or Insert Inventory
        let inventory = sqlx::query_as!(
            Inventory,
            r#"
            INSERT INTO inventory (tenant_id, branch_id, product_id, quantity)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tenant_id, branch_id, product_id)
            DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity, updated_at = NOW()
            RETURNING id, tenant_id, branch_id, product_id, quantity, min_quantity, updated_at as "updated_at!"
            "#,
            tenant_id,
            branch_id,
            product_id,
            quantity_change
        )
        .fetch_one(&mut *tx)
        .await?;

        // 2. Log Transaction
        sqlx::query!(
            r#"
            INSERT INTO inventory_transactions (tenant_id, branch_id, product_id, type, quantity_change, reference_id, note, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
            tenant_id,
            branch_id,
            product_id,
            r#type as _,
            quantity_change,
            reference_id,
            note,
            created_by
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(inventory)
    }

    pub async fn list_stock(&self, tenant_id: &Uuid, branch_id: &Uuid, low_stock_only: bool) -> Result<Vec<Inventory>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let items = if low_stock_only {
            sqlx::query_as!(
                Inventory,
                r#"
                SELECT id, tenant_id, branch_id, product_id, quantity, min_quantity, updated_at as "updated_at!"
                FROM inventory
                WHERE branch_id = $1 AND quantity <= min_quantity
                ORDER BY updated_at DESC
                "#,
                branch_id
            )
            .fetch_all(&mut *tx)
            .await?
        } else {
            sqlx::query_as!(
                Inventory,
                r#"
                SELECT id, tenant_id, branch_id, product_id, quantity, min_quantity, updated_at as "updated_at!"
                FROM inventory
                WHERE branch_id = $1
                ORDER BY updated_at DESC
                "#,
                branch_id
            )
            .fetch_all(&mut *tx)
            .await?
        };

        tx.commit().await?;
        Ok(items)
    }

    pub async fn get_history(&self, tenant_id: &Uuid, branch_id: &Uuid, product_id: &Uuid) -> Result<Vec<InventoryTransaction>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let history = sqlx::query_as!(
            InventoryTransaction,
            r#"
            SELECT id, tenant_id, branch_id, product_id, type as "type: _", quantity_change, reference_id, note, created_by, created_at as "created_at!"
            FROM inventory_transactions
            WHERE branch_id = $1 AND product_id = $2
            ORDER BY created_at DESC
            "#,
            branch_id,
            product_id
        )
        .fetch_all(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(history)
    }
}pub struct CustomerRepository {
    pool: PgPool,
}

impl CustomerRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    pub async fn create(&self, customer: &Customer) -> Result<Customer> {
        let mut tx = self.tx_with_tenant(&customer.tenant_id).await?;

        let created = sqlx::query_as!(
            Customer,
            r#"
            INSERT INTO customers (id, tenant_id, phone, name, points)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, tenant_id, phone, name, points, created_at as "created_at!", updated_at as "updated_at!"
            "#,
            customer.id,
            customer.tenant_id,
            customer.phone,
            customer.name,
            customer.points
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(created)
    }

    pub async fn find_by_id(&self, tenant_id: &Uuid, id: &Uuid) -> Result<Option<Customer>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let customer = sqlx::query_as!(
            Customer,
            r#"
            SELECT id, tenant_id, phone, name, points, created_at as "created_at!", updated_at as "updated_at!"
            FROM customers
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(customer)
    }

    pub async fn find_by_phone(&self, tenant_id: &Uuid, phone: &str) -> Result<Option<Customer>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let customer = sqlx::query_as!(
            Customer,
            r#"
            SELECT id, tenant_id, phone, name, points, created_at as "created_at!", updated_at as "updated_at!"
            FROM customers
            WHERE phone = $1
            "#,
            phone
        )
        .fetch_optional(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(customer)
    }

    pub async fn list(&self, tenant_id: &Uuid, search: Option<String>) -> Result<Vec<Customer>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let customers = if let Some(q) = search {
            let search_pattern = format!("%{}%", q);
            sqlx::query_as!(
                Customer,
                r#"
                SELECT id, tenant_id, phone, name, points, created_at as "created_at!", updated_at as "updated_at!"
                FROM customers
                WHERE phone LIKE $1 OR name ILIKE $1
                ORDER BY created_at DESC
                "#,
                search_pattern
            )
            .fetch_all(&mut *tx)
            .await?
        } else {
            sqlx::query_as!(
                Customer,
                r#"
                SELECT id, tenant_id, phone, name, points, created_at as "created_at!", updated_at as "updated_at!"
                FROM customers
                ORDER BY created_at DESC
                "#
            )
            .fetch_all(&mut *tx)
            .await?
        };

        tx.commit().await?;
        Ok(customers)
    }

    pub async fn update_points(&self, tenant_id: &Uuid, id: &Uuid, points_to_add: i32) -> Result<Customer> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let updated = sqlx::query_as!(
            Customer,
            r#"
            UPDATE customers
            SET points = points + $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, tenant_id, phone, name, points, created_at as "created_at!", updated_at as "updated_at!"
            "#,
            points_to_add,
            id
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(updated)
    }

    pub async fn update(&self, tenant_id: &Uuid, id: &Uuid, name: Option<String>, phone: Option<String>) -> Result<Customer> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let updated = sqlx::query_as!(
            Customer,
            r#"
            UPDATE customers
            SET name = COALESCE($1, name),
                phone = COALESCE($2, phone),
                updated_at = NOW()
            WHERE id = $3
            RETURNING id, tenant_id, phone, name, points, created_at as "created_at!", updated_at as "updated_at!"
            "#,
            name,
            phone,
            id
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(updated)
    }

    pub async fn delete(&self, tenant_id: &Uuid, id: &Uuid) -> Result<()> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        sqlx::query!(
            r#"
            DELETE FROM customers
            WHERE id = $1
            "#,
            id
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(())
    }
}

pub struct StoreRepository {
    pool: PgPool,
}

impl StoreRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    pub async fn get_main_branch(&self, tenant_id: &Uuid) -> Result<Branch> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;
        
        let branch = sqlx::query_as!(
            Branch,
            r#"
            SELECT id, tenant_id, name, address, phone, is_main as "is_main!", is_active as "is_active!", created_at as "created_at!"
            FROM branches
            WHERE tenant_id = $1 AND is_main = true
            LIMIT 1
            "#,
            tenant_id
        )
        .fetch_optional(&mut *tx)
        .await?;

        let branch = match branch {
            Some(b) => b,
            None => {
                sqlx::query_as!(
                    Branch,
                    r#"
                    INSERT INTO branches (tenant_id, name, is_main, is_active)
                    VALUES ($1, 'Main Branch', true, true)
                    RETURNING id, tenant_id, name, address, phone, is_main as "is_main!", is_active as "is_active!", created_at as "created_at!"
                    "#,
                    tenant_id
                ).fetch_one(&mut *tx).await?
            }
        };

        tx.commit().await?;
        Ok(branch)
    }

    pub async fn update_main_branch(&self, tenant_id: &Uuid, name: String, address: String, phone: String) -> Result<Branch> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let updated = sqlx::query_as!(
            Branch,
            r#"
            UPDATE branches
            SET name = $1, address = $2, phone = $3
            WHERE tenant_id = $4 AND is_main = true
            RETURNING id, tenant_id, name, address, phone, is_main as "is_main!", is_active as "is_active!", created_at as "created_at!"
            "#,
            name,
            address,
            phone,
            tenant_id
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(updated)
    }

    pub async fn create_branch(&self, branch: &Branch) -> Result<Branch> {
        let mut tx = self.tx_with_tenant(&branch.tenant_id).await?;

        // If this is the main branch, unset any other main branch
        if branch.is_main {
            sqlx::query!(
                "UPDATE branches SET is_main = false WHERE tenant_id = $1",
                branch.tenant_id
            )
            .execute(&mut *tx)
            .await?;
        }

        let created = sqlx::query_as!(
            Branch,
            r#"
            INSERT INTO branches (id, tenant_id, name, address, phone, is_main, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, tenant_id, name, address, phone, is_main as "is_main!", is_active as "is_active!", created_at as "created_at!"
            "#,
            branch.id,
            branch.tenant_id,
            branch.name,
            branch.address,
            branch.phone,
            branch.is_main,
            branch.is_active
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(created)
    }

    pub async fn update_branch(&self, tenant_id: &Uuid, id: &Uuid, name: Option<String>, address: Option<String>, phone: Option<String>, is_main: Option<bool>, is_active: Option<bool>) -> Result<Branch> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        if let Some(true) = is_main {
            sqlx::query!(
                "UPDATE branches SET is_main = false WHERE tenant_id = $1",
                tenant_id
            )
            .execute(&mut *tx)
            .await?;
        }

        let updated = sqlx::query_as!(
            Branch,
            r#"
            UPDATE branches
            SET name = COALESCE($1, name),
                address = COALESCE($2, address),
                phone = COALESCE($3, phone),
                is_main = COALESCE($4, is_main),
                is_active = COALESCE($5, is_active)
            WHERE id = $6 AND tenant_id = $7
            RETURNING id, tenant_id, name, address, phone, is_main as "is_main!", is_active as "is_active!", created_at as "created_at!"
            "#,
            name,
            address,
            phone,
            is_main,
            is_active,
            id,
            tenant_id
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(updated)
    }

    pub async fn delete_branch(&self, tenant_id: &Uuid, id: &Uuid) -> Result<()> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        // Cannot delete the last branch or the main branch without reassignment
        // For now, just a simple delete
        sqlx::query!(
            "DELETE FROM branches WHERE id = $1 AND tenant_id = $2",
            id,
            tenant_id
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(())
    }

    pub async fn list_branches(&self, tenant_id: &Uuid) -> Result<Vec<Branch>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let branches = sqlx::query_as!(
            Branch,
            r#"
            SELECT id, tenant_id, name, address, phone, is_main as "is_main!", is_active as "is_active!", created_at as "created_at!"
            FROM branches
            WHERE tenant_id = $1
            ORDER BY is_main DESC, created_at ASC
            "#,
            tenant_id
        )
        .fetch_all(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(branches)
    }

    pub async fn get_branch(&self, tenant_id: &Uuid, id: &Uuid) -> Result<Option<Branch>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let branch = sqlx::query_as!(
            Branch,
            r#"
            SELECT id, tenant_id, name, address, phone, is_main as "is_main!", is_active as "is_active!", created_at as "created_at!"
            FROM branches
            WHERE id = $1 AND tenant_id = $2
            "#,
            id,
            tenant_id
        )
        .fetch_optional(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(branch)
    }


    pub async fn get_settings(&self, tenant_id: &Uuid) -> Result<TenantSettings> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let settings = sqlx::query_as!(
            TenantSettings,
            r#"
            SELECT tenant_id, theme_color as "theme_color!", logo_url, kiosk_timeout_seconds as "kiosk_timeout_seconds!", language as "language!", currency as "currency!", updated_at as "updated_at!"
            FROM tenant_settings
            WHERE tenant_id = $1
            "#,
            tenant_id
        )
        .fetch_optional(&mut *tx)
        .await?;

        let settings = match settings {
            Some(s) => s,
            None => {
                sqlx::query_as!(
                    TenantSettings,
                    r#"
                    INSERT INTO tenant_settings (tenant_id)
                    VALUES ($1)
                    RETURNING tenant_id, theme_color as "theme_color!", logo_url, kiosk_timeout_seconds as "kiosk_timeout_seconds!", language as "language!", currency as "currency!", updated_at as "updated_at!"
                    "#,
                    tenant_id
                ).fetch_one(&mut *tx).await?
            }
        };

        tx.commit().await?;
        Ok(settings)
    }

    pub async fn update_settings(&self, tenant_id: &Uuid, theme_color: String, kiosk_timeout: i32, language: String, currency: String) -> Result<TenantSettings> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let updated = sqlx::query_as!(
            TenantSettings,
            r#"
            UPDATE tenant_settings
            SET theme_color = $1, kiosk_timeout_seconds = $2, language = $3, currency = $4, updated_at = NOW()
            WHERE tenant_id = $5
            RETURNING tenant_id, theme_color as "theme_color!", logo_url, kiosk_timeout_seconds as "kiosk_timeout_seconds!", language as "language!", currency as "currency!", updated_at as "updated_at!"
            "#,
            theme_color,
            kiosk_timeout,
            language,
            currency,
            tenant_id
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(updated)
    }
}
