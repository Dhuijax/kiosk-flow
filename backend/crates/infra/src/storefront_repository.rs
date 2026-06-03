use anyhow::Result;
use domain::models::storefront::{
    Announcement, ChatMessage, News, Partner, Promotion, Reservation,
};
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

pub struct StorefrontRepository {
    pool: PgPool,
}

impl StorefrontRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn tx_with_tenant(&self, tenant_id: &Uuid) -> Result<Transaction<'_, Postgres>> {
        let tx = crate::db::begin_scoped_tx(&self.pool, tenant_id, None, None).await?;
        Ok(tx)
    }

    pub async fn get_active_promotions(&self, tenant_id: &Uuid) -> Result<Vec<Promotion>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;
        let rows = sqlx::query_as!(
            Promotion,
            r#"
            SELECT id, tenant_id, title, description, code, discount_percent, discount_amount, start_date as "start_date!", end_date as "end_date!", is_active as "is_active!", created_at as "created_at!", updated_at as "updated_at!"
            FROM promotions
            WHERE is_active = true AND start_date <= NOW() AND end_date >= NOW()
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(rows)
    }

    pub async fn get_latest_news(&self, tenant_id: &Uuid) -> Result<Vec<News>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;
        let rows = sqlx::query_as!(
            News,
            r#"
            SELECT id, tenant_id, title, summary, content, author, image_url, created_at as "created_at!", updated_at as "updated_at!"
            FROM news
            ORDER BY created_at DESC
            LIMIT 20
            "#
        )
        .fetch_all(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(rows)
    }

    pub async fn get_partners(&self, tenant_id: &Uuid) -> Result<Vec<Partner>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;
        let rows = sqlx::query_as!(
            Partner,
            r#"
            SELECT id, tenant_id, name, logo_url, website_url, created_at as "created_at!"
            FROM partners
            ORDER BY name ASC
            "#
        )
        .fetch_all(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(rows)
    }

    pub async fn get_active_announcements(&self, tenant_id: &Uuid) -> Result<Vec<Announcement>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;
        let rows = sqlx::query_as!(
            Announcement,
            r#"
            SELECT id, tenant_id, title, content, level, start_date as "start_date!", end_date as "end_date!", created_at as "created_at!"
            FROM announcements
            WHERE start_date <= NOW() AND end_date >= NOW()
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(rows)
    }

    pub async fn create_reservation(&self, reservation: &Reservation) -> Result<Reservation> {
        let mut tx = crate::db::begin_scoped_tx(
            &self.pool,
            &reservation.tenant_id,
            None,
            Some(&reservation.branch_id),
        )
        .await?;
        let row = sqlx::query_as!(
            Reservation,
            r#"
            INSERT INTO reservations (id, tenant_id, branch_id, table_id, customer_name, customer_phone, guest_count, reservation_time, note, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, tenant_id, branch_id, table_id, customer_name, customer_phone, guest_count, reservation_time as "reservation_time!", note, status, created_at as "created_at!", updated_at as "updated_at!"
            "#,
            reservation.id,
            reservation.tenant_id,
            reservation.branch_id,
            reservation.table_id,
            reservation.customer_name,
            reservation.customer_phone,
            reservation.guest_count,
            reservation.reservation_time,
            reservation.note,
            reservation.status
        )
        .fetch_one(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(row)
    }

    pub async fn list_reservations(
        &self,
        tenant_id: &Uuid,
        branch_id: &Uuid,
        status: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Reservation>> {
        let mut tx =
            crate::db::begin_scoped_tx(&self.pool, tenant_id, None, Some(branch_id)).await?;
        let rows = sqlx::query_as!(
            Reservation,
            r#"
            SELECT id, tenant_id, branch_id, table_id, customer_name, customer_phone, guest_count, reservation_time as "reservation_time!", note, status, created_at as "created_at!", updated_at as "updated_at!"
            FROM reservations
            WHERE (status = $1 OR $1 IS NULL)
            ORDER BY reservation_time ASC
            LIMIT $2 OFFSET $3
            "#,
            status,
            limit,
            offset
        )
        .fetch_all(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(rows)
    }

    pub async fn count_reservations(
        &self,
        tenant_id: &Uuid,
        branch_id: &Uuid,
        status: Option<&str>,
    ) -> Result<i64> {
        let mut tx =
            crate::db::begin_scoped_tx(&self.pool, tenant_id, None, Some(branch_id)).await?;
        let count = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*)::BIGINT
            FROM reservations
            WHERE (status = $1 OR $1 IS NULL)
            "#,
            status
        )
        .fetch_one(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(count.unwrap_or_default())
    }

    pub async fn update_reservation_status(
        &self,
        tenant_id: &Uuid,
        id: &Uuid,
        status: &str,
        table_id: Option<&Uuid>,
    ) -> Result<Reservation> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;
        let row = sqlx::query_as!(
            Reservation,
            r#"
            UPDATE reservations
            SET status = $1, table_id = COALESCE($2, table_id), updated_at = NOW()
            WHERE id = $3
            RETURNING id, tenant_id, branch_id, table_id, customer_name, customer_phone, guest_count, reservation_time as "reservation_time!", note, status, created_at as "created_at!", updated_at as "updated_at!"
            "#,
            status,
            table_id.cloned(),
            id
        )
        .fetch_one(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(row)
    }

    pub async fn create_chat_message(&self, message: &ChatMessage) -> Result<ChatMessage> {
        let mut tx = self.tx_with_tenant(&message.tenant_id).await?;
        let row = sqlx::query_as!(
            ChatMessage,
            r#"
            INSERT INTO chat_messages (id, tenant_id, conversation_id, sender_type, content)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, tenant_id, conversation_id, sender_type, content, created_at as "created_at!"
            "#,
            message.id,
            message.tenant_id,
            message.conversation_id,
            message.sender_type,
            message.content
        )
        .fetch_one(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(row)
    }

    pub async fn get_chat_history(
        &self,
        tenant_id: &Uuid,
        conversation_id: &Uuid,
    ) -> Result<Vec<ChatMessage>> {
        let mut tx = self.tx_with_tenant(tenant_id).await?;
        let rows = sqlx::query_as!(
            ChatMessage,
            r#"
            SELECT id, tenant_id, conversation_id, sender_type, content, created_at as "created_at!"
            FROM chat_messages
            WHERE conversation_id = $1
            ORDER BY created_at ASC
            "#,
            conversation_id
        )
        .fetch_all(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(rows)
    }
}
