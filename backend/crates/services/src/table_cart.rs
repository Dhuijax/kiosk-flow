use bigdecimal::{BigDecimal, ToPrimitive, Zero};
use chrono::Utc;
use futures_util::StreamExt;
use infra::repository::{OrderRepository, ProductRepository, TableRepository, ToppingRepository};
use proto_gen::common::Money;
use proto_gen::table_cart::{
    table_cart_service_server::TableCartService, CartItem as ProtoCartItem, CartUpdateResponse,
    Guest as ProtoGuest, JoinRequest, JoinResponse, StreamRequest, SubmitOrderRequest,
    SubmitOrderResponse, UpdateCartRequest, UpdateCartResponse,
};
use redis::aio::ConnectionManager;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use std::pin::Pin;
use std::sync::Arc;
use tokio_stream::Stream;
use tonic::{Request, Response, Status};
use uuid::Uuid;

pub struct TableCartServiceImpl {
    product_repo: Arc<ProductRepository>,
    topping_repo: Arc<ToppingRepository>,
    table_repo: Arc<TableRepository>,
    order_repo: Arc<OrderRepository>,
    redis: ConnectionManager,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct RedisCartState {
    session_id: String,
    guests: Vec<RedisGuest>,
    items: Vec<RedisCartItem>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct RedisGuest {
    guest_id: String,
    guest_name: String,
    joined_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct RedisCartItem {
    product_id: String,
    product_name: String,
    quantity: i32,
    price_units: i64,
    price_nanos: i32,
    note: String,
    topping_ids: Vec<String>,
    added_by_guest_name: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct RedisPubSubEvent {
    event_type: i32,
    active_guests: Vec<RedisGuest>,
    items: Vec<RedisCartItem>,
    trigger_by_guest_name: String,
}

impl TableCartServiceImpl {
    pub fn new(
        product_repo: Arc<ProductRepository>,
        topping_repo: Arc<ToppingRepository>,
        table_repo: Arc<TableRepository>,
        order_repo: Arc<OrderRepository>,
        redis: ConnectionManager,
    ) -> Self {
        Self {
            product_repo,
            topping_repo,
            table_repo,
            order_repo,
            redis,
        }
    }

    fn redis_key(tenant_id: &str, branch_id: &str, table_id: &str) -> String {
        format!(
            "kioskflow:table_cart:state:{}:{}:{}",
            tenant_id, branch_id, table_id
        )
    }

    fn pubsub_channel(tenant_id: &str, branch_id: &str, table_id: &str) -> String {
        format!(
            "kioskflow:table_cart:pubsub:{}:{}:{}",
            tenant_id, branch_id, table_id
        )
    }

    async fn get_cart_state(&self, key: &str) -> Option<RedisCartState> {
        let mut conn = self.redis.clone();
        let val: Option<String> = conn.get(key).await.ok().flatten();
        val.and_then(|s| serde_json::from_str(&s).ok())
    }

    async fn save_cart_state(&self, key: &str, state: &RedisCartState) -> Result<(), Status> {
        let mut conn = self.redis.clone();
        let json_str = serde_json::to_string(state)
            .map_err(|e| Status::internal(format!("Serde error: {}", e)))?;

        // Save state with a 6-hour TTL
        let _: () = conn
            .set_ex(key, json_str, 21600)
            .await
            .map_err(|e| Status::internal(format!("Redis error: {}", e)))?;
        Ok(())
    }

    async fn publish_event(
        &self,
        channel: &str,
        event_type: i32,
        state: &RedisCartState,
        trigger_by_guest_name: &str,
    ) {
        let event = RedisPubSubEvent {
            event_type,
            active_guests: state.guests.clone(),
            items: state.items.clone(),
            trigger_by_guest_name: trigger_by_guest_name.to_string(),
        };

        if let Ok(payload) = serde_json::to_string(&event) {
            let mut conn = self.redis.clone();
            let _: Result<(), _> = conn.publish(channel, payload).await;
        }
    }
}

#[tonic::async_trait]
impl TableCartService for TableCartServiceImpl {
    async fn join_table_session(
        &self,
        request: Request<JoinRequest>,
    ) -> Result<Response<JoinResponse>, Status> {
        let req = request.into_inner();
        let r_key = Self::redis_key(&req.tenant_id, &req.branch_id, &req.table_id);
        let pubsub_chan = Self::pubsub_channel(&req.tenant_id, &req.branch_id, &req.table_id);

        let guest_id = Uuid::new_v4().to_string();
        let guest_name = if req.guest_name.trim().is_empty() {
            "Khách ẩn danh".to_string()
        } else {
            req.guest_name
        };

        let state = match self.get_cart_state(&r_key).await {
            Some(mut s) => {
                // Add guest to existing session
                s.guests.push(RedisGuest {
                    guest_id: guest_id.clone(),
                    guest_name: guest_name.clone(),
                    joined_at: Utc::now().to_rfc3339(),
                });
                s
            }
            None => {
                // Initialize brand new session
                RedisCartState {
                    session_id: Uuid::new_v4().to_string(),
                    guests: vec![RedisGuest {
                        guest_id: guest_id.clone(),
                        guest_name: guest_name.clone(),
                        joined_at: Utc::now().to_rfc3339(),
                    }],
                    items: Vec::new(),
                }
            }
        };

        self.save_cart_state(&r_key, &state).await?;

        // Broadcast GUEST_JOINED event
        self.publish_event(&pubsub_chan, 0, &state, &guest_name)
            .await;

        let proto_guests = state
            .guests
            .into_iter()
            .map(|g| ProtoGuest {
                guest_id: g.guest_id,
                guest_name: g.guest_name,
                joined_at: g.joined_at,
            })
            .collect();

        let proto_items = state
            .items
            .into_iter()
            .map(|i| ProtoCartItem {
                product_id: i.product_id,
                product_name: i.product_name,
                quantity: i.quantity,
                price: Some(Money {
                    currency_code: "VND".to_string(),
                    units: i.price_units,
                    nanos: i.price_nanos,
                }),
                note: i.note,
                topping_ids: i.topping_ids,
                added_by_guest_name: i.added_by_guest_name,
            })
            .collect();

        Ok(Response::new(JoinResponse {
            session_id: state.session_id,
            guest_id,
            active_guests: proto_guests,
            items: proto_items,
        }))
    }

    async fn update_cart_item(
        &self,
        request: Request<UpdateCartRequest>,
    ) -> Result<Response<UpdateCartResponse>, Status> {
        let req = request.into_inner();
        let r_key = Self::redis_key(&req.tenant_id, &req.branch_id, &req.table_id);
        let pubsub_chan = Self::pubsub_channel(&req.tenant_id, &req.branch_id, &req.table_id);

        let mut state = self
            .get_cart_state(&r_key)
            .await
            .ok_or_else(|| Status::not_found("Table cart session not active"))?;

        let trigger_guest = state
            .guests
            .iter()
            .find(|g| g.guest_id == req.guest_id)
            .map(|g| g.guest_name.clone())
            .unwrap_or_else(|| "Khách".to_string());

        let prod_uuid = Uuid::parse_str(&req.product_id)
            .map_err(|_| Status::invalid_argument("Invalid product_id"))?;
        let tenant_uuid = Uuid::parse_str(&req.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant_id"))?;

        // Locate existing matching item
        let existing_idx = state.items.iter().position(|i| {
            i.product_id == req.product_id && i.note == req.note && i.topping_ids == req.topping_ids
        });

        if let Some(idx) = existing_idx {
            state.items[idx].quantity += req.quantity_change;
            if state.items[idx].quantity <= 0 {
                state.items.remove(idx);
            }
        } else if req.quantity_change > 0 {
            // Fetch product detail to get name & price
            let product = self
                .product_repo
                .find_by_id(&tenant_uuid, &prod_uuid)
                .await
                .map_err(|e| Status::internal(e.to_string()))?
                .ok_or_else(|| Status::not_found("Product not found"))?;

            let price_units = product.price.to_i64().unwrap_or(0);

            // Fetch toppings if any to adjust base price
            let mut total_price_units = price_units;
            if !req.topping_ids.is_empty() {
                let topping_uuids: Vec<Uuid> = req
                    .topping_ids
                    .iter()
                    .map(|id| Uuid::parse_str(id).unwrap_or_default())
                    .collect();

                if let Ok(tops) = self
                    .topping_repo
                    .find_by_ids(&tenant_uuid, &topping_uuids)
                    .await
                {
                    for t in tops {
                        total_price_units += t.price.to_i64().unwrap_or(0);
                    }
                }
            }

            state.items.push(RedisCartItem {
                product_id: req.product_id,
                product_name: product.name,
                quantity: req.quantity_change,
                price_units: total_price_units,
                price_nanos: 0,
                note: req.note,
                topping_ids: req.topping_ids,
                added_by_guest_name: trigger_guest.clone(),
            });
        }

        self.save_cart_state(&r_key, &state).await?;

        // Broadcast CART_UPDATED event
        self.publish_event(&pubsub_chan, 2, &state, &trigger_guest)
            .await;

        Ok(Response::new(UpdateCartResponse { success: true }))
    }

    async fn submit_table_order(
        &self,
        request: Request<SubmitOrderRequest>,
    ) -> Result<Response<SubmitOrderResponse>, Status> {
        let req = request.into_inner();
        let r_key = Self::redis_key(&req.tenant_id, &req.branch_id, &req.table_id);
        let pubsub_chan = Self::pubsub_channel(&req.tenant_id, &req.branch_id, &req.table_id);

        let state = self
            .get_cart_state(&r_key)
            .await
            .ok_or_else(|| Status::not_found("Table cart session not active"))?;

        if state.items.is_empty() {
            return Err(Status::failed_precondition(
                "Giỏ hàng rỗng. Không thể đặt món.",
            ));
        }

        let trigger_guest = state
            .guests
            .iter()
            .find(|g| g.guest_id == req.guest_id)
            .map(|g| g.guest_name.clone())
            .unwrap_or_else(|| "Khách".to_string());

        let tenant_uuid = Uuid::parse_str(&req.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant_id"))?;
        let branch_uuid = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;
        let table_uuid = Uuid::parse_str(&req.table_id)
            .map_err(|_| Status::invalid_argument("Invalid table_id"))?;

        // 1. Create order in DB using repository
        let mut domain_items = Vec::new();
        let mut total_price = BigDecimal::zero();

        for item in &state.items {
            let prod_uuid = Uuid::parse_str(&item.product_id)
                .map_err(|_| Status::invalid_argument("Invalid product_id"))?;

            let item_subtotal =
                BigDecimal::from(item.price_units) * BigDecimal::from(item.quantity);

            let mut domain_toppings = Vec::new();
            if !item.topping_ids.is_empty() {
                let topping_uuids: Vec<Uuid> = item
                    .topping_ids
                    .iter()
                    .map(|id| Uuid::parse_str(id).unwrap_or_default())
                    .collect();

                if let Ok(tops) = self
                    .topping_repo
                    .find_by_ids(&tenant_uuid, &topping_uuids)
                    .await
                {
                    for t in tops {
                        domain_toppings.push(domain::models::order::OrderItemTopping {
                            id: Uuid::new_v4(),
                            order_item_id: Uuid::nil(),
                            tenant_id: tenant_uuid,
                            topping_id: t.id,
                            name: t.name,
                            price: t.price,
                        });
                    }
                }
            }

            domain_items.push((
                domain::models::order::OrderItem {
                    id: Uuid::new_v4(),
                    order_id: Uuid::nil(),
                    tenant_id: tenant_uuid,
                    product_id: prod_uuid,
                    product_name: item.product_name.clone(),
                    unit_price: BigDecimal::from(item.price_units),
                    quantity: item.quantity,
                    subtotal: item_subtotal.clone(),
                    note: Some(item.note.clone()),
                    status: domain::models::order::OrderItemStatus::Pending,
                    created_at: Utc::now(),
                },
                domain_toppings,
            ));

            total_price += item_subtotal;
        }

        let guest_id = Some(format!("QR_{}", state.session_id));
        let new_order = domain::models::order::Order {
            id: Uuid::new_v4(),
            tenant_id: tenant_uuid,
            branch_id: branch_uuid,
            table_id: Some(table_uuid),
            order_number: "".to_string(),
            status: domain::models::order::OrderStatus::Draft,
            customer_name: Some(trigger_guest.clone()),
            customer_id: None,
            cashier_name: None,
            guest_id,
            subtotal: total_price.clone(),
            tax_amount: BigDecimal::zero(),
            discount_amount: BigDecimal::zero(),
            total: total_price,
            note: Some(req.note),
            created_by: Uuid::nil(), // Guest created
            created_at: Utc::now(),
            updated_at: Utc::now(),
            completed_at: None,
        };

        let created_order = self
            .order_repo
            .create(&new_order, &domain_items)
            .await
            .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        // 2. Update Table status to Occupied
        let _ = self
            .table_repo
            .update_status(
                &tenant_uuid,
                &table_uuid,
                domain::models::table::TableStatus::Occupied,
            )
            .await;

        // 3. Clear Redis cart state
        let mut conn = self.redis.clone();
        let _: () = conn.del(&r_key).await.unwrap_or(());

        // 4. Broadcast ORDER_SUBMITTED event
        let empty_state = RedisCartState {
            session_id: state.session_id,
            guests: Vec::new(),
            items: Vec::new(),
        };
        self.publish_event(&pubsub_chan, 3, &empty_state, &trigger_guest)
            .await;

        // 5. Notify POS Cashier / Kitchen about the new Order
        let pos_event = serde_json::json!({
            "tenant_id": tenant_uuid,
            "branch_id": branch_uuid,
            "order_id": created_order.id,
            "status": "Draft"
        });
        if let Ok(payload) = serde_json::to_string(&pos_event) {
            let channel = format!("kioskflow:orders:{}", branch_uuid);
            let mut redis_pub = self.redis.clone();
            let _: Result<(), _> = redis_pub.publish(channel, payload).await;
        }

        Ok(Response::new(SubmitOrderResponse {
            order_id: created_order.id.to_string(),
            order_number: created_order.order_number,
            success: true,
        }))
    }

    type StreamCartUpdatesStream =
        Pin<Box<dyn Stream<Item = Result<CartUpdateResponse, Status>> + Send>>;

    async fn stream_cart_updates(
        &self,
        request: Request<StreamRequest>,
    ) -> Result<Response<Self::StreamCartUpdatesStream>, Status> {
        let req = request.into_inner();
        let pubsub_chan = Self::pubsub_channel(&req.tenant_id, &req.branch_id, &req.table_id);

        let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL must be set");
        let client = redis::Client::open(redis_url)
            .map_err(|e| Status::internal(format!("Redis connection error: {}", e)))?;

        let (tx, rx) = tokio::sync::mpsc::channel(16);

        tokio::spawn(async move {
            if let Ok(mut pubsub) = client.get_async_pubsub().await {
                if let Ok(_) = pubsub.subscribe(&pubsub_chan).await {
                    let mut pubsub_stream = pubsub.into_on_message();

                    while let Some(msg) = pubsub_stream.next().await {
                        let payload: String = msg.get_payload().unwrap_or_default();
                        if let Ok(event) = serde_json::from_str::<RedisPubSubEvent>(&payload) {
                            let proto_guests: Vec<ProtoGuest> = event
                                .active_guests
                                .into_iter()
                                .map(|g| ProtoGuest {
                                    guest_id: g.guest_id,
                                    guest_name: g.guest_name,
                                    joined_at: g.joined_at,
                                })
                                .collect();

                            let proto_items: Vec<ProtoCartItem> = event
                                .items
                                .into_iter()
                                .map(|i| ProtoCartItem {
                                    product_id: i.product_id,
                                    product_name: i.product_name,
                                    quantity: i.quantity,
                                    price: Some(Money {
                                        currency_code: "VND".to_string(),
                                        units: i.price_units,
                                        nanos: i.price_nanos,
                                    }),
                                    note: i.note,
                                    topping_ids: i.topping_ids,
                                    added_by_guest_name: i.added_by_guest_name,
                                })
                                .collect();

                            let response = CartUpdateResponse {
                                event_type: event.event_type,
                                active_guests: proto_guests,
                                items: proto_items,
                                trigger_by_guest_name: event.trigger_by_guest_name,
                            };

                            if tx.send(Ok(response)).await.is_err() {
                                break; // receiver closed
                            }
                        }
                    }
                }
            }
        });

        let output_stream = tokio_stream::wrappers::ReceiverStream::new(rx);
        Ok(Response::new(
            Box::pin(output_stream) as Self::StreamCartUpdatesStream
        ))
    }
}
