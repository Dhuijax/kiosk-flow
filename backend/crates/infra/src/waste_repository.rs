use anyhow::Result;
use domain::models::waste::{WasteLog, WasteLogWithNames};
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

pub struct WasteRepository {
    pool: PgPool,
}

impl WasteRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let tx = crate::db::begin_scoped_tx(&self.pool, tenant_id, None, None).await?;
        Ok(tx)
    }

    pub async fn create_waste_log(&self, log: &WasteLog) -> Result<WasteLog> {
        let mut tx = self.tx_with_tenant(&log.tenant_id).await?;

        let created = sqlx::query_as!(
            WasteLog,
            r#"
            INSERT INTO waste_logs (id, tenant_id, branch_id, ingredient_id, product_id, quantity, reason, cost, note, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, tenant_id, branch_id, ingredient_id, product_id, quantity, reason, cost, note, created_by, created_at as "created_at!"
            "#,
            log.id,
            log.tenant_id,
            log.branch_id,
            log.ingredient_id,
            log.product_id,
            log.quantity,
            log.reason,
            log.cost,
            log.note,
            log.created_by
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(created)
    }

    pub async fn list_waste_logs(
        &self,
        tenant_id: &Uuid,
        branch_id: &Uuid,
        reason: Option<String>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<WasteLogWithNames>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;

        let logs = sqlx::query_as!(
            WasteLogWithNames,
            r#"
            SELECT 
                wl.id, wl.tenant_id, wl.branch_id, wl.ingredient_id, wl.product_id, 
                wl.quantity, wl.reason, wl.cost, wl.note, wl.created_by, wl.created_at as "created_at!",
                p.name as product_name, i.name as ingredient_name
            FROM waste_logs wl
            LEFT JOIN products p ON wl.product_id = p.id
            LEFT JOIN ingredients i ON wl.ingredient_id = i.id
            WHERE wl.branch_id = $1 AND ($2::text IS NULL OR wl.reason = $2)
            ORDER BY wl.created_at DESC
            LIMIT $3 OFFSET $4
            "#,
            branch_id,
            reason,
            limit,
            offset
        )
        .fetch_all(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(logs)
    }
}
