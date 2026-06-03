use anyhow::Result;
use chrono::{DateTime, TimeZone, Utc};
use domain::models::storefront::{
    ChatMessage as DomainChatMessage, Reservation as DomainReservation,
};
use futures_util::StreamExt;
use infra::storefront_repository::StorefrontRepository;
use proto_gen::storefront::{
    storefront_service_server::StorefrontService, Announcement, ChatHistoryResponse, ChatMessage,
    CreateReservationRequest, GetChatHistoryRequest, GetStorefrontCmsRequest,
    ListReservationsRequest, ListReservationsResponse, News, Partner, Promotion, Reservation,
    ReservationResponse, StorefrontCmsResponse, UpdateReservationStatusRequest,
};
use redis::aio::ConnectionManager;
use redis::AsyncCommands;
use std::pin::Pin;
use std::sync::Arc;
use tokio_stream::Stream;
use tonic::{Request, Response, Status};
use uuid::Uuid;

pub struct StorefrontServiceImpl {
    storefront_repo: Arc<StorefrontRepository>,
    redis: ConnectionManager,
}

impl StorefrontServiceImpl {
    pub fn new(storefront_repo: Arc<StorefrontRepository>, redis: ConnectionManager) -> Self {
        Self {
            storefront_repo,
            redis,
        }
    }

    fn to_proto_timestamp(dt: DateTime<Utc>) -> prost_types::Timestamp {
        prost_types::Timestamp {
            seconds: dt.timestamp(),
            nanos: dt.timestamp_subsec_nanos() as i32,
        }
    }

    fn to_chrono_datetime(ts: prost_types::Timestamp) -> DateTime<Utc> {
        Utc.timestamp_opt(ts.seconds, ts.nanos as u32)
            .single()
            .unwrap_or_else(|| Utc::now())
    }

    fn get_tenant_id<T>(&self, request: &Request<T>) -> Result<Uuid, Status> {
        let ctx = infra::middleware::CURRENT_CONTEXT
            .try_with(|c| c.tenant_id)
            .ok();
        if let Some(tenant_id) = ctx {
            return Ok(tenant_id);
        }

        // Fallback to headers
        if let Some(tenant_str) = request.extensions().get::<String>() {
            Uuid::parse_str(tenant_str).map_err(|_| Status::invalid_argument("Invalid tenant id"))
        } else {
            // Check x-tenant-id in request metadata
            if let Some(tenant_id_meta) = request.metadata().get("x-tenant-id") {
                if let Ok(tid) = tenant_id_meta.to_str() {
                    if let Ok(tuuid) = Uuid::parse_str(tid) {
                        return Ok(tuuid);
                    }
                }
            }
            Err(Status::unauthenticated("Missing tenant context"))
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct RedisChatMessage {
    pub id: String,
    pub tenant_id: String,
    pub conversation_id: String,
    pub sender_type: String,
    pub content: String,
    pub created_at_seconds: i64,
    pub created_at_nanos: i32,
}

#[tonic::async_trait]
impl StorefrontService for StorefrontServiceImpl {
    async fn get_storefront_cms(
        &self,
        request: Request<GetStorefrontCmsRequest>,
    ) -> Result<Response<StorefrontCmsResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;

        let promos = self
            .storefront_repo
            .get_active_promotions(&tenant_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let news = self
            .storefront_repo
            .get_latest_news(&tenant_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let partners = self
            .storefront_repo
            .get_partners(&tenant_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let announcements = self
            .storefront_repo
            .get_active_announcements(&tenant_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(StorefrontCmsResponse {
            promotions: promos
                .into_iter()
                .map(|p| Promotion {
                    id: p.id.to_string(),
                    title: p.title,
                    description: p.description.unwrap_or_default(),
                    code: p.code,
                    discount_percent: p.discount_percent.unwrap_or_default(),
                    discount_amount: p.discount_amount.unwrap_or_default(),
                    start_date: Some(Self::to_proto_timestamp(p.start_date)),
                    end_date: Some(Self::to_proto_timestamp(p.end_date)),
                    is_active: p.is_active,
                })
                .collect(),
            news: news
                .into_iter()
                .map(|n| News {
                    id: n.id.to_string(),
                    title: n.title,
                    summary: n.summary.unwrap_or_default(),
                    content: n.content,
                    author: n.author.unwrap_or_default(),
                    image_url: n.image_url.unwrap_or_default(),
                    created_at: Some(Self::to_proto_timestamp(n.created_at)),
                })
                .collect(),
            partners: partners
                .into_iter()
                .map(|p| Partner {
                    id: p.id.to_string(),
                    name: p.name,
                    logo_url: p.logo_url.unwrap_or_default(),
                    website_url: p.website_url.unwrap_or_default(),
                })
                .collect(),
            announcements: announcements
                .into_iter()
                .map(|a| Announcement {
                    id: a.id.to_string(),
                    title: a.title,
                    content: a.content,
                    level: a.level,
                    start_date: Some(Self::to_proto_timestamp(a.start_date)),
                    end_date: Some(Self::to_proto_timestamp(a.end_date)),
                })
                .collect(),
        }))
    }

    async fn create_reservation(
        &self,
        request: Request<CreateReservationRequest>,
    ) -> Result<Response<ReservationResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();

        let branch_uuid = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;

        let res_time = match req.reservation_time {
            Some(t) => Self::to_chrono_datetime(t),
            None => return Err(Status::invalid_argument("Missing reservation time")),
        };

        let domain_res = DomainReservation {
            id: Uuid::new_v4(),
            tenant_id,
            branch_id: branch_uuid,
            table_id: None,
            customer_name: req.customer_name,
            customer_phone: req.customer_phone,
            guest_count: req.guest_count,
            reservation_time: res_time,
            note: Some(req.note),
            status: "PENDING".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let created = self
            .storefront_repo
            .create_reservation(&domain_res)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        // Trigger real-time notifications about the reservation
        let notify_event = serde_json::json!({
            "tenant_id": created.tenant_id,
            "branch_id": created.branch_id,
            "reservation_id": created.id,
            "customer_name": created.customer_name,
            "reservation_time": created.reservation_time,
            "status": "PENDING"
        });
        if let Ok(payload) = serde_json::to_string(&notify_event) {
            let channel = format!("kioskflow:reservations:{}", created.branch_id);
            let mut redis_pub = self.redis.clone();
            let _: Result<(), _> = redis_pub.publish(channel, payload).await;
        }

        Ok(Response::new(ReservationResponse {
            reservation: Some(Reservation {
                id: created.id.to_string(),
                tenant_id: created.tenant_id.to_string(),
                branch_id: created.branch_id.to_string(),
                table_id: created.table_id.map(|id| id.to_string()),
                customer_name: created.customer_name,
                customer_phone: created.customer_phone,
                guest_count: created.guest_count,
                reservation_time: Some(Self::to_proto_timestamp(created.reservation_time)),
                note: created.note.unwrap_or_default(),
                status: created.status,
                created_at: Some(Self::to_proto_timestamp(created.created_at)),
                updated_at: Some(Self::to_proto_timestamp(created.updated_at)),
            }),
        }))
    }

    async fn list_reservations(
        &self,
        request: Request<ListReservationsRequest>,
    ) -> Result<Response<ListReservationsResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();

        let branch_uuid = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;

        let limit = req.pagination.as_ref().map(|p| p.page_size).unwrap_or(20) as i64;
        let page = req.pagination.as_ref().map(|p| p.page).unwrap_or(1) as i64;
        let offset = (page - 1) * limit;

        let status_filter = req.status.filter(|s| !s.trim().is_empty());

        let reservations = self
            .storefront_repo
            .list_reservations(
                &tenant_id,
                &branch_uuid,
                status_filter.as_deref(),
                limit,
                offset,
            )
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let total_count = self
            .storefront_repo
            .count_reservations(&tenant_id, &branch_uuid, status_filter.as_deref())
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(ListReservationsResponse {
            reservations: reservations
                .into_iter()
                .map(|r| Reservation {
                    id: r.id.to_string(),
                    tenant_id: r.tenant_id.to_string(),
                    branch_id: r.branch_id.to_string(),
                    table_id: r.table_id.map(|id| id.to_string()),
                    customer_name: r.customer_name,
                    customer_phone: r.customer_phone,
                    guest_count: r.guest_count,
                    reservation_time: Some(Self::to_proto_timestamp(r.reservation_time)),
                    note: r.note.unwrap_or_default(),
                    status: r.status,
                    created_at: Some(Self::to_proto_timestamp(r.created_at)),
                    updated_at: Some(Self::to_proto_timestamp(r.updated_at)),
                })
                .collect(),
            pagination: Some(proto_gen::common::PaginationResponse {
                total_count: total_count as i32,
                total_pages: ((total_count as f64) / (limit as f64)).ceil() as i32,
                has_next: offset + limit < total_count,
            }),
        }))
    }

    async fn update_reservation_status(
        &self,
        request: Request<UpdateReservationStatusRequest>,
    ) -> Result<Response<ReservationResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();

        let id_uuid = Uuid::parse_str(&req.id)
            .map_err(|_| Status::invalid_argument("Invalid reservation_id"))?;

        let table_uuid = req
            .table_id
            .as_ref()
            .and_then(|id| Uuid::parse_str(id).ok());

        let updated = self
            .storefront_repo
            .update_reservation_status(&tenant_id, &id_uuid, &req.status, table_uuid.as_ref())
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        // Broadcast status update
        let notify_event = serde_json::json!({
            "tenant_id": updated.tenant_id,
            "branch_id": updated.branch_id,
            "reservation_id": updated.id,
            "customer_name": updated.customer_name,
            "reservation_time": updated.reservation_time,
            "status": updated.status
        });
        if let Ok(payload) = serde_json::to_string(&notify_event) {
            let channel = format!("kioskflow:reservations:{}", updated.branch_id);
            let mut redis_pub = self.redis.clone();
            let _: Result<(), _> = redis_pub.publish(channel, payload).await;
        }

        Ok(Response::new(ReservationResponse {
            reservation: Some(Reservation {
                id: updated.id.to_string(),
                tenant_id: updated.tenant_id.to_string(),
                branch_id: updated.branch_id.to_string(),
                table_id: updated.table_id.map(|id| id.to_string()),
                customer_name: updated.customer_name,
                customer_phone: updated.customer_phone,
                guest_count: updated.guest_count,
                reservation_time: Some(Self::to_proto_timestamp(updated.reservation_time)),
                note: updated.note.unwrap_or_default(),
                status: updated.status,
                created_at: Some(Self::to_proto_timestamp(updated.created_at)),
                updated_at: Some(Self::to_proto_timestamp(updated.updated_at)),
            }),
        }))
    }

    type StreamStorefrontChatStream =
        Pin<Box<dyn Stream<Item = Result<ChatMessage, Status>> + Send + 'static>>;

    async fn stream_storefront_chat(
        &self,
        request: Request<tonic::Streaming<ChatMessage>>,
    ) -> Result<Response<Self::StreamStorefrontChatStream>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let mut inbound_stream = request.into_inner();

        let (tx, rx) = tokio::sync::mpsc::channel(32);

        let storefront_repo = self.storefront_repo.clone();
        let redis_client = self.redis.clone();

        // 1. Spawning the task to read inbound gRPC messages (sent by customer/staff)
        tokio::spawn(async move {
            while let Some(msg_result) = inbound_stream.next().await {
                match msg_result {
                    Ok(msg) => {
                        let conv_uuid = match Uuid::parse_str(&msg.conversation_id) {
                            Ok(u) => u,
                            Err(_) => continue,
                        };

                        let domain_msg = DomainChatMessage {
                            id: Uuid::new_v4(),
                            tenant_id,
                            conversation_id: conv_uuid,
                            sender_type: msg.sender_type.clone(),
                            content: msg.content.clone(),
                            created_at: Utc::now(),
                        };

                        // Save message to DB
                        if let Ok(saved) = storefront_repo.create_chat_message(&domain_msg).await {
                            // Publish message to Redis PubSub
                            let payload_val = RedisChatMessage {
                                id: saved.id.to_string(),
                                tenant_id: saved.tenant_id.to_string(),
                                conversation_id: saved.conversation_id.to_string(),
                                sender_type: saved.sender_type,
                                content: saved.content,
                                created_at_seconds: saved.created_at.timestamp(),
                                created_at_nanos: saved.created_at.timestamp_subsec_nanos() as i32,
                            };

                            if let Ok(payload_str) = serde_json::to_string(&payload_val) {
                                let channel = format!("kioskflow:chat:{}", conv_uuid);
                                let mut conn = redis_client.clone();
                                let _: Result<(), _> = conn.publish(channel, payload_str).await;
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!("Inbound chat stream error: {:?}", e);
                        break;
                    }
                }
            }
        });

        // 2. We extract the first conversation metadata or wait for pubsub.
        // Wait, how does the client receive messages? We subscribe to a broad pubsub channel or a specific channel.
        // But since this is a general stream, we can get client-side subscription.
        // Let's create an active subscription on Redis pubsub using a dedicated Redis Client.
        let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL must be set");
        let client = redis::Client::open(redis_url)
            .map_err(|e| Status::internal(format!("Redis connection error: {}", e)))?;

        tokio::spawn(async move {
            if let Ok(mut pubsub) = client.get_async_pubsub().await {
                // Subscribe to a generic wildchat or handle multiple channels.
                // Wait, to keep it simple, the stream can subscribe to a wildcard pattern like "kioskflow:chat:*"
                if let Ok(_) = pubsub.psubscribe("kioskflow:chat:*").await {
                    let mut pubsub_stream = pubsub.into_on_message();

                    while let Some(msg) = pubsub_stream.next().await {
                        let payload: String = msg.get_payload().unwrap_or_default();
                        if let Ok(redis_msg) = serde_json::from_str::<RedisChatMessage>(&payload) {
                            let chat_msg = ChatMessage {
                                id: redis_msg.id,
                                tenant_id: redis_msg.tenant_id,
                                conversation_id: redis_msg.conversation_id,
                                sender_type: redis_msg.sender_type,
                                content: redis_msg.content,
                                created_at: Some(prost_types::Timestamp {
                                    seconds: redis_msg.created_at_seconds,
                                    nanos: redis_msg.created_at_nanos,
                                }),
                            };

                            if tx.send(Ok(chat_msg)).await.is_err() {
                                break; // Stream receiver was dropped
                            }
                        }
                    }
                }
            }
        });

        let output_stream = tokio_stream::wrappers::ReceiverStream::new(rx);
        Ok(Response::new(
            Box::pin(output_stream) as Self::StreamStorefrontChatStream
        ))
    }

    async fn get_chat_history(
        &self,
        request: Request<GetChatHistoryRequest>,
    ) -> Result<Response<ChatHistoryResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();

        let conv_uuid = Uuid::parse_str(&req.conversation_id)
            .map_err(|_| Status::invalid_argument("Invalid conversation_id"))?;

        let messages = self
            .storefront_repo
            .get_chat_history(&tenant_id, &conv_uuid)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(ChatHistoryResponse {
            messages: messages
                .into_iter()
                .map(|m| ChatMessage {
                    id: m.id.to_string(),
                    tenant_id: m.tenant_id.to_string(),
                    conversation_id: m.conversation_id.to_string(),
                    sender_type: m.sender_type,
                    content: m.content,
                    created_at: Some(Self::to_proto_timestamp(m.created_at)),
                })
                .collect(),
        }))
    }
}
