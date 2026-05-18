use crate::deduction::DeductionService;
use bigdecimal::{BigDecimal, ToPrimitive, Zero};
use chrono::Utc;
use domain::models::order::{
    Order as DomainOrder, OrderItem as DomainOrderItem, OrderItemStatus as DomainOrderItemStatus,
    OrderItemTopping as DomainOrderItemTopping, OrderStatus as DomainOrderStatus,
};
use futures_util::StreamExt;
use infra::repository::{OrderRepository, ProductRepository, TableRepository, ToppingRepository};
use infra::security::Claims;
use proto_gen::common::Money;
use proto_gen::order::{
    order_service_server::OrderService, CancelOrderRequest, CreateOrderRequest, GetOrderRequest,
    ListOrdersRequest, ListOrdersResponse, MergeOrdersRequest, Order as ProtoOrder,
    OrderItem as ProtoOrderItem, OrderItemStatus as ProtoOrderItemStatus,
    OrderItemTopping as ProtoOrderItemTopping, OrderResponse, OrderStatus as ProtoOrderStatus,
    SplitOrderItemsRequest, SplitOrderItemsResponse, StreamOrdersRequest, UpdateOrderStatusRequest,
};
use redis::aio::ConnectionManager;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use std::pin::Pin;
use std::sync::Arc;
use tokio_stream::Stream;
use tonic::{Request, Response, Status};
use uuid::Uuid;

pub struct OrderServiceImpl {
    order_repo: Arc<OrderRepository>,
    product_repo: Arc<ProductRepository>,
    topping_repo: Arc<ToppingRepository>,
    table_repo: Arc<TableRepository>,
    deduction_service: Arc<DeductionService>,
    redis: ConnectionManager,
}

#[derive(Serialize, Deserialize, Debug)]
struct OrderEvent {
    tenant_id: Uuid,
    branch_id: Uuid,
    order_id: Uuid,
    status: String,
}

impl OrderServiceImpl {
    pub fn new(
        order_repo: Arc<OrderRepository>,
        product_repo: Arc<ProductRepository>,
        topping_repo: Arc<ToppingRepository>,
        table_repo: Arc<TableRepository>,
        deduction_service: Arc<DeductionService>,
        redis: ConnectionManager,
    ) -> Self {
        Self {
            order_repo,
            product_repo,
            topping_repo,
            table_repo,
            deduction_service,
            redis,
        }
    }

    fn get_context<T>(&self, request: &Request<T>) -> Result<(Uuid, Uuid), Status> {
        if let Some(claims) = request.extensions().get::<Claims>() {
            let tenant_id = Uuid::parse_str(&claims.tenant_id)
                .map_err(|_| Status::invalid_argument("Invalid tenant id"))?;
            let user_id = Uuid::parse_str(&claims.sub)
                .map_err(|_| Status::invalid_argument("Invalid user id"))?;
            return Ok((tenant_id, user_id));
        }

        // Fallback for guest QR ordering (bypass auth)
        if let Some(tenant_str) = request.extensions().get::<String>() {
            let tenant_id = Uuid::parse_str(tenant_str)
                .map_err(|_| Status::invalid_argument("Invalid tenant id in subdomain"))?;
            let user_id = Uuid::nil(); // Nil UUID indicates guest order
            return Ok((tenant_id, user_id));
        }

        Err(Status::unauthenticated(
            "Unauthorized: Missing or invalid token",
        ))
    }

    async fn notify_order_update(
        &self,
        tenant_id: Uuid,
        branch_id: Uuid,
        order_id: Uuid,
        status: DomainOrderStatus,
    ) {
        let event = OrderEvent {
            tenant_id,
            branch_id,
            order_id,
            status: format!("{:?}", status),
        };

        if let Ok(payload) = serde_json::to_string(&event) {
            let channel = format!("kioskflow:orders:{}", branch_id);
            let mut conn = self.redis.clone();
            let _: Result<(), _> = conn.publish(channel, payload).await;
        }
    }
}

#[tonic::async_trait]
impl OrderService for OrderServiceImpl {
    async fn create_order(
        &self,
        request: Request<CreateOrderRequest>,
    ) -> Result<Response<OrderResponse>, Status> {
        let (tenant_id, created_by) = self.get_context(&request)?;
        let req = request.into_inner();

        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;
        let table_id = if !req.table_id.is_empty() {
            Some(
                Uuid::parse_str(&req.table_id)
                    .map_err(|_| Status::invalid_argument("Invalid table_id"))?,
            )
        } else {
            None
        };

        let mut domain_items = Vec::new();
        let mut total_price = BigDecimal::zero();

        for item_req in req.items {
            let product_id = Uuid::parse_str(&item_req.product_id)
                .map_err(|_| Status::invalid_argument("Invalid product_id"))?;
            let product = self
                .product_repo
                .find_by_id(&tenant_id, &product_id)
                .await
                .map_err(|e| Status::internal(e.to_string()))?
                .ok_or_else(|| Status::not_found("Product not found"))?;

            let item_subtotal = &product.price * BigDecimal::from(item_req.quantity);

            // Handle Toppings
            let mut domain_toppings = Vec::new();
            if !item_req.topping_ids.is_empty() {
                let topping_uuids: Vec<Uuid> = item_req
                    .topping_ids
                    .iter()
                    .map(|id| Uuid::parse_str(id).unwrap_or_default())
                    .collect();

                if let Ok(tops) = self
                    .topping_repo
                    .find_by_ids(&tenant_id, &topping_uuids)
                    .await
                {
                    for t in tops {
                        domain_toppings.push(DomainOrderItemTopping {
                            id: Uuid::new_v4(),
                            order_item_id: Uuid::nil(), // set by repo
                            tenant_id,
                            topping_id: t.id,
                            name: t.name,
                            price: t.price,
                        });
                    }
                }
            }

            let domain_item = DomainOrderItem {
                id: Uuid::new_v4(),
                order_id: Uuid::nil(), // set by repo
                tenant_id,
                product_id,
                product_name: product.name,
                unit_price: product.price,
                quantity: item_req.quantity,
                subtotal: item_subtotal.clone(),
                note: Some(item_req.note),
                status: DomainOrderItemStatus::Pending,
                created_at: Utc::now(),
            };

            total_price += item_subtotal;
            domain_items.push((domain_item, domain_toppings));
        }

        let customer_id = if !req.customer_id.is_empty() {
            Some(
                Uuid::parse_str(&req.customer_id)
                    .map_err(|_| Status::invalid_argument("Invalid customer_id"))?,
            )
        } else {
            None
        };

        let guest_id = if customer_id.is_none() {
            let table_name = if let Some(tid) = table_id {
                self.table_repo
                    .find_by_id(&tenant_id, &tid)
                    .await
                    .ok()
                    .flatten()
                    .map(|t| t.name)
                    .unwrap_or_else(|| "TA".to_string())
            } else {
                "TA".to_string()
            };
            Some(format!(
                "{}_{}",
                table_name,
                Utc::now().format("%Y%m%d%H%M%S")
            ))
        } else {
            None
        };

        let order = DomainOrder {
            id: Uuid::new_v4(),
            tenant_id,
            branch_id,
            table_id,
            order_number: "".to_string(), // set by repo
            status: DomainOrderStatus::Draft,
            customer_name: Some(req.customer_name),
            customer_id,
            cashier_name: None, // Set at payment
            guest_id,
            subtotal: total_price.clone(),
            tax_amount: BigDecimal::zero(),
            discount_amount: BigDecimal::zero(),
            total: total_price,
            note: Some(req.note),
            created_by,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            completed_at: None,
        };

        let created = self
            .order_repo
            .create(&order, &domain_items)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let full_order = self
            .order_repo
            .find_by_id(&tenant_id, &created.id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::internal("Order created but not found"))?;

        // Notify kitchen/clients
        self.notify_order_update(tenant_id, branch_id, created.id, DomainOrderStatus::Draft)
            .await;

        Ok(Response::new(OrderResponse {
            order: Some(map_domain_to_proto(full_order.0, full_order.1)),
        }))
    }

    async fn get_order(
        &self,
        request: Request<GetOrderRequest>,
    ) -> Result<Response<OrderResponse>, Status> {
        let (tenant_id, _) = self.get_context(&request)?;
        let id = Uuid::parse_str(&request.into_inner().id)
            .map_err(|_| Status::invalid_argument("Invalid id"))?;

        let full_order = self
            .order_repo
            .find_by_id(&tenant_id, &id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::not_found("Order not found"))?;

        Ok(Response::new(OrderResponse {
            order: Some(map_domain_to_proto(full_order.0, full_order.1)),
        }))
    }

    async fn list_orders(
        &self,
        request: Request<ListOrdersRequest>,
    ) -> Result<Response<ListOrdersResponse>, Status> {
        let (tenant_id, _) = self.get_context(&request)?;
        let req = request.into_inner();
        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;

        let status = if req.status != 0 {
            Some(map_proto_status_to_domain(req.status()))
        } else {
            None
        };

        let pagination = req.pagination.unwrap_or_default();
        let limit = if pagination.page_size > 0 {
            pagination.page_size
        } else {
            10
        };
        let offset = (if pagination.page > 0 {
            pagination.page - 1
        } else {
            0
        }) * limit;

        let orders = self
            .order_repo
            .list_by_branch(&tenant_id, &branch_id, status, limit as i64, offset as i64)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(ListOrdersResponse {
            orders: orders
                .into_iter()
                .map(|o| map_domain_to_proto(o, vec![]))
                .collect(),
            pagination: None, // Simplified
        }))
    }

    async fn update_order_status(
        &self,
        request: Request<UpdateOrderStatusRequest>,
    ) -> Result<Response<OrderResponse>, Status> {
        let _claims = request.extensions().get::<Claims>().ok_or_else(|| {
            Status::unauthenticated("Unauthorized: Staff/Admin permissions required")
        })?;
        let (tenant_id, _) = self.get_context(&request)?;
        let req = request.into_inner();
        let id = Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid id"))?;
        let next_status = map_proto_status_to_domain(req.status());

        let (current_order, items) = self
            .order_repo
            .find_by_id(&tenant_id, &id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::not_found("Order not found"))?;

        validate_transition(&current_order.status, &next_status)?;

        let updated = self
            .order_repo
            .update_status(&tenant_id, &id, next_status.clone())
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        // 2. Perform Ingredient Deduction if moving to Served, Paid, or Completed
        if next_status == DomainOrderStatus::Served
            || next_status == DomainOrderStatus::Paid
            || next_status == DomainOrderStatus::Completed
        {
            if let Err(e) = self
                .deduction_service
                .deduct_stock_for_order(&tenant_id, &current_order.branch_id, &current_order.id)
                .await
            {
                eprintln!(
                    "Failed to deduct stock for order {}: {}",
                    current_order.id, e
                );
            }
        }

        // 3. Perform Rollback if moving to Cancelled
        if next_status == DomainOrderStatus::Cancelled {
            if let Err(e) = self
                .deduction_service
                .rollback_stock_for_order(&tenant_id, &current_order.branch_id, &current_order.id)
                .await
            {
                eprintln!(
                    "Failed to rollback stock for order {}: {}",
                    current_order.id, e
                );
            }
        }

        // Notify kitchen/clients
        let branch_id = updated.branch_id;
        self.notify_order_update(tenant_id, branch_id, id, next_status)
            .await;

        Ok(Response::new(OrderResponse {
            order: Some(map_domain_to_proto(updated, items)),
        }))
    }

    async fn cancel_order(
        &self,
        request: Request<CancelOrderRequest>,
    ) -> Result<Response<OrderResponse>, Status> {
        let _claims = request.extensions().get::<Claims>().ok_or_else(|| {
            Status::unauthenticated("Unauthorized: Staff/Admin permissions required")
        })?;
        let (tenant_id, _) = self.get_context(&request)?;
        let req = request.into_inner();
        let id = Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid id"))?;

        let (current_order, items) = self
            .order_repo
            .find_by_id(&tenant_id, &id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::not_found("Order not found"))?;

        match current_order.status {
            DomainOrderStatus::Paid
            | DomainOrderStatus::Completed
            | DomainOrderStatus::Cancelled => {
                return Err(Status::failed_precondition(
                    "Cannot cancel order in current status",
                ));
            }
            _ => {}
        }

        let updated = self
            .order_repo
            .update_status(&tenant_id, &id, DomainOrderStatus::Cancelled)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        // Perform Rollback if moving to Cancelled
        if let Err(e) = self
            .deduction_service
            .rollback_stock_for_order(&tenant_id, &current_order.branch_id, &current_order.id)
            .await
        {
            eprintln!(
                "Failed to rollback stock for order {}: {}",
                current_order.id, e
            );
        }

        Ok(Response::new(OrderResponse {
            order: Some(map_domain_to_proto(updated, items)),
        }))
    }

    type StreamOrdersStream = Pin<Box<dyn Stream<Item = Result<OrderResponse, Status>> + Send>>;

    async fn stream_orders(
        &self,
        request: Request<StreamOrdersRequest>,
    ) -> Result<Response<Self::StreamOrdersStream>, Status> {
        let _claims = request.extensions().get::<Claims>().ok_or_else(|| {
            Status::unauthenticated("Unauthorized: Staff/Admin permissions required")
        })?;
        let (tenant_id, _) = self.get_context(&request)?;
        let branch_id_str = request.into_inner().branch_id;
        let branch_id = Uuid::parse_str(&branch_id_str)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;

        let order_repo = self.order_repo.clone();
        let channel_name = format!("kioskflow:orders:{}", branch_id);

        // We need a separate connection for PubSub since it blocks
        let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL must be set");
        let client = redis::Client::open(redis_url).map_err(|e| Status::internal(e.to_string()))?;

        let (tx, rx) = tokio::sync::mpsc::channel(10);

        tokio::spawn(async move {
            if let Ok(mut pubsub) = client.get_async_pubsub().await {
                if let Ok(_) = pubsub.subscribe(&channel_name).await {
                    let mut pubsub_stream = pubsub.into_on_message();

                    while let Some(msg) = pubsub_stream.next().await {
                        let payload: String = msg.get_payload().unwrap_or_default();
                        if let Ok(event) = serde_json::from_str::<OrderEvent>(&payload) {
                            if event.tenant_id == tenant_id {
                                // Fetch latest order state
                                if let Ok(Some(full_order)) =
                                    order_repo.find_by_id(&tenant_id, &event.order_id).await
                                {
                                    let response = OrderResponse {
                                        order: Some(map_domain_to_proto(
                                            full_order.0,
                                            full_order.1,
                                        )),
                                    };
                                    if tx.send(Ok(response)).await.is_err() {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        let output_stream = tokio_stream::wrappers::ReceiverStream::new(rx);
        Ok(Response::new(
            Box::pin(output_stream) as Self::StreamOrdersStream
        ))
    }

    async fn merge_orders(
        &self,
        request: Request<MergeOrdersRequest>,
    ) -> Result<Response<OrderResponse>, Status> {
        let _claims = request.extensions().get::<Claims>().ok_or_else(|| {
            Status::unauthenticated("Unauthorized: Staff/Admin permissions required")
        })?;
        let (tenant_id, _) = self.get_context(&request)?;
        let req = request.into_inner();

        let source_uuid = Uuid::parse_str(&req.source_order_id)
            .map_err(|_| Status::invalid_argument("Invalid source_order_id"))?;
        let target_uuid = Uuid::parse_str(&req.target_order_id)
            .map_err(|_| Status::invalid_argument("Invalid target_order_id"))?;

        let merged = self
            .order_repo
            .merge_orders(&tenant_id, &source_uuid, &target_uuid)
            .await
            .map_err(|e| Status::internal(format!("Merge failed: {}", e)))?;

        // Re-fetch the full order to get all items and toppings
        let full_order = self
            .order_repo
            .find_by_id(&tenant_id, &merged.id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::internal("Merged order not found after merge"))?;

        // Notify client updates
        let branch_id = merged.branch_id;
        self.notify_order_update(tenant_id, branch_id, merged.id, DomainOrderStatus::Draft)
            .await;
        self.notify_order_update(
            tenant_id,
            branch_id,
            source_uuid,
            DomainOrderStatus::Cancelled,
        )
        .await;

        Ok(Response::new(OrderResponse {
            order: Some(map_domain_to_proto(full_order.0, full_order.1)),
        }))
    }

    async fn split_order_items(
        &self,
        request: Request<SplitOrderItemsRequest>,
    ) -> Result<Response<SplitOrderItemsResponse>, Status> {
        let _claims = request.extensions().get::<Claims>().ok_or_else(|| {
            Status::unauthenticated("Unauthorized: Staff/Admin permissions required")
        })?;
        let (tenant_id, _) = self.get_context(&request)?;
        let req = request.into_inner();

        let source_uuid = Uuid::parse_str(&req.source_order_id)
            .map_err(|_| Status::invalid_argument("Invalid source_order_id"))?;

        let target_table_uuid = if !req.target_table_id.is_empty() {
            Some(
                Uuid::parse_str(&req.target_table_id)
                    .map_err(|_| Status::invalid_argument("Invalid target_table_id"))?,
            )
        } else {
            None
        };

        let mut items_to_split = Vec::new();
        for item_info in req.items {
            let item_uuid = Uuid::parse_str(&item_info.order_item_id)
                .map_err(|_| Status::invalid_argument("Invalid order_item_id"))?;
            items_to_split.push((item_uuid, item_info.quantity));
        }

        let (src, tgt) = self
            .order_repo
            .split_order_items(&tenant_id, &source_uuid, target_table_uuid, &items_to_split)
            .await
            .map_err(|e| Status::internal(format!("Split failed: {}", e)))?;

        // Re-fetch full source and target orders
        let full_src = self
            .order_repo
            .find_by_id(&tenant_id, &src.id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::internal("Source order not found after split"))?;

        let full_tgt = self
            .order_repo
            .find_by_id(&tenant_id, &tgt.id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::internal("Target order not found after split"))?;

        // Notify client updates
        let branch_id = src.branch_id;
        self.notify_order_update(tenant_id, branch_id, src.id, DomainOrderStatus::Draft)
            .await;
        self.notify_order_update(tenant_id, branch_id, tgt.id, DomainOrderStatus::Draft)
            .await;

        Ok(Response::new(SplitOrderItemsResponse {
            source_order: Some(map_domain_to_proto(full_src.0, full_src.1)),
            target_order: Some(map_domain_to_proto(full_tgt.0, full_tgt.1)),
        }))
    }
}

fn validate_transition(
    current: &DomainOrderStatus,
    next: &DomainOrderStatus,
) -> Result<(), Status> {
    use DomainOrderStatus::*;

    let valid = match (current, next) {
        (Draft, Confirmed) => true,
        (Confirmed, Preparing) => true,
        (Preparing, Served) => true,
        (Draft | Confirmed | Preparing | Served, Paid) => true,
        (Paid, Completed) => true,
        (_, Cancelled) => true,
        _ => false,
    };

    if !valid {
        return Err(Status::failed_precondition(format!(
            "Invalid state transition from {:?} to {:?}",
            current, next
        )));
    }
    Ok(())
}

fn map_money_to_proto(val: BigDecimal) -> Option<Money> {
    let units = val.to_i64()?;
    Some(Money {
        currency_code: "VND".to_string(),
        units,
        nanos: 0,
    })
}

fn map_domain_to_proto(
    order: DomainOrder,
    items: Vec<(DomainOrderItem, Vec<DomainOrderItemTopping>)>,
) -> ProtoOrder {
    ProtoOrder {
        id: order.id.to_string(),
        branch_id: order.branch_id.to_string(),
        table_id: order.table_id.map(|t| t.to_string()).unwrap_or_default(),
        table_name: "".to_string(),
        order_number: order.order_number,
        status: map_domain_status_to_proto(order.status) as i32,
        customer_name: order.customer_name.unwrap_or_default(),
        customer_id: order
            .customer_id
            .map(|id| id.to_string())
            .unwrap_or_default(),
        cashier_name: order.cashier_name.unwrap_or_default(),
        guest_id: order.guest_id.unwrap_or_default(),
        subtotal: map_money_to_proto(order.subtotal),
        tax_amount: map_money_to_proto(order.tax_amount),
        discount_amount: map_money_to_proto(order.discount_amount),
        total: map_money_to_proto(order.total),
        note: order.note.unwrap_or_default(),
        items: items
            .into_iter()
            .map(|(i, t)| ProtoOrderItem {
                id: i.id.to_string(),
                product_id: i.product_id.to_string(),
                product_name: i.product_name,
                unit_price: map_money_to_proto(i.unit_price),
                quantity: i.quantity,
                subtotal: map_money_to_proto(i.subtotal),
                note: i.note.unwrap_or_default(),
                status: map_domain_item_status_to_proto(i.status) as i32,
                toppings: t
                    .into_iter()
                    .map(|top| ProtoOrderItemTopping {
                        id: top.id.to_string(),
                        topping_id: top.topping_id.to_string(),
                        name: top.name,
                        price: map_money_to_proto(top.price),
                    })
                    .collect(),
            })
            .collect(),
        created_at: Some(prost_types::Timestamp {
            seconds: order.created_at.timestamp(),
            nanos: order.created_at.timestamp_subsec_nanos() as i32,
        }),
        updated_at: Some(prost_types::Timestamp {
            seconds: order.updated_at.timestamp(),
            nanos: order.updated_at.timestamp_subsec_nanos() as i32,
        }),
    }
}

fn map_proto_status_to_domain(s: ProtoOrderStatus) -> DomainOrderStatus {
    match s {
        ProtoOrderStatus::Draft => DomainOrderStatus::Draft,
        ProtoOrderStatus::Confirmed => DomainOrderStatus::Confirmed,
        ProtoOrderStatus::Preparing => DomainOrderStatus::Preparing,
        ProtoOrderStatus::Served => DomainOrderStatus::Served,
        ProtoOrderStatus::Paid => DomainOrderStatus::Paid,
        ProtoOrderStatus::Completed => DomainOrderStatus::Completed,
        ProtoOrderStatus::Cancelled => DomainOrderStatus::Cancelled,
    }
}

fn map_domain_status_to_proto(s: DomainOrderStatus) -> ProtoOrderStatus {
    match s {
        DomainOrderStatus::Draft => ProtoOrderStatus::Draft,
        DomainOrderStatus::Confirmed => ProtoOrderStatus::Confirmed,
        DomainOrderStatus::Preparing => ProtoOrderStatus::Preparing,
        DomainOrderStatus::Served => ProtoOrderStatus::Served,
        DomainOrderStatus::Paid => ProtoOrderStatus::Paid,
        DomainOrderStatus::Completed => ProtoOrderStatus::Completed,
        DomainOrderStatus::Cancelled => ProtoOrderStatus::Cancelled,
    }
}

fn map_domain_item_status_to_proto(s: DomainOrderItemStatus) -> ProtoOrderItemStatus {
    match s {
        DomainOrderItemStatus::Pending => ProtoOrderItemStatus::Pending,
        DomainOrderItemStatus::Preparing => ProtoOrderItemStatus::Preparing,
        DomainOrderItemStatus::Ready => ProtoOrderItemStatus::Ready,
        DomainOrderItemStatus::Served => ProtoOrderItemStatus::Served,
        DomainOrderItemStatus::Cancelled => ProtoOrderItemStatus::Cancelled,
    }
}
