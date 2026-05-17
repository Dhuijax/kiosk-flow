use bigdecimal::ToPrimitive;
use chrono::{DateTime, Utc};
use infra::repository::ReportRepository;
use infra::security::Claims;
use proto_gen::common::Money;
use proto_gen::report::{
    report_service_server::ReportService, GetRevenueSummaryRequest, GetSalesByPeriodRequest,
    GetTopProductsRequest, PeriodType, RevenueSummaryResponse, SalesByPeriodResponse,
    SalesPeriodItem, TopProductItem, TopProductsResponse,
};
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
}
