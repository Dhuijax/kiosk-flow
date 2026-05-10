use std::sync::Arc;
use tonic::{Request, Response, Status};
use uuid::Uuid;
use chrono::Utc;
use bigdecimal::{BigDecimal, ToPrimitive};
use proto_gen::payment::{
    payment_service_server::PaymentService,
    ProcessPaymentRequest, GetPaymentRequest, ListPaymentsRequest,
    PaymentResponse, ListPaymentsResponse,
    Payment as ProtoPayment, PaymentMethod as ProtoPaymentMethod, PaymentStatus as ProtoPaymentStatus
};
use proto_gen::common::Money;
use infra::repository::{PaymentRepository, OrderRepository, CustomerRepository, UserRepository};
use domain::models::payment::{Payment as DomainPayment, PaymentMethod as DomainPaymentMethod, PaymentStatus as DomainPaymentStatus};
use domain::models::order::OrderStatus as DomainOrderStatus;
use infra::security::Claims;

pub struct PaymentServiceImpl {
    payment_repo: Arc<PaymentRepository>,
    order_repo: Arc<OrderRepository>,
    customer_repo: Arc<CustomerRepository>,
    user_repo: Arc<UserRepository>,
}

impl PaymentServiceImpl {
    pub fn new(payment_repo: Arc<PaymentRepository>, order_repo: Arc<OrderRepository>, customer_repo: Arc<CustomerRepository>, user_repo: Arc<UserRepository>) -> Self {
        Self { payment_repo, order_repo, customer_repo, user_repo }
    }

    fn get_context<T>(&self, request: &Request<T>) -> Result<(Uuid, Uuid), Status> {
        let claims = request
            .extensions()
            .get::<Claims>()
            .ok_or_else(|| Status::unauthenticated("Unauthorized: Missing or invalid token"))?;
        
        let tenant_id = Uuid::parse_str(&claims.tenant_id).map_err(|_| Status::invalid_argument("Invalid tenant id"))?;
        let _user_id = Uuid::parse_str(&claims.sub).map_err(|_| Status::invalid_argument("Invalid user id"))?;
        
        Ok((tenant_id, _user_id))
    }
}

#[tonic::async_trait]
impl PaymentService for PaymentServiceImpl {
    async fn process_payment(&self, request: Request<ProcessPaymentRequest>) -> Result<Response<PaymentResponse>, Status> {
        let (tenant_id, user_id) = self.get_context(&request)?;
        let req = request.into_inner();

        let order_id = Uuid::parse_str(&req.order_id).map_err(|_| Status::invalid_argument("Invalid order_id"))?;
        
        // 1. Fetch Order
        let (order, _) = self.order_repo.find_by_id(&tenant_id, &order_id).await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::not_found("Order not found"))?;

        // 2. Validate status
        match order.status {
            DomainOrderStatus::Paid | DomainOrderStatus::Completed | DomainOrderStatus::Cancelled => {
                return Err(Status::failed_precondition("Order is already paid, completed or cancelled"));
            }
            _ => {}
        }

        // 3. Setup money
        let received_amount = if let Some(ref m) = req.received_amount {
            BigDecimal::from(m.units) // Simplified: ignore nanos for now as per project pattern
        } else {
            return Err(Status::invalid_argument("Missing received_amount"));
        };

        if received_amount < order.total {
            return Err(Status::failed_precondition("Insufficient received amount"));
        }

        let change_amount = &received_amount - &order.total;

        // 4. Create Payment
        let domain_payment = DomainPayment {
            id: Uuid::new_v4(),
            tenant_id,
            branch_id: Some(order.branch_id),
            order_id,
            method: map_proto_method_to_domain(ProtoPaymentMethod::try_from(req.method).unwrap_or(ProtoPaymentMethod::Cash)),
            amount: order.total.clone(),
            received_amount,
            change_amount,
            transaction_ref: Some(req.transaction_ref),
            status: DomainPaymentStatus::Completed,
            created_by: user_id,
            paid_at: Utc::now(),
        };

        // 4. Create Payment and Update Order Status Atomically
        let created = self.payment_repo.create_with_order_status(&domain_payment, DomainOrderStatus::Paid).await
            .map_err(|e| Status::internal(e.to_string()))?;

        // 5. Update Order with Cashier Name and Customer Points (Post-payment hooks)
        let cashier_name = self.user_repo.find_by_id(&tenant_id, &domain_payment.created_by).await
            .ok().flatten()
            .map(|u| u.full_name);
        
        // Update order with cashier name
        if let Some(name) = cashier_name {
            let _ = self.order_repo.update_cashier_name(&tenant_id, &order_id, &name).await;
        }

        // 6. Point Accumulation
        if let Some(customer_id) = order.customer_id {
            let points = (order.total.to_f32().unwrap_or(0.0) / 10000.0) as i32;
            if points > 0 {
                let _ = self.customer_repo.update_points(&tenant_id, &customer_id, points).await;
            }
        }

        Ok(Response::new(PaymentResponse {
            payment: Some(map_domain_to_proto(created)),
        }))
    }

    async fn get_payment(&self, request: Request<GetPaymentRequest>) -> Result<Response<PaymentResponse>, Status> {
        let (tenant_id, _) = self.get_context(&request)?;
        let req = request.into_inner();

        let payment = match req.query {
            Some(proto_gen::payment::get_payment_request::Query::Id(id)) => {
                let uid = Uuid::parse_str(&id).map_err(|_| Status::invalid_argument("Invalid id"))?;
                self.payment_repo.find_by_id(&tenant_id, &uid).await
                    .map_err(|e| Status::internal(e.to_string()))?
            }
            Some(proto_gen::payment::get_payment_request::Query::OrderId(oid)) => {
                let uuid = Uuid::parse_str(&oid).map_err(|_| Status::invalid_argument("Invalid order_id"))?;
                self.payment_repo.find_by_order_id(&tenant_id, &uuid).await
                    .map_err(|e| Status::internal(e.to_string()))?
            }
            None => return Err(Status::invalid_argument("Missing query")),
        };

        match payment {
            Some(p) => Ok(Response::new(PaymentResponse { payment: Some(map_domain_to_proto(p)) })),
            None => Err(Status::not_found("Payment not found")),
        }
    }

    async fn list_payments(&self, request: Request<ListPaymentsRequest>) -> Result<Response<ListPaymentsResponse>, Status> {
        let (tenant_id, _) = self.get_context(&request)?;
        let req = request.into_inner();

        let branch_id = Uuid::parse_str(&req.branch_id).map_err(|_| Status::invalid_argument("Invalid branch_id"))?;
        let pagination = req.pagination.unwrap_or_default();
        let limit = if pagination.page_size > 0 { pagination.page_size } else { 10 };
        let offset = (if pagination.page > 0 { pagination.page - 1 } else { 0 }) * limit;

        let payments = self.payment_repo.list_by_branch(&tenant_id, &branch_id, limit as i64, offset as i64).await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(ListPaymentsResponse {
            payments: payments.into_iter().map(map_domain_to_proto).collect(),
            pagination: None, // Simplified for now
        }))
    }
}

fn map_proto_method_to_domain(m: ProtoPaymentMethod) -> DomainPaymentMethod {
    match m {
        ProtoPaymentMethod::Cash => DomainPaymentMethod::Cash,
        ProtoPaymentMethod::Card => DomainPaymentMethod::Card,
        ProtoPaymentMethod::Transfer => DomainPaymentMethod::Transfer,
        ProtoPaymentMethod::Momo => DomainPaymentMethod::Momo,
        ProtoPaymentMethod::Zalopay => DomainPaymentMethod::ZaloPay,
    }
}

fn map_domain_method_to_proto(m: DomainPaymentMethod) -> ProtoPaymentMethod {
    match m {
        DomainPaymentMethod::Cash => ProtoPaymentMethod::Cash,
        DomainPaymentMethod::Card => ProtoPaymentMethod::Card,
        DomainPaymentMethod::Transfer => ProtoPaymentMethod::Transfer,
        DomainPaymentMethod::Momo => ProtoPaymentMethod::Momo,
        DomainPaymentMethod::ZaloPay => ProtoPaymentMethod::Zalopay,
    }
}

fn map_domain_status_to_proto(s: DomainPaymentStatus) -> ProtoPaymentStatus {
    match s {
        DomainPaymentStatus::Pending => ProtoPaymentStatus::Pending,
        DomainPaymentStatus::Completed => ProtoPaymentStatus::Completed,
        DomainPaymentStatus::Refunded => ProtoPaymentStatus::Refunded,
    }
}

fn map_money_to_proto(val: BigDecimal) -> Option<Money> {
    let units = val.to_i64()?;
    Some(Money {
        currency_code: "VND".to_string(),
        units,
        nanos: 0,
    })
}

fn map_domain_to_proto(p: DomainPayment) -> ProtoPayment {
    ProtoPayment {
        id: p.id.to_string(),
        order_id: p.order_id.to_string(),
        branch_id: p.branch_id.map(|b| b.to_string()).unwrap_or_default(),
        method: map_domain_method_to_proto(p.method) as i32,
        amount: map_money_to_proto(p.amount),
        received_amount: map_money_to_proto(p.received_amount),
        change_amount: map_money_to_proto(p.change_amount),
        transaction_ref: p.transaction_ref.unwrap_or_default(),
        status: map_domain_status_to_proto(p.status) as i32,
        paid_at: Some(prost_types::Timestamp {
            seconds: p.paid_at.timestamp(),
            nanos: p.paid_at.timestamp_subsec_nanos() as i32,
        }),
    }
}
