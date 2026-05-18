use domain::models::procurement::{PurchaseOrder, PurchaseOrderItem, StockAlert, Supplier};
use sqlx::types::BigDecimal;
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

pub struct ProcurementRepository {
    pool: PgPool,
}

impl ProcurementRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // Suppliers
    pub async fn create_supplier(
        &self,
        tenant_id: Uuid,
        name: &str,
        phone: Option<&str>,
        email: Option<&str>,
        address: Option<&str>,
    ) -> Result<Supplier, sqlx::Error> {
        let supplier = sqlx::query_as::<_, Supplier>(
            r#"
            INSERT INTO suppliers (tenant_id, name, phone, email, address)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(tenant_id)
        .bind(name)
        .bind(phone)
        .bind(email)
        .bind(address)
        .fetch_one(&self.pool)
        .await?;

        Ok(supplier)
    }

    pub async fn get_supplier(
        &self,
        tenant_id: Uuid,
        supplier_id: Uuid,
    ) -> Result<Supplier, sqlx::Error> {
        let supplier = sqlx::query_as::<_, Supplier>(
            r#"
            SELECT * FROM suppliers WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(supplier_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(supplier)
    }

    pub async fn list_suppliers(
        &self,
        tenant_id: Uuid,
        search: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Supplier>, sqlx::Error> {
        let suppliers = if let Some(search_term) = search {
            let search_pattern = format!("%{}%", search_term);
            sqlx::query_as::<_, Supplier>(
                r#"
                SELECT * FROM suppliers 
                WHERE tenant_id = $1 AND name ILIKE $2
                ORDER BY created_at DESC LIMIT $3 OFFSET $4
                "#,
            )
            .bind(tenant_id)
            .bind(search_pattern)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, Supplier>(
                r#"
                SELECT * FROM suppliers 
                WHERE tenant_id = $1
                ORDER BY created_at DESC LIMIT $2 OFFSET $3
                "#,
            )
            .bind(tenant_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(suppliers)
    }

    pub async fn update_supplier(
        &self,
        tenant_id: Uuid,
        supplier_id: Uuid,
        name: Option<&str>,
        phone: Option<&str>,
        email: Option<&str>,
        address: Option<&str>,
    ) -> Result<Supplier, sqlx::Error> {
        let supplier = sqlx::query_as::<_, Supplier>(
            r#"
            UPDATE suppliers 
            SET name = COALESCE($3, name),
                phone = COALESCE($4, phone),
                email = COALESCE($5, email),
                address = COALESCE($6, address),
                updated_at = NOW()
            WHERE tenant_id = $1 AND id = $2
            RETURNING *
            "#,
        )
        .bind(tenant_id)
        .bind(supplier_id)
        .bind(name)
        .bind(phone)
        .bind(email)
        .bind(address)
        .fetch_one(&self.pool)
        .await?;

        Ok(supplier)
    }

    pub async fn delete_supplier(
        &self,
        tenant_id: Uuid,
        supplier_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            DELETE FROM suppliers WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(supplier_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Purchase Orders
    pub async fn begin_transaction(&self) -> Result<Transaction<'_, Postgres>, sqlx::Error> {
        let tenant_id = crate::middleware::CURRENT_CONTEXT
            .try_with(|c| c.tenant_id)
            .unwrap_or_default();
        let tx = crate::db::begin_scoped_tx(&self.pool, &tenant_id, None, None)
            .await
            .map_err(|e| sqlx::Error::Protocol(e.to_string()))?;
        Ok(tx)
    }

    pub async fn create_purchase_order(
        tx: &mut Transaction<'_, Postgres>,
        tenant_id: Uuid,
        branch_id: Uuid,
        supplier_id: Uuid,
        total_amount: BigDecimal,
        created_by: Uuid,
    ) -> Result<PurchaseOrder, sqlx::Error> {
        let po = sqlx::query_as::<_, PurchaseOrder>(
            r#"
            INSERT INTO purchase_orders (tenant_id, branch_id, supplier_id, total_amount, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#
        )
        .bind(tenant_id)
        .bind(branch_id)
        .bind(supplier_id)
        .bind(total_amount)
        .bind(created_by)
        .fetch_one(&mut **tx)
        .await?;

        Ok(po)
    }

    pub async fn create_purchase_order_item(
        tx: &mut Transaction<'_, Postgres>,
        tenant_id: Uuid,
        purchase_order_id: Uuid,
        ingredient_id: Uuid,
        quantity: BigDecimal,
        unit_price: BigDecimal,
    ) -> Result<PurchaseOrderItem, sqlx::Error> {
        let item = sqlx::query_as::<_, PurchaseOrderItem>(
            r#"
            INSERT INTO purchase_order_items (tenant_id, purchase_order_id, ingredient_id, quantity, unit_price)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#
        )
        .bind(tenant_id)
        .bind(purchase_order_id)
        .bind(ingredient_id)
        .bind(quantity)
        .bind(unit_price)
        .fetch_one(&mut **tx)
        .await?;

        Ok(item)
    }

    pub async fn get_purchase_order(
        &self,
        tenant_id: Uuid,
        po_id: Uuid,
    ) -> Result<PurchaseOrder, sqlx::Error> {
        let po = sqlx::query_as::<_, PurchaseOrder>(
            r#"
            SELECT * FROM purchase_orders WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(po_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(po)
    }

    pub async fn get_purchase_order_items(
        &self,
        tenant_id: Uuid,
        po_id: Uuid,
    ) -> Result<Vec<PurchaseOrderItem>, sqlx::Error> {
        let items = sqlx::query_as::<_, PurchaseOrderItem>(
            r#"
            SELECT * FROM purchase_order_items WHERE tenant_id = $1 AND purchase_order_id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(po_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(items)
    }

    pub async fn list_purchase_orders(
        &self,
        tenant_id: Uuid,
        branch_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<PurchaseOrder>, sqlx::Error> {
        let pos = sqlx::query_as::<_, PurchaseOrder>(
            r#"
            SELECT * FROM purchase_orders 
            WHERE tenant_id = $1 AND branch_id = $2
            ORDER BY created_at DESC LIMIT $3 OFFSET $4
            "#,
        )
        .bind(tenant_id)
        .bind(branch_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(pos)
    }

    // Stock Alerts
    pub async fn create_stock_alert(
        tx: &mut Transaction<'_, Postgres>,
        tenant_id: Uuid,
        branch_id: Uuid,
        ingredient_id: Uuid,
        message: &str,
    ) -> Result<StockAlert, sqlx::Error> {
        let alert = sqlx::query_as::<_, StockAlert>(
            r#"
            INSERT INTO stock_alerts (tenant_id, branch_id, ingredient_id, message)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#,
        )
        .bind(tenant_id)
        .bind(branch_id)
        .bind(ingredient_id)
        .bind(message)
        .fetch_one(&mut **tx)
        .await?;

        Ok(alert)
    }

    pub async fn list_stock_alerts(
        &self,
        tenant_id: Uuid,
        branch_id: Uuid,
        include_read: bool,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<StockAlert>, sqlx::Error> {
        let alerts = if include_read {
            sqlx::query_as::<_, StockAlert>(
                r#"
                SELECT * FROM stock_alerts 
                WHERE tenant_id = $1 AND branch_id = $2
                ORDER BY created_at DESC LIMIT $3 OFFSET $4
                "#,
            )
            .bind(tenant_id)
            .bind(branch_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, StockAlert>(
                r#"
                SELECT * FROM stock_alerts 
                WHERE tenant_id = $1 AND branch_id = $2 AND is_read = false
                ORDER BY created_at DESC LIMIT $3 OFFSET $4
                "#,
            )
            .bind(tenant_id)
            .bind(branch_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(alerts)
    }

    pub async fn mark_alert_as_read(
        &self,
        tenant_id: Uuid,
        alert_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE stock_alerts SET is_read = true WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(alert_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn dismiss_alert(&self, tenant_id: Uuid, alert_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            DELETE FROM stock_alerts WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(alert_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Helper: update ingredient stock (for POs)
    pub async fn increase_ingredient_stock(
        tx: &mut Transaction<'_, Postgres>,
        tenant_id: Uuid,
        branch_id: Uuid,
        ingredient_id: Uuid,
        quantity: BigDecimal,
        po_id: Uuid,
        created_by: Uuid,
    ) -> Result<(), sqlx::Error> {
        // Upsert inventory
        sqlx::query(
            r#"
            INSERT INTO inventory (tenant_id, branch_id, ingredient_id, quantity)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tenant_id, branch_id, ingredient_id) WHERE ingredient_id IS NOT NULL
            DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity, updated_at = NOW()
            "#,
        )
        .bind(tenant_id)
        .bind(branch_id)
        .bind(ingredient_id)
        .bind(quantity.clone())
        .execute(&mut **tx)
        .await?;

        // Log transaction
        sqlx::query(
            r#"
            INSERT INTO inventory_transactions (tenant_id, branch_id, ingredient_id, type, quantity_change, reference_id, created_by)
            VALUES ($1, $2, $3, 'purchase', $4, $5, $6)
            "#
        )
        .bind(tenant_id)
        .bind(branch_id)
        .bind(ingredient_id)
        .bind(quantity)
        .bind(po_id)
        .bind(created_by)
        .execute(&mut **tx)
        .await?;

        Ok(())
    }
}
