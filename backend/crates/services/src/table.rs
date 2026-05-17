use domain::models::table::{
    FloorPlan as DomainFloorPlan, Table as DomainTable, TableStatus as DomainTableStatus,
};
use infra::repository::{FloorPlanRepository, TableRepository};
use infra::security::Claims;
use prost_types::Timestamp;
use proto_gen::table::{
    table_service_server::TableService, CreateFloorPlanRequest, CreateTablesRequest,
    CreateTablesResponse, DeleteFloorPlanRequest, DeleteTableRequest, FloorPlan as ProtoFloorPlan,
    ListFloorPlansRequest, ListFloorPlansResponse, ListTablesRequest, ListTablesResponse,
    Table as ProtoTable, TableStatus as ProtoTableStatus, UpdateFloorPlanRequest,
    UpdateTableRequest, UpdateTableStatusRequest, TransferTableRequest, TransferTableResponse,
};
use std::convert::TryFrom;
use std::sync::Arc;
use tonic::{Request, Response, Status};
use uuid::Uuid;

pub struct TableServiceImpl {
    table_repo: Arc<TableRepository>,
    floor_plan_repo: Arc<FloorPlanRepository>,
}

impl TableServiceImpl {
    pub fn new(
        table_repo: Arc<TableRepository>,
        floor_plan_repo: Arc<FloorPlanRepository>,
    ) -> Self {
        Self {
            table_repo,
            floor_plan_repo,
        }
    }

    fn get_tenant_id<T>(&self, request: &Request<T>) -> Result<Uuid, Status> {
        let claims = request
            .extensions()
            .get::<Claims>()
            .ok_or_else(|| Status::unauthenticated("Unauthorized: Missing or invalid token"))?;
        Uuid::parse_str(&claims.tenant_id)
            .map_err(|_| Status::invalid_argument("Invalid tenant id in token"))
    }
}

fn to_proto_status(s: DomainTableStatus) -> ProtoTableStatus {
    match s {
        DomainTableStatus::Available => ProtoTableStatus::Available,
        DomainTableStatus::Occupied => ProtoTableStatus::Occupied,
        DomainTableStatus::Reserved => ProtoTableStatus::Reserved,
        DomainTableStatus::Cleaning => ProtoTableStatus::Cleaning,
    }
}

fn from_proto_status(s: ProtoTableStatus) -> DomainTableStatus {
    match s {
        ProtoTableStatus::Available => DomainTableStatus::Available,
        ProtoTableStatus::Occupied => DomainTableStatus::Occupied,
        ProtoTableStatus::Reserved => DomainTableStatus::Reserved,
        ProtoTableStatus::Cleaning => DomainTableStatus::Cleaning,
    }
}

fn to_proto_floor_plan(fp: DomainFloorPlan) -> ProtoFloorPlan {
    ProtoFloorPlan {
        id: fp.id.to_string(),
        branch_id: fp.branch_id.to_string(),
        name: fp.name,
        layout_data: fp.layout_data.to_string(),
        created_at: Some(Timestamp {
            seconds: fp.created_at.timestamp(),
            nanos: fp.created_at.timestamp_subsec_nanos() as i32,
        }),
    }
}

fn to_proto_table(t: DomainTable) -> ProtoTable {
    ProtoTable {
        id: t.id.to_string(),
        floor_plan_id: t.floor_plan_id.to_string(),
        branch_id: t.branch_id.to_string(),
        name: t.name,
        capacity: t.capacity,
        position_x: t.position_x,
        position_y: t.position_y,
        status: to_proto_status(t.status) as i32,
        current_order_id: t.current_order_id.map(|id| id.to_string()),
    }
}

#[tonic::async_trait]
impl TableService for TableServiceImpl {
    async fn create_floor_plan(
        &self,
        request: Request<CreateFloorPlanRequest>,
    ) -> Result<Response<ProtoFloorPlan>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();

        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;
        let layout_data = serde_json::from_str(&req.layout_data).unwrap_or(serde_json::json!({}));

        let new_fp = DomainFloorPlan {
            id: Uuid::new_v4(),
            tenant_id,
            branch_id,
            name: req.name,
            layout_data,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let created = self
            .floor_plan_repo
            .create(&new_fp)
            .await
            .map_err(|e| Status::internal(format!("Failed to create floor plan: {}", e)))?;

        Ok(Response::new(to_proto_floor_plan(created)))
    }

    async fn list_floor_plans(
        &self,
        request: Request<ListFloorPlansRequest>,
    ) -> Result<Response<ListFloorPlansResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let branch_id = Uuid::parse_str(&request.into_inner().branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;

        let plans = self
            .floor_plan_repo
            .list_by_branch(&tenant_id, &branch_id)
            .await
            .map_err(|e| Status::internal(format!("DB error: {}", e)))?;

        Ok(Response::new(ListFloorPlansResponse {
            floor_plans: plans.into_iter().map(to_proto_floor_plan).collect(),
        }))
    }

    async fn update_floor_plan(
        &self,
        request: Request<UpdateFloorPlanRequest>,
    ) -> Result<Response<ProtoFloorPlan>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();
        let id = Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid ID"))?;

        let layout_json = req
            .layout_data
            .map(|s| serde_json::from_str(&s).unwrap_or(serde_json::json!({})));

        let updated = self
            .floor_plan_repo
            .update(&tenant_id, &id, req.name, layout_json)
            .await
            .map_err(|e| Status::internal(format!("Update failed: {}", e)))?;

        Ok(Response::new(to_proto_floor_plan(updated)))
    }

    async fn delete_floor_plan(
        &self,
        request: Request<DeleteFloorPlanRequest>,
    ) -> Result<Response<()>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let id = Uuid::parse_str(&request.into_inner().id)
            .map_err(|_| Status::invalid_argument("Invalid ID"))?;

        self.floor_plan_repo
            .delete(&tenant_id, &id)
            .await
            .map_err(|e| Status::internal(format!("Delete failed: {}", e)))?;

        Ok(Response::new(()))
    }

    async fn create_tables(
        &self,
        request: Request<CreateTablesRequest>,
    ) -> Result<Response<CreateTablesResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();
        let branch_id = Uuid::parse_str(&req.branch_id)
            .map_err(|_| Status::invalid_argument("Invalid branch_id"))?;
        let floor_plan_id = Uuid::parse_str(&req.floor_plan_id)
            .map_err(|_| Status::invalid_argument("Invalid floor_plan_id"))?;

        let domain_tables: Vec<DomainTable> = req
            .tables
            .into_iter()
            .map(|t| DomainTable {
                id: Uuid::new_v4(),
                tenant_id,
                branch_id,
                floor_plan_id,
                name: t.name,
                capacity: t.capacity,
                position_x: t.position_x,
                position_y: t.position_y,
                status: DomainTableStatus::Available,
                current_order_id: None,
                created_at: chrono::Utc::now(),
                updated_at: chrono::Utc::now(),
            })
            .collect();

        let created = self
            .table_repo
            .create_batch(&domain_tables)
            .await
            .map_err(|e| Status::internal(format!("Batch create failed: {}", e)))?;

        Ok(Response::new(CreateTablesResponse {
            tables: created.into_iter().map(to_proto_table).collect(),
        }))
    }

    async fn list_tables(
        &self,
        request: Request<ListTablesRequest>,
    ) -> Result<Response<ListTablesResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let fp_id = Uuid::parse_str(&request.into_inner().floor_plan_id)
            .map_err(|_| Status::invalid_argument("Invalid ID"))?;

        let tables = self
            .table_repo
            .list_by_floor_plan(&tenant_id, &fp_id)
            .await
            .map_err(|e| Status::internal(format!("DB error: {}", e)))?;

        Ok(Response::new(ListTablesResponse {
            tables: tables.into_iter().map(to_proto_table).collect(),
        }))
    }

    async fn update_table(
        &self,
        request: Request<UpdateTableRequest>,
    ) -> Result<Response<ProtoTable>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();
        let id = Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid ID"))?;

        let updated = self
            .table_repo
            .update(
                &tenant_id,
                &id,
                req.name,
                req.capacity,
                req.position_x,
                req.position_y,
            )
            .await
            .map_err(|e| Status::internal(format!("Update failed: {}", e)))?;

        Ok(Response::new(to_proto_table(updated)))
    }

    async fn delete_table(
        &self,
        request: Request<DeleteTableRequest>,
    ) -> Result<Response<()>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let id = Uuid::parse_str(&request.into_inner().id)
            .map_err(|_| Status::invalid_argument("Invalid ID"))?;

        self.table_repo
            .delete(&tenant_id, &id)
            .await
            .map_err(|e| Status::internal(format!("Delete failed: {}", e)))?;

        Ok(Response::new(()))
    }

    async fn update_table_status(
        &self,
        request: Request<UpdateTableStatusRequest>,
    ) -> Result<Response<ProtoTable>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();
        let id = Uuid::parse_str(&req.id).map_err(|_| Status::invalid_argument("Invalid ID"))?;
        let status = from_proto_status(
            ProtoTableStatus::try_from(req.status).unwrap_or(ProtoTableStatus::Available),
        );

        let updated = self
            .table_repo
            .update_status(&tenant_id, &id, status)
            .await
            .map_err(|e| Status::internal(format!("Status update failed: {}", e)))?;

        Ok(Response::new(to_proto_table(updated)))
    }

    async fn transfer_table(
        &self,
        request: Request<TransferTableRequest>,
    ) -> Result<Response<TransferTableResponse>, Status> {
        let tenant_id = self.get_tenant_id(&request)?;
        let req = request.into_inner();

        let source_uuid = Uuid::parse_str(&req.source_table_id)
            .map_err(|_| Status::invalid_argument("Invalid source_table_id"))?;
        let target_uuid = Uuid::parse_str(&req.target_table_id)
            .map_err(|_| Status::invalid_argument("Invalid target_table_id"))?;

        let (src, tgt, merged_order_id) = self
            .table_repo
            .transfer(&tenant_id, &source_uuid, &target_uuid)
            .await
            .map_err(|e| Status::internal(format!("Transfer failed: {}", e)))?;

        Ok(Response::new(TransferTableResponse {
            source_table: Some(to_proto_table(src)),
            target_table: Some(to_proto_table(tgt)),
            merged_order_id: merged_order_id.map(|id| id.to_string()),
        }))
    }
}
