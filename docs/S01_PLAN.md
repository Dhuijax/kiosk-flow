# Sprint S01: Cloud DB & Redis Connectivity

## 🎯 Goal
Establish a robust, multi-tenant database foundation using PostgreSQL Row-Level Security (RLS) on Neon Serverless Postgres, and ensure the Rust backend can securely connect and query data isolation by tenant. We will also use Upstash Serverless Redis for caching and pub/sub.

## 🏗️ Architecture & Stack
- **Database**: Neon Serverless PostgreSQL
- **Redis Cache**: Upstash Serverless Redis
- **Multi-tenancy**: Row-Level Security (RLS) with `tenant_id`
- **Backend Service**: Rust (Axum/Tonic) with `sqlx`
- **Infrastructure**: Cloud-native (No Docker Compose locally)

## 📋 Task Breakdown

### 1. Infrastructure Settings
- [ ] Create `.env` utilizing external connection URIs for Neon DB and Upstash Redis.
- [ ] No local docker-compose needed, leverage external serverless URIs for DB/Redis.
- [ ] Execute PostgreSQL migrations using sqlx to initialize with RLS-supporting schema directly on Neon.

### 2. Database Schema (DB Architect)
- [ ] Create `tenants` table for master tenant record.
- [ ] Create dummy `products` table with RLS enabled.
- [ ] Implement `SET LOCAL app.current_tenant` trigger or session logic.

### 3. Backend Connectivity (Backend Specialist)
- [ ] Configure `sqlx` connection pool in `crates/infra` for Neon via TCP/TLS.
- [ ] Establish connection manager for Upstash Redis.
- [ ] Implement gRPC Interceptor to extract `tenant_id` from metadata.
- [ ] Implement DB session wrapper to apply RLS context per request.

### 4. Verification (Test Engineer)
- [ ] Unit tests for DB connection to Neon and Upstash.
- [ ] Integration test: Verify `tenant_A` cannot see `tenant_B` data.

## 📅 Timeline
- **Phase 1**: Infrastructure Credentials & Connections
- **Phase 2**: Backend Pool & RLS Implementation
- **Phase 3**: Integration Testing & Handover

## ⚠️ Risks & Mitigation
- **RLS Overhead**: Minimize session variable setting frequency using efficient pooling.
- **Connection Leaks**: Ensure `RESET` is called or session is cleared if `SET LOCAL` is used. Use proper Neon pooling features if needed.
