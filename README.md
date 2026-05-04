# KioskFlow — SaaS POS Architecture

Next-gen SaaS POS/ERP system.

## Stack
- **Frontend**: Next.js 15 (App Router, Tailwind v4)
- **Backend**: Rust (tonic gRPC)
- **Database**: PostgreSQL 16 (RLS multi-tenancy)
- **Cache**: Redis 7
- **Proxy**: Envoy (gRPC-Web)

## Project Structure
- `backend/`: Rust workspace and services
- `frontend/`: Next.js web application
- `proto/`: Shared gRPC service definitions
- `docker-compose.yml`: Local infrastructure

## Quick Start
1. `docker compose up -d`
2. `cd backend && cargo build`
3. `cd frontend && npm install && npm run dev`
