use bigdecimal::ToPrimitive;
use chrono::{DateTime, Utc};
use infra::repository::ReportRepository;
use infra::security::Claims;
use proto_gen::common::Money;
use proto_gen::report::{
    report_service_server::ReportService, AdvancedAnalyticsResponse, ComboTrendItem,
    GetAdvancedAnalyticsRequest, GetRevenueSummaryRequest, GetSalesByPeriodRequest,
    GetTopProductsRequest, GetZReportRequest, IngredientWasteItem, PeriodType,
    RevenueSummaryResponse, SalesByPeriodResponse, SalesPeriodItem, TopProductItem,
    TopProductsResponse, ZReportResponse,
};
use sqlx::Row;
use std::sync::Arc;
use tonic::{Request, Response, Status};
use uuid::Uuid;

pub struct ReportServiceImpl {
    report_repo: Arc<ReportRepository>,
}

impl ReportServiceImpl {
    pub fn new(report_repo: Arc<ReportRepository>) -> Self {
        Self { report_repo }
    }

    fn get_context<T>(&self, request: &Request<T>) -> Result<Uuid, Status> {
        let claims = request
            .extensions()
            .get::<Claims>()
            .ok_or_else(|| Status::unauthenticated("Unauthorized: Missing or invalid token"))?;

        let tenant_id = Uuid::parse_str(&claims.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant id"))?;

        Ok(tenant_id)
    }

    fn parse_dates(
        &self,
        start: &str,
        end: &str,
    ) -> Result<(DateTime<Utc>, DateTime<Utc>), Status> {
        let start_dt = DateTime::parse_from_rfc3339(start)
            .map_err(|_| Status::invalid_argument("Invalid start_date format (ISO 8601 required)"))?
            .with_timezone(&Utc);

        let end_dt = DateTime::parse_from_rfc3339(end)
            .map_err(|_| Status::invalid_argument("Invalid end_date format (ISO 8601 required)"))?
            .with_timezone(&Utc);

        Ok((start_dt, end_dt))
    }

    fn map_money_to_proto(&self, val: bigdecimal::BigDecimal) -> Option<Money> {
        let units = val.to_i64()?;
        Some(Money {
            currency_code: "VND".to_string(),
            units,
            nanos: 0,
        })
    }
}

#[tonic::async_trait]
impl ReportService for ReportServiceImpl {
    async fn get_revenue_summary(
        &self,
        request: Request<GetRevenueSummaryRequest>,
    ) -> Result<Response<RevenueSummaryResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();

        let branch_id = if !req.branch_id.is_empty() {
            Some(
                Uuid::parse_str(&req.branch_id)
                    .map_err(|_| Status::invalid_argument("Invalid branch_id"))?,
            )
        } else {
            None
        };

        let (start_dt, end_dt) = self.parse_dates(&req.start_date, &req.end_date)?;

        let (total_revenue, total_orders) = self
            .report_repo
            .get_revenue_summary(&tenant_id, branch_id, start_dt, end_dt)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let avg_value = if total_orders > 0 {
            &total_revenue / bigdecimal::BigDecimal::from(total_orders)
        } else {
            bigdecimal::BigDecimal::from(0)
        };

        Ok(Response::new(RevenueSummaryResponse {
            total_revenue: self.map_money_to_proto(total_revenue),
            total_orders: total_orders as i32,
            average_order_value: self.map_money_to_proto(avg_value),
        }))
    }

    async fn get_top_products(
        &self,
        request: Request<GetTopProductsRequest>,
    ) -> Result<Response<TopProductsResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();

        let branch_id = if !req.branch_id.is_empty() {
            Some(
                Uuid::parse_str(&req.branch_id)
                    .map_err(|_| Status::invalid_argument("Invalid branch_id"))?,
            )
        } else {
            None
        };

        let (start_dt, end_dt) = self.parse_dates(&req.start_date, &req.end_date)?;
        let limit = if req.limit > 0 { req.limit } else { 10 };

        let rows = self
            .report_repo
            .get_top_products(&tenant_id, branch_id, start_dt, end_dt, limit)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let items = rows
            .into_iter()
            .map(|(pid, name, qty, rev)| TopProductItem {
                product_id: pid.to_string(),
                product_name: name,
                quantity_sold: qty as i32,
                revenue: self.map_money_to_proto(rev),
            })
            .collect();

        Ok(Response::new(TopProductsResponse { items }))
    }

    async fn get_sales_by_period(
        &self,
        request: Request<GetSalesByPeriodRequest>,
    ) -> Result<Response<SalesByPeriodResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();

        let branch_id = if !req.branch_id.is_empty() {
            Some(
                Uuid::parse_str(&req.branch_id)
                    .map_err(|_| Status::invalid_argument("Invalid branch_id"))?,
            )
        } else {
            None
        };

        let (start_dt, end_dt) = self.parse_dates(&req.start_date, &req.end_date)?;

        let period_str = match PeriodType::try_from(req.period).unwrap_or(PeriodType::Daily) {
            PeriodType::Daily => "day",
            PeriodType::Weekly => "week",
            PeriodType::Monthly => "month",
        };

        let rows = self
            .report_repo
            .get_sales_by_period(&tenant_id, branch_id, start_dt, end_dt, period_str)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let items = rows
            .into_iter()
            .map(|(label, rev, count)| SalesPeriodItem {
                period_label: label,
                revenue: self.map_money_to_proto(rev),
                order_count: count as i32,
            })
            .collect();

        Ok(Response::new(SalesByPeriodResponse { items }))
    }

    async fn get_advanced_analytics(
        &self,
        request: Request<GetAdvancedAnalyticsRequest>,
    ) -> Result<Response<AdvancedAnalyticsResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();

        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;

        let (start_dt, end_dt) = self.parse_dates(&req.start_date, &req.end_date)?;

        let pool = self.report_repo.pool();
        let mut tx = pool
            .begin()
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        // 1. Revenue by payment method
        let payments_rows = sqlx::query(
            "SELECT method::text as method, SUM(amount) as total
             FROM payments
             WHERE tenant_id = $1 
               AND branch_id = $2
               AND status = 'completed'
               AND paid_at >= $3
               AND paid_at <= $4
             GROUP BY method",
        )
        .bind(tenant_id)
        .bind(branch_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| Status::internal(e.to_string()))?;

        let mut revenue_values = vec![bigdecimal::BigDecimal::from(0); 5];
        for row in payments_rows {
            let method: String = row.get("method");
            let total: bigdecimal::BigDecimal = row.get("total");
            match method.as_str() {
                "cash" => revenue_values[0] = total,
                "card" => revenue_values[1] = total,
                "momo" => revenue_values[2] = total,
                "zalopay" => revenue_values[3] = total,
                "transfer" => revenue_values[4] = total,
                _ => {}
            }
        }

        // 2. Combo Trends
        let combo_rows = sqlx::query(
            "SELECT oi.product_name, SUM(oi.quantity)::integer as quantity_sold, SUM(oi.subtotal) as revenue
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE o.tenant_id = $1
               AND o.branch_id = $2
               AND o.status = 'completed'
               AND o.created_at >= $3
               AND o.created_at <= $4
               AND oi.product_name ILIKE '%Combo%'
             GROUP BY oi.product_name
             ORDER BY SUM(oi.quantity) DESC
             LIMIT 10"
        )
        .bind(tenant_id)
        .bind(branch_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| Status::internal(e.to_string()))?;

        // 3. Ingredient Waste
        let waste_rows = sqlx::query(
            "SELECT 
                 i.name as ingredient_name,
                 i.unit as unit,
                 SUM(-it.quantity_change)::double precision as wasted_quantity,
                 SUM(-it.quantity_change * i.cost_price) as waste_cost
             FROM inventory_transactions it
             JOIN ingredients i ON it.ingredient_id = i.id
             WHERE it.tenant_id = $1 
               AND it.branch_id = $2
               AND it.type = 'adjustment'
               AND it.quantity_change < 0
               AND it.created_at >= $3
               AND it.created_at <= $4
             GROUP BY i.name, i.unit",
        )
        .bind(tenant_id)
        .bind(branch_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| Status::internal(e.to_string()))?;

        tx.commit()
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let revenue_by_method = revenue_values
            .into_iter()
            .map(|val| {
                self.map_money_to_proto(val).unwrap_or(Money {
                    currency_code: "VND".to_string(),
                    units: 0,
                    nanos: 0,
                })
            })
            .collect();

        let combo_trends = combo_rows
            .into_iter()
            .map(|row| {
                let name: String = row.get("product_name");
                let quantity_sold: i32 = row.get("quantity_sold");
                let revenue: bigdecimal::BigDecimal = row.get("revenue");
                ComboTrendItem {
                    combo_name: name,
                    quantity_sold,
                    revenue: self.map_money_to_proto(revenue),
                }
            })
            .collect();

        let ingredient_wastes = waste_rows
            .into_iter()
            .map(|row| {
                let name: String = row.get("ingredient_name");
                let unit: String = row.get("unit");
                let wasted_quantity: f64 = row.get("wasted_quantity");
                let waste_cost: bigdecimal::BigDecimal = row.get("waste_cost");
                IngredientWasteItem {
                    ingredient_name: name,
                    wasted_quantity,
                    unit,
                    waste_cost: self.map_money_to_proto(waste_cost),
                }
            })
            .collect();

        Ok(Response::new(AdvancedAnalyticsResponse {
            revenue_by_method,
            combo_trends,
            ingredient_wastes,
        }))
    }

    async fn get_z_report(
        &self,
        request: Request<GetZReportRequest>,
    ) -> Result<Response<ZReportResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();

        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;

        let start_dt = chrono::Utc::now()
            .date_naive()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            .and_local_timezone(chrono::Utc)
            .unwrap();
        let end_dt = chrono::Utc::now()
            .date_naive()
            .and_hms_opt(23, 59, 59)
            .unwrap()
            .and_local_timezone(chrono::Utc)
            .unwrap();

        let pool = self.report_repo.pool();
        let mut tx = pool
            .begin()
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        sqlx::query("SELECT set_config('app.current_tenant', $1, true)")
            .bind(tenant_id.to_string())
            .execute(&mut *tx)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        // 1. Order stats
        let order_stats_row = sqlx::query(
            "SELECT 
                 COUNT(*)::integer as total,
                 COUNT(*) FILTER (WHERE status = 'cancelled')::integer as cancelled
             FROM orders
             WHERE tenant_id = $1 
               AND branch_id = $2
               AND created_at >= $3
               AND created_at <= $4",
        )
        .bind(tenant_id)
        .bind(branch_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| Status::internal(e.to_string()))?;

        let total_orders: i32 = order_stats_row.get("total");
        let voided_orders: i32 = order_stats_row.get("cancelled");

        // 2. Net revenue
        let net_revenue_row = sqlx::query(
            "SELECT COALESCE(SUM(total), 0) as net
             FROM orders
             WHERE tenant_id = $1 
               AND branch_id = $2
               AND status = 'completed'
               AND created_at >= $3
               AND created_at <= $4",
        )
        .bind(tenant_id)
        .bind(branch_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| Status::internal(e.to_string()))?;

        let net_revenue: bigdecimal::BigDecimal = net_revenue_row.get("net");

        // 3. Revenue by payment method
        let payments_rows = sqlx::query(
            "SELECT method::text as method, SUM(amount) as total
             FROM payments
             WHERE tenant_id = $1 
               AND branch_id = $2
               AND status = 'completed'
               AND paid_at >= $3
               AND paid_at <= $4
             GROUP BY method",
        )
        .bind(tenant_id)
        .bind(branch_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| Status::internal(e.to_string()))?;

        let mut cash_rev = bigdecimal::BigDecimal::from(0);
        let mut card_rev = bigdecimal::BigDecimal::from(0);
        let mut qr_rev = bigdecimal::BigDecimal::from(0);

        for row in payments_rows {
            let method: String = row.get("method");
            let total: bigdecimal::BigDecimal = row.get("total");
            match method.as_str() {
                "cash" => cash_rev = total,
                "card" => card_rev = total,
                "momo" | "zalopay" | "transfer" => qr_rev += total,
                _ => {}
            }
        }

        // 4. Top combos
        let combo_rows = sqlx::query(
            "SELECT oi.product_name, SUM(oi.quantity)::integer as quantity_sold, SUM(oi.subtotal) as revenue
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE o.tenant_id = $1
               AND o.branch_id = $2
               AND o.status = 'completed'
               AND o.created_at >= $3
               AND o.created_at <= $4
               AND oi.product_name ILIKE '%Combo%'
             GROUP BY oi.product_name
             ORDER BY SUM(oi.quantity) DESC
             LIMIT 5"
        )
        .bind(tenant_id)
        .bind(branch_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| Status::internal(e.to_string()))?;

        // 5. Shift wastes
        let waste_rows = sqlx::query(
            "SELECT 
                 i.name as ingredient_name,
                 i.unit as unit,
                 SUM(-it.quantity_change)::double precision as wasted_quantity,
                 SUM(-it.quantity_change * i.cost_price) as waste_cost
             FROM inventory_transactions it
             JOIN ingredients i ON it.ingredient_id = i.id
             WHERE it.tenant_id = $1 
               AND it.branch_id = $2
               AND it.type = 'adjustment'
               AND it.quantity_change < 0
               AND it.created_at >= $3
               AND it.created_at <= $4
             GROUP BY i.name, i.unit",
        )
        .bind(tenant_id)
        .bind(branch_id)
        .bind(start_dt)
        .bind(end_dt)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| Status::internal(e.to_string()))?;

        tx.commit()
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let top_combos = combo_rows
            .into_iter()
            .map(|row| {
                let name: String = row.get("product_name");
                let quantity_sold: i32 = row.get("quantity_sold");
                let revenue: bigdecimal::BigDecimal = row.get("revenue");
                ComboTrendItem {
                    combo_name: name,
                    quantity_sold,
                    revenue: self.map_money_to_proto(revenue),
                }
            })
            .collect();

        let shift_wastes = waste_rows
            .into_iter()
            .map(|row| {
                let name: String = row.get("ingredient_name");
                let unit: String = row.get("unit");
                let wasted_quantity: f64 = row.get("wasted_quantity");
                let waste_cost: bigdecimal::BigDecimal = row.get("waste_cost");
                IngredientWasteItem {
                    ingredient_name: name,
                    wasted_quantity,
                    unit,
                    waste_cost: self.map_money_to_proto(waste_cost),
                }
            })
            .collect();

        Ok(Response::new(ZReportResponse {
            report_time: chrono::Utc::now().to_rfc3339(),
            total_orders,
            voided_orders,
            net_revenue: self.map_money_to_proto(net_revenue),
            cash_revenue: self.map_money_to_proto(cash_rev),
            card_revenue: self.map_money_to_proto(card_rev),
            qr_revenue: self.map_money_to_proto(qr_rev),
            top_combos,
            shift_wastes,
        }))
    }
}
