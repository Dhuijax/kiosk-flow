# Sprint S02: Authentication & gRPC Services

## Goal
Implement a multi-tenant authentication system using custom JWT in the Rust backend with subdomain-based discovery, and scaffold the core Store and Inventory gRPC services.

## User Review Required
> [!IMPORTANT]
> **Subdomain Handling**: This plan assumes the Frontend (Next.js middleware) extracts the subdomain (e.g. `tenant1.kioskflow.com`) and passes it as an `X-Tenant-Id` header to the Backend.
> **Security**: JWT secrets should be managed via `.env`. Password hashing will use `argon2`.

## Proposed Changes

### 1. Protocol Definitions (Proto)
#### [NEW] [auth.proto](file:///d:/myFlow/kiosk-flow/proto/auth.proto)
- Define `AuthService` with `Login`, `Register`, `RefreshToken` methods.
- Include tenant field in register request.

#### [NEW] [store.proto](file:///d:/myFlow/kiosk-flow/proto/store.proto)
- Define `StoreService` to retrieve store settings and metadata.

#### [NEW] [inventory.proto](file:///d:/myFlow/kiosk-flow/proto/inventory.proto)
- Define `InventoryService` for list/get products (integrated with RLS).

---

### 2. Backend Implementation (Rust)
#### [MODIFY] [Cargo.toml](file:///d:/myFlow/kiosk-flow/backend/Cargo.toml)
- Add `jsonwebtoken`, `argon2`, `chrono` dependencies.

#### [NEW] [auth.rs](file:///d:/myFlow/kiosk-flow/backend/crates/services/src/auth.rs)
- Implement `AuthService` logic.
- Password hashing and JWT generation.

#### [MODIFY] [db.rs](file:///d:/myFlow/kiosk-flow/backend/crates/infra/src/db.rs)
- Update RLS session handling to use `tenant_id` from JWT/Header.

---

### 3. Frontend Implementation (Next.js 15)
#### [NEW] [middleware.ts](file:///d:/myFlow/kiosk-flow/frontend/middleware.ts)
- Extract subdomain and set `x-tenant-id` header.
- Protect `/dashboard/*` routes.

#### [NEW] [login-page.tsx](file:///d:/myFlow/kiosk-flow/frontend/app/auth/login/page.tsx)
- Login UI with subdomain awareness.

#### [NEW] [client.ts](file:///d:/myFlow/kiosk-flow/frontend/lib/grpc/client.ts)
- Reusable gRPC-Web client fetcher with Auth headers.

---

## Open Questions
- [ ] Do we need a "Master Admin" login that can bypass tenant RLS for support?
- [ ] Should we support multi-factor authentication (MFA) in this sprint? (Recommended: No, defer to later).

## Verification Plan

### Automated Tests
- [ ] `cargo test` for JWT validation and password hashing.
- [ ] `pytest tests/integration/test_auth.py` (Mocking gRPC requests).

### Manual Verification
- [ ] Access `tenant1.localhost:3000/login`, login, and verify redirection to dashboard.
- [ ] Verify `tenant2` cannot see products of `tenant1` via API.
