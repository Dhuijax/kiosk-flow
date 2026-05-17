use infra::procurement_repository::ProcurementRepository;
use proto_gen::common::{Money, PaginationRequest, PaginationResponse, SuccessResponse};
use proto_gen::procurement::{
    alert_service_server::AlertService, procurement_service_server::ProcurementService,
    supplier_service_server::SupplierService, CreatePurchaseOrderRequest, CreateSupplierRequest,
    DeleteSupplierRequest, DismissAlertRequest, GetPurchaseOrderRequest,
    GetSupplierRequest, ListPurchaseOrdersRequest, ListPurchaseOrdersResponse,
    ListStockAlertsRequest, ListStockAlertsResponse, ListSuppliersRequest, ListSuppliersResponse,
    MarkAlertAsReadRequest, PurchaseOrder as ProtoPurchaseOrder, PurchaseOrderItem as ProtoPurchaseOrderItem,
    StockAlert as ProtoStockAlert, Supplier as ProtoSupplier, UpdateSupplierRequest,
};
use std::sync::Arc;
use tonic::{Request, Response, Status};
use uuid::Uuid;
use infra::security::Claims;
use bigdecimal::{ToPrimitive, FromPrimitive};

pub struct SupplierServiceImpl {
    repo: Arc<ProcurementRepository>,
}

impl SupplierServiceImpl {
    pub fn new(repo: Arc<ProcurementRepository>) -> Self {
        Self { repo }
    }
}

#[tonic::async_trait]
impl SupplierService for SupplierServiceImpl {
    async fn list_suppliers(
        &self,
        request: Request<ListSuppliersRequest>,
    ) -> Result<Response<ListSuppliersResponse>, Status> {
        let tenant_id = request
            .extensions()
            .get::<Uuid>()
            .copied()
            .ok_or_else(|| Status::unauthenticated("Missing tenant ID"))?;

        let req = request.into_inner();
        let pagination = req.pagination.unwrap_or_else(|| PaginationRequest {
            page: 1,
            page_size: 20,
        });

        let limit = pagination.page_size as i64;
        let offset = ((pagination.page - 1) * pagination.page_size) as i64;

        let suppliers = self
            .repo
            .list_suppliers(tenant_id, req.search.as_deref(), limit, offset)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let proto_suppliers = suppliers
            .into_iter()
            .map(|s| ProtoSupplier {
                id: s.id.to_string(),
                name: s.name,
                phone: s.phone,
                email: s.email,
                address: s.address,
                created_at: s.created_at.to_rfc3339(),
                updated_at: s.updated_at.to_rfc3339(),
            })
            .collect();

        Ok(Response::new(ListSuppliersResponse {
            suppliers: proto_suppliers,
            pagination: Some(PaginationResponse {
                total_count: 0,
                total_pages: 0,
                has_next: false,
            }),
        }))
    }

    async fn get_supplier(
        &self,
        request: Request<GetSupplierRequest>,
    ) -> Result<Response<ProtoSupplier>, Status> {
        let tenant_id = request
            .extensions()
            .get::<Uuid>()
            .copied()
            .ok_or_else(|| Status::unauthenticated("Missing tenant ID"))?;

        let req = request.into_inner();
        let supplier_id = Uuid::parse_str(&req.id)
            .map_err(|_| Status::invalid_argument("Invalid supplier ID"))?;

        let supplier = self
            .repo
            .get_supplier(tenant_id, supplier_id)
            .await
            .map_err(|e| Status::not_found(e.to_string()))?;

        Ok(Response::new(ProtoSupplier {
            id: supplier.id.to_string(),
            name: supplier.name,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address,
            created_at: supplier.created_at.to_rfc3339(),
            updated_at: supplier.updated_at.to_rfc3339(),
        }))
    }

    async fn create_supplier(
        &self,
        request: Request<CreateSupplierRequest>,
    ) -> Result<Response<ProtoSupplier>, Status> {
        let tenant_id = request
            .extensions()
            .get::<Uuid>()
            .copied()
            .ok_or_else(|| Status::unauthenticated("Missing tenant ID"))?;

        let req = request.into_inner();

        let supplier = self
            .repo
            .create_supplier(
                tenant_id,
                &req.name,
                req.phone.as_deref(),
                req.email.as_deref(),
                req.address.as_deref(),
            )
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(ProtoSupplier {
            id: supplier.id.to_string(),
            name: supplier.name,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address,
            created_at: supplier.created_at.to_rfc3339(),
            updated_at: supplier.updated_at.to_rfc3339(),
        }))
    }

    async fn update_supplier(
        &self,
        request: Request<UpdateSupplierRequest>,
    ) -> Result<Response<ProtoSupplier>, Status> {
        let tenant_id = request
            .extensions()
            .get::<Uuid>()
            .copied()
            .ok_or_else(|| Status::unauthenticated("Missing tenant ID"))?;

        let req = request.into_inner();
        let supplier_id = Uuid::parse_str(&req.id)
            .map_err(|_| Status::invalid_argument("Invalid supplier ID"))?;

        let supplier = self
            .repo
            .update_supplier(
                tenant_id,
                supplier_id,
                req.name.as_deref(),
                req.phone.as_deref(),
                req.email.as_deref(),
                req.address.as_deref(),
            )
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(ProtoSupplier {
            id: supplier.id.to_string(),
            name: supplier.name,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address,
            created_at: supplier.created_at.to_rfc3339(),
            updated_at: supplier.updated_at.to_rfc3339(),
        }))
    }

    async fn delete_supplier(
        &self,
        request: Request<DeleteSupplierRequest>,
    ) -> Result<Response<SuccessResponse>, Status> {
        let tenant_id = request
            .extensions()
            .get::<Uuid>()
            .copied()
            .ok_or_else(|| Status::unauthenticated("Missing tenant ID"))?;

        let req = request.into_inner();
        let supplier_id = Uuid::parse_str(&req.id)
            .map_err(|_| Status::invalid_argument("Invalid supplier ID"))?;

        self.repo
            .delete_supplier(tenant_id, supplier_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(SuccessResponse { success: true, message: "".to_string() }))
    }
}

pub struct ProcurementServiceImpl {
    repo: Arc<ProcurementRepository>,
}

impl ProcurementServiceImpl {
    pub fn new(repo: Arc<ProcurementRepository>) -> Self {
        Self { repo }
    }
}

#[tonic::async_trait]
impl ProcurementService for ProcurementServiceImpl {
    async fn list_purchase_orders(
        &self,
        request: Request<ListPurchaseOrdersRequest>,
    ) -> Result<Response<ListPurchaseOrdersResponse>, Status> {
        let tenant_id = request
            .extensions()
            .get::<Uuid>()
            .copied()
            .ok_or_else(|| Status::unauthenticated("Missing tenant ID"))?;

        let req = request.into_inner();
        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch ID"))?;

        let pagination = req.pagination.unwrap_or_else(|| PaginationRequest {
            page: 1,
            page_size: 20,
        });

        let limit = pagination.page_size as i64;
        let offset = ((pagination.page - 1) * pagination.page_size) as i64;

        let pos = self
            .repo
            .list_purchase_orders(tenant_id, branch_id, limit, offset)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let mut proto_pos = Vec::new();
        for po in pos {
            // we could fetch supplier name and items here if needed
            proto_pos.push(ProtoPurchaseOrder {
                id: po.id.to_string(),
                branch_id: po.branch_id.to_string(),
                supplier_id: po.supplier_id.to_string(),
                supplier_name: "".to_string(), // Fetch if needed
                total_amount: Some(Money {
                    currency_code: "VND".to_string(),
                    units: po.total_amount.to_i64().unwrap_or(0),
                    nanos: 0,
                }),
                created_by: po.created_by.to_string(),
                created_at: po.created_at.to_rfc3339(),
                items: vec![],
            });
        }

        Ok(Response::new(ListPurchaseOrdersResponse {
            purchase_orders: proto_pos,
            pagination: Some(PaginationResponse {
                total_count: 0,
                total_pages: 0,
                has_next: false,
            }),
        }))
    }

    async fn get_purchase_order(
        &self,
        request: Request<GetPurchaseOrderRequest>,
    ) -> Result<Response<ProtoPurchaseOrder>, Status> {
        let tenant_id = request
            .extensions()
            .get::<Uuid>()
            .copied()
            .ok_or_else(|| Status::unauthenticated("Missing tenant ID"))?;

        let req = request.into_inner();
        let po_id = Uuid::parse_str(&req.id)
            .map_err(|_| Status::invalid_argument("Invalid PO ID"))?;

        let po = self
            .repo
            .get_purchase_order(tenant_id, po_id)
            .await
            .map_err(|e| Status::not_found(e.to_string()))?;

        let items = self
            .repo
            .get_purchase_order_items(tenant_id, po_id)
            .await
            .unwrap_or_default();

        let proto_items = items
            .into_iter()
            .map(|i| ProtoPurchaseOrderItem {
                id: i.id.to_string(),
                ingredient_id: i.ingredient_id.to_string(),
                ingredient_name: "".to_string(),
                quantity: i.quantity.to_f64().unwrap_or(0.0),
                unit_price: Some(Money {
                    currency_code: "VND".to_string(),
                    units: i.unit_price.to_i64().unwrap_or(0),
                    nanos: 0,
                }),
            })
            .collect();

        Ok(Response::new(ProtoPurchaseOrder {
            id: po.id.to_string(),
            branch_id: po.branch_id.to_string(),
            supplier_id: po.supplier_id.to_string(),
            supplier_name: "".to_string(),
            total_amount: Some(Money {
                currency_code: "VND".to_string(),
                units: po.total_amount.to_i64().unwrap_or(0),
                nanos: 0,
            }),
            created_by: po.created_by.to_string(),
            created_at: po.created_at.to_rfc3339(),
            items: proto_items,
        }))
    }

    async fn create_purchase_order(
        &self,
        request: Request<CreatePurchaseOrderRequest>,
    ) -> Result<Response<ProtoPurchaseOrder>, Status> {
        let tenant_id = request
            .extensions()
            .get::<Uuid>()
            .copied()
            .ok_or_else(|| Status::unauthenticated("Missing tenant ID"))?;
        
        let user_id = request
            .extensions()
            .get::<Claims>()
            .map(|claims| Uuid::parse_str(&claims.sub).unwrap_or_default())
            .unwrap_or_else(|| Uuid::nil());

        let req = request.into_inner();
        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch ID"))?;
        let supplier_id = Uuid::parse_str(&req.supplier_id)
            .map_err(|_| Status::invalid_argument("Invalid supplier ID"))?;

        let mut total_amount = sqlx::types::BigDecimal::default();
        for item in &req.items {
            let qty = sqlx::types::BigDecimal::from_f64(item.quantity).unwrap_or_default();
            let price = sqlx::types::BigDecimal::from(item.unit_price.as_ref().map(|m| m.units).unwrap_or(0));
            total_amount += qty * price;
        }

        let mut tx = self
            .repo
            .begin_transaction()
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let po = ProcurementRepository::create_purchase_order(
            &mut tx,
            tenant_id,
            branch_id,
            supplier_id,
            total_amount,
            user_id, // Replace with actual user_id from token
        )
        .await
        .map_err(|e| Status::internal(e.to_string()))?;

        let mut proto_items = Vec::new();

        for item in req.items {
            let ingredient_id = Uuid::parse_str(&item.ingredient_id)
                .map_err(|_| Status::invalid_argument("Invalid ingredient ID"))?;
            let qty = sqlx::types::BigDecimal::from_f64(item.quantity).unwrap_or_default();
            let price = sqlx::types::BigDecimal::from(item.unit_price.as_ref().map(|m| m.units).unwrap_or(0));

            let po_item = ProcurementRepository::create_purchase_order_item(
                &mut tx,
                tenant_id,
                po.id,
                ingredient_id,
                qty.clone(),
                price,
            )
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

            // Update Stock
            ProcurementRepository::increase_ingredient_stock(
                &mut tx,
                tenant_id,
                branch_id,
                ingredient_id,
                qty,
                po.id,
                user_id, // actual user id
            )
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

            proto_items.push(ProtoPurchaseOrderItem {
                id: po_item.id.to_string(),
                ingredient_id: po_item.ingredient_id.to_string(),
                ingredient_name: "".to_string(),
                quantity: item.quantity,
                unit_price: item.unit_price,
            });
        }

        tx.commit()
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(ProtoPurchaseOrder {
            id: po.id.to_string(),
            branch_id: po.branch_id.to_string(),
            supplier_id: po.supplier_id.to_string(),
            supplier_name: "".to_string(),
            total_amount: Some(Money {
                currency_code: "VND".to_string(),
                units: po.total_amount.to_i64().unwrap_or(0),
                nanos: 0,
            }),
            created_by: po.created_by.to_string(),
            created_at: po.created_at.to_rfc3339(),
            items: proto_items,
        }))
    }
}

pub struct AlertServiceImpl {
    repo: Arc<ProcurementRepository>,
}

impl AlertServiceImpl {
    pub fn new(repo: Arc<ProcurementRepository>) -> Self {
        Self { repo }
    }
}

#[tonic::async_trait]
impl AlertService for AlertServiceImpl {
    async fn list_stock_alerts(
        &self,
        request: Request<ListStockAlertsRequest>,
    ) -> Result<Response<ListStockAlertsResponse>, Status> {
        let tenant_id = request
            .extensions()
            .get::<Uuid>()
            .copied()
            .ok_or_else(|| Status::unauthenticated("Missing tenant ID"))?;

        let req = request.into_inner();
        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch ID"))?;

        let pagination = req.pagination.unwrap_or_else(|| PaginationRequest {
            page: 1,
            page_size: 50,
        });

        let limit = pagination.page_size as i64;
        let offset = ((pagination.page - 1) * pagination.page_size) as i64;
        let include_read = req.include_read.unwrap_or(false);

        let alerts = self
            .repo
            .list_stock_alerts(tenant_id, branch_id, include_read, limit, offset)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let proto_alerts = alerts
            .into_iter()
            .map(|a| ProtoStockAlert {
                id: a.id.to_string(),
                branch_id: a.branch_id.to_string(),
                ingredient_id: a.ingredient_id.to_string(),
                ingredient_name: "".to_string(), // Can be fetched
                message: a.message,
                is_read: a.is_read,
                created_at: a.created_at.to_rfc3339(),
            })
            .collect();

        Ok(Response::new(ListStockAlertsResponse {
            alerts: proto_alerts,
            pagination: Some(PaginationResponse {
                total_count: 0,
                total_pages: 0,
                has_next: false,
            }),
        }))
    }

    async fn mark_alert_as_read(
        &self,
        request: Request<MarkAlertAsReadRequest>,
    ) -> Result<Response<SuccessResponse>, Status> {
        let tenant_id = request
            .extensions()
            .get::<Uuid>()
            .copied()
            .ok_or_else(|| Status::unauthenticated("Missing tenant ID"))?;

        let req = request.into_inner();
        let alert_id = Uuid::parse_str(&req.id)
            .map_err(|_| Status::invalid_argument("Invalid alert ID"))?;

        self.repo
            .mark_alert_as_read(tenant_id, alert_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(SuccessResponse { success: true, message: "".to_string() }))
    }

    async fn dismiss_alert(
        &self,
        request: Request<DismissAlertRequest>,
    ) -> Result<Response<SuccessResponse>, Status> {
        let tenant_id = request
            .extensions()
            .get::<Uuid>()
            .copied()
            .ok_or_else(|| Status::unauthenticated("Missing tenant ID"))?;

        let req = request.into_inner();
        let alert_id = Uuid::parse_str(&req.id)
            .map_err(|_| Status::invalid_argument("Invalid alert ID"))?;

        self.repo
            .dismiss_alert(tenant_id, alert_id)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        Ok(Response::new(SuccessResponse { success: true, message: "".to_string() }))
    }
}
