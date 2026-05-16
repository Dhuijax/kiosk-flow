#![allow(clippy::result_large_err)]
#![allow(clippy::too_many_arguments)]
use tonic::transport::Server;
use http::header::{HeaderName, HeaderValue};
use std::net::SocketAddr;

use proto_gen::auth::auth_service_server::AuthServiceServer;
use proto_gen::store::{store_service_server::StoreServiceServer, tenant_settings_service_server::TenantSettingsServiceServer};
use proto_gen::inventory::inventory_service_server::InventoryServiceServer;
use proto_gen::product::product_service_server::ProductServiceServer;
use services::auth::AuthServiceImpl;
use services::store::{StoreServiceImpl, TenantSettingsServiceImpl};
use services::inventory::InventoryServiceImpl;
use services::category::CategoryServiceImpl;
use services::product::ProductServiceImpl;
use services::table::TableServiceImpl;
use services::order::OrderServiceImpl;
use proto_gen::category::category_service_server::CategoryServiceServer;
use proto_gen::table::table_service_server::TableServiceServer;
use proto_gen::order::order_service_server::OrderServiceServer;
use proto_gen::payment::payment_service_server::PaymentServiceServer;
use proto_gen::report::report_service_server::ReportServiceServer;
use services::payment::PaymentServiceImpl;
use services::report::ReportServiceImpl;
use services::status::StatusServiceImpl;
use proto_gen::status::status_service_server::StatusServiceServer;
use proto_gen::customer::customer_service_server::CustomerServiceServer;
use services::customer::CustomerServiceImpl;
use proto_gen::branch::branch_service_server::BranchServiceServer;
use services::branch::BranchServiceImpl;
use proto_gen::ingredient::ingredient_service_server::IngredientServiceServer;
use services::ingredient::IngredientServiceImpl;
use proto_gen::recipe::recipe_service_server::RecipeServiceServer;
use services::recipe::RecipeServiceImpl;

use infra::middleware::get_auth_interceptor;

use infra::db::create_pool;
use infra::repository::{UserRepository, TenantRepository, CategoryRepository, ProductRepository, ToppingRepository, TableRepository, FloorPlanRepository, OrderRepository, PaymentRepository, InventoryRepository, ReportRepository, CustomerRepository, StoreRepository, IngredientRepository};
use infra::recipe_repository::RecipeRepository;
use infra::security::SecurityService;
use std::sync::Arc;
use dotenvy::dotenv;

mod config;
use config::Config;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    let config = Config::from_env()?;
    let addr: SocketAddr = config.server_addr.parse()?;
    println!("KioskFlow Backend listening on {}", addr);

    // 1. Initialize DB Pool
    let pool = create_pool().await?;
    
    // Initialize Redis Manager
    let redis_manager = infra::cache::create_redis_manager().await?;
    
    // Run Migrations
    infra::db::run_migrations(&pool).await?;
    
    // 2. Initialize Shared Components
    let security = Arc::new(SecurityService::new(&config.jwt_secret));
    let tenant_repo = Arc::new(TenantRepository::new(pool.clone()));
    let user_repo = Arc::new(UserRepository::new(pool.clone()));
    let category_repo = Arc::new(CategoryRepository::new(pool.clone()));
    let product_repo = Arc::new(ProductRepository::new(pool.clone()));
    let topping_repo = Arc::new(ToppingRepository::new(pool.clone()));
    let table_repo = Arc::new(TableRepository::new(pool.clone()));
    let floor_plan_repo = Arc::new(FloorPlanRepository::new(pool.clone()));
    let order_repo = Arc::new(OrderRepository::new(pool.clone()));
    let payment_repo = Arc::new(PaymentRepository::new(pool.clone()));
    let inventory_repo = Arc::new(InventoryRepository::new(pool.clone()));
    let report_repo = Arc::new(ReportRepository::new(pool.clone()));
    let customer_repo = Arc::new(CustomerRepository::new(pool.clone()));
    let store_repo = Arc::new(StoreRepository::new(pool.clone()));
    let ingredient_repo = Arc::new(IngredientRepository::new(pool.clone()));
    let recipe_repo = Arc::new(RecipeRepository::new(pool.clone()));

    // 3. Initialize Services
    let auth_service = AuthServiceImpl::new(user_repo.clone(), tenant_repo.clone(), security.clone());
    let store_service = StoreServiceImpl::new(store_repo.clone());
    let settings_service = TenantSettingsServiceImpl::new(store_repo.clone());
    let inventory_service = InventoryServiceImpl::new(inventory_repo.clone());
    let category_service = CategoryServiceImpl::new(category_repo.clone());
    let product_service = ProductServiceImpl::new(product_repo.clone(), topping_repo.clone());
    let table_service = TableServiceImpl::new(table_repo.clone(), floor_plan_repo.clone());
    let order_service = OrderServiceImpl::new(order_repo.clone(), product_repo.clone(), topping_repo.clone(), inventory_repo.clone(), table_repo.clone(), redis_manager.clone());
    let payment_service = PaymentServiceImpl::new(payment_repo.clone(), order_repo.clone(), customer_repo.clone(), user_repo.clone());
    let report_service = ReportServiceImpl::new(report_repo.clone());
    let customer_service = CustomerServiceImpl::new(customer_repo.clone(), order_repo.clone());
    let branch_service = BranchServiceImpl::new(store_repo.clone());
    let ingredient_service = IngredientServiceImpl::new(ingredient_repo.clone());
    let recipe_service = RecipeServiceImpl::new(recipe_repo.clone());
    let status_service = StatusServiceImpl::new();

    let auth_interceptor = get_auth_interceptor(config.jwt_secret.clone());
    
    let auth_server = AuthServiceServer::with_interceptor(auth_service, auth_interceptor.clone());
    let store_server = StoreServiceServer::with_interceptor(store_service, auth_interceptor.clone());
    let settings_server = TenantSettingsServiceServer::with_interceptor(settings_service, auth_interceptor.clone());
    let inventory_server = InventoryServiceServer::with_interceptor(inventory_service, auth_interceptor.clone());
    let category_server = CategoryServiceServer::with_interceptor(category_service, auth_interceptor.clone());
    let product_server = ProductServiceServer::with_interceptor(product_service, auth_interceptor.clone());
    let table_server = TableServiceServer::with_interceptor(table_service, auth_interceptor.clone());
    let order_server = OrderServiceServer::with_interceptor(order_service, auth_interceptor.clone());
    let payment_server = PaymentServiceServer::with_interceptor(payment_service, auth_interceptor.clone());
    let report_server = ReportServiceServer::with_interceptor(report_service, auth_interceptor.clone());
    let customer_server = CustomerServiceServer::with_interceptor(customer_service, auth_interceptor.clone());
    let branch_server = BranchServiceServer::with_interceptor(branch_service, auth_interceptor.clone());
    let ingredient_server = IngredientServiceServer::with_interceptor(ingredient_service, auth_interceptor.clone());
    let recipe_server = RecipeServiceServer::with_interceptor(recipe_service, auth_interceptor.clone());
    let status_server = StatusServiceServer::new(status_service);

    // 4. Setup gRPC Reflection
    let ext_descriptor_set = tonic_reflection::server::Builder::configure()
        .register_encoded_file_descriptor_set(proto_gen::FILE_DESCRIPTOR_SET)
        .build_v1()?;

    // 5. CORS configuration
    let allowed_origins = std::env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "*".to_string())
        .split(',')
        .map(|s| s.parse().unwrap())
        .collect::<Vec<HeaderValue>>();

    let mut cors = tower_http::cors::CorsLayer::new()
        .allow_headers([
            HeaderName::from_static("authorization"),
            HeaderName::from_static("content-type"),
            HeaderName::from_static("x-tenant-id"),
            HeaderName::from_static("x-grpc-web"),
            HeaderName::from_static("x-user-agent"),
            HeaderName::from_static("grpc-timeout"),
        ])
        .allow_methods([http::Method::GET, http::Method::POST, http::Method::OPTIONS]);

    if allowed_origins.contains(&HeaderValue::from_static("*")) {
        cors = cors.allow_origin(tower_http::cors::Any);
    } else {
        cors = cors.allow_origin(allowed_origins);
    }

    let cors = cors.expose_headers([
        HeaderName::from_static("grpc-status"),
        HeaderName::from_static("grpc-message"),
        HeaderName::from_static("grpc-status-details-bin")
    ]);

    println!("Starting server with gRPC-Web and CORS enabled...");

    let server = Server::builder()
        .accept_http1(true)
        .layer(cors);

    // Apply tonic-web to all services
    let mut router = server;
    let auth_server = tonic_web::enable(auth_server);
    let store_server = tonic_web::enable(store_server);
    let inventory_server = tonic_web::enable(inventory_server);
    let category_server = tonic_web::enable(category_server);
    let product_server = tonic_web::enable(product_server);
    let table_server = tonic_web::enable(table_server);
    let order_server = tonic_web::enable(order_server);
    let payment_server = tonic_web::enable(payment_server);
    let report_server = tonic_web::enable(report_server);
    let customer_server = tonic_web::enable(customer_server);
    let status_server = tonic_web::enable(status_server);
    let settings_server = tonic_web::enable(settings_server);
    let branch_server = tonic_web::enable(branch_server);
    let ingredient_server = tonic_web::enable(ingredient_server);
    let recipe_server = tonic_web::enable(recipe_server);

    router
        .add_service(ext_descriptor_set)
        .add_service(auth_server)
        .add_service(store_server)
        .add_service(inventory_server)
        .add_service(category_server)
        .add_service(product_server)
        .add_service(table_server)
        .add_service(order_server)
        .add_service(payment_server)
        .add_service(report_server)
        .add_service(customer_server)
        .add_service(status_server)
        .add_service(settings_server)
        .add_service(branch_server)
        .add_service(ingredient_server)
        .add_service(recipe_server)
        .serve(addr)
        .await?;

    Ok(())
}
