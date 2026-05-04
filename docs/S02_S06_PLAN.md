# Sprint S02 & S06: Database Expansion & User Persistence

## Goal
Finalize the core database schema (Phase 0: S02) and implement real persistence for the Authentication and User Management services (Phase 1: S06).

## Proposed Changes

### 1. Database (Migrations)
#### [NEW] [002_user_and_branches.sql](file:///d:/myFlow/kiosk-flow/backend/migrations/002_user_and_branches.sql)
- Create `branches` table with `tenant_id` and RLS.
- Create `users` table with `tenant_id`, `role`, and password storage.
- Seed initial users for `alpha` and `beta` tenants.

---

### 2. Backend (Rust)
#### [MODIFY] [crates/infra/src/db.rs](file:///d:/myFlow/kiosk-flow/backend/crates/infra/src/db.rs)
- Add user repository methods using SQLx.

#### [MODIFY] [crates/services/src/auth.rs](file:///d:/myFlow/kiosk-flow/backend/crates/services/src/auth.rs)
- Remove mock logic.
- Implement real `Login` and `Register` hitting the DB.
- Use `argon2` for password verification.

#### [NEW] [crates/services/src/user.rs](file:///d:/myFlow/kiosk-flow/backend/crates/services/src/user.rs)
- Implement `UserService` (CRUD users).

---

## Verification Plan

### Automated Tests
- [ ] Integration test: Register a new user -> Login -> Verify JWT contains correct claims.
- [ ] RLS check: Ensure `tenant_A` user cannot list `tenant_B` users.

### Manual Verification
- [ ] Use `evans` or `postman` to call `AuthService.Login` and verify successful database lookup.
