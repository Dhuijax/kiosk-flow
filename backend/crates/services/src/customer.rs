use bigdecimal::ToPrimitive;
use chrono::{Duration, Utc};
use domain::models::customer::Customer as DomainCustomer;
use infra::repository::{CustomerRepository, OrderRepository};
use infra::security::Claims;
use proto_gen::common::{Money, PaginationResponse};
use proto_gen::customer::{
    customer_service_server::CustomerService, Customer as ProtoCustomer, CustomerResponse,
    DeleteCustomerRequest, DeleteCustomerResponse, FindCustomerByPhoneRequest, GetCustomerRequest,
    GetTransactionHistoryRequest, ListCustomersRequest, ListCustomersResponse,
    RegisterCustomerRequest, Transaction as ProtoTransaction, TransactionHistoryResponse,
    UpdateCustomerRequest,
};
use std::sync::Arc;
use tonic::{Request, Response, Status};
use uuid::Uuid;

pub struct CustomerServiceImpl {
    customer_repo: Arc<CustomerRepository>,
    order_repo: Arc<OrderRepository>,
}

impl CustomerServiceImpl {
    pub fn new(customer_repo: Arc<CustomerRepository>, order_repo: Arc<OrderRepository>) -> Self {
        Self {
            customer_repo,
            order_repo,
        }
    }

    fn get_context<T>(&self, request: &Request<T>) -> Result<Uuid, Status> {
        let claims = request
            .extensions()
            .get::<Claims>()
            .ok_or_else(|| Status::unauthenticated("Unauthorized"))?;

        Uuid::parse_str(&claims.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant id"))
    }
}

#[tonic::async_trait]
impl CustomerService for CustomerServiceImpl {
    async fn register_customer(
        &self,
        request: Request<RegisterCustomerRequest>,
    ) -> Result<Response<CustomerResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();

        // Check if exists
        if let Ok(Some(_)) = self
            .customer_repo
            .find_by_phone(&tenant_id, &req.phone)
            .await
        {
            return Err(Status::already_exists(
                "Customer with this phone already exists",
            ));
        }

        let customer = DomainCustomer {
            id: Uuid::new_v4(),
            tenant_id,
            phone: req.phone,
            name: req.name,
            points: 0,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let created = self
            .customer_repo
            .create(&customer)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(CustomerResponse {
            customer: Some(map_domain_to_proto(created)),
        }))
    }

    async fn get_customer(
        &self,
        request: Request<GetCustomerRequest>,
    ) -> Result<Response<CustomerResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let id = Uuid::parse_str(&request.into_inner().id)
            .map_err(|_| Status::invalid_argument("Invalid id"))?;

        let customer = self
            .customer_repo
            .find_by_id(&tenant_id, &id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::not_found("Customer not found"))?;

        Ok(Response::new(CustomerResponse {
            customer: Some(map_domain_to_proto(customer)),
        }))
    }

    async fn find_customer_by_phone(
        &self,
        request: Request<FindCustomerByPhoneRequest>,
    ) -> Result<Response<CustomerResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let phone = request.into_inner().phone;

        let customer = self
            .customer_repo
            .find_by_phone(&tenant_id, &phone)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::not_found("Customer not found"))?;

        Ok(Response::new(CustomerResponse {
            customer: Some(map_domain_to_proto(customer)),
        }))
    }

    async fn list_customers(
        &self,
        request: Request<ListCustomersRequest>,
    ) -> Result<Response<ListCustomersResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();

        let search = if req.search_query.trim().is_empty() {
            None
        } else {
            Some(req.search_query)
        };
        let customers = self
            .customer_repo
            .list(&tenant_id, search)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(ListCustomersResponse {
            customers: customers.into_iter().map(map_domain_to_proto).collect(),
            pagination: Some(PaginationResponse {
                total_count: 0, // Simplified
                total_pages: 0,
                has_next: false,
            }),
        }))
    }

    async fn update_customer(
        &self,
        request: Request<UpdateCustomerRequest>,
    ) -> Result<Response<CustomerResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();
        let id = Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid id"))?;

        let updated = self
            .customer_repo
            .update(&tenant_id, &id, req.name, req.phone)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(CustomerResponse {
            customer: Some(map_domain_to_proto(updated)),
        }))
    }

    async fn delete_customer(
        &self,
        request: Request<DeleteCustomerRequest>,
    ) -> Result<Response<DeleteCustomerResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();
        let id = Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid id"))?;

        self.customer_repo
            .delete(&tenant_id, &id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(DeleteCustomerResponse { success: true }))
    }

    async fn get_transaction_history(
        &self,
        request: Request<GetTransactionHistoryRequest>,
    ) -> Result<Response<TransactionHistoryResponse>, Status> {
        let tenant_id = self.get_context(&request)?;
        let req = request.into_inner();
        let customer_id = Uuid::parse_str(&req.customer_id)
            .map_err(|_| Status::invalid_argument("Invalid id"))?;

        let start_date = if let Some(ts) = req.start_date {
            chrono::DateTime::from_timestamp(ts.seconds, ts.nanos as u32)
                .unwrap_or(Utc::now() - Duration::days(180))
        } else {
            Utc::now() - Duration::days(180) // 6 months default
        };

        let orders = self
            .order_repo
            .list_by_customer(&tenant_id, &customer_id, start_date)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(TransactionHistoryResponse {
            transactions: orders
                .into_iter()
                .map(|o| ProtoTransaction {
                    id: o.id.to_string(),
                    order_number: o.order_number,
                    total: map_money_to_proto(o.total),
                    created_at: Some(prost_types::Timestamp {
                        seconds: o.created_at.timestamp(),
                        nanos: o.created_at.timestamp_subsec_nanos() as i32,
                    }),
                    cashier_name: o.cashier_name.unwrap_or_default(),
                })
                .collect(),
        }))
    }
}

fn map_money_to_proto(val: bigdecimal::BigDecimal) -> Option<Money> {
    let units = val.to_i64()?;
    Some(Money {
        currency_code: "VND".to_string(),
        units,
        nanos: 0,
    })
}

fn map_domain_to_proto(c: DomainCustomer) -> ProtoCustomer {
    ProtoCustomer {
        id: c.id.to_string(),
        phone: c.phone,
        name: c.name,
        points: c.points,
        created_at: Some(prost_types::Timestamp {
            seconds: c.created_at.timestamp(),
            nanos: c.created_at.timestamp_subsec_nanos() as i32,
        }),
        updated_at: Some(prost_types::Timestamp {
            seconds: c.updated_at.timestamp(),
            nanos: c.updated_at.timestamp_subsec_nanos() as i32,
        }),
    }
}
