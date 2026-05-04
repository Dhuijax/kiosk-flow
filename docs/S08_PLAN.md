# Sprint S08: Category Service

## Goal
Implement the Category management system (Phase 1 of Inventory Management). This involves defining the gRPC interfaces, adding Rust models and repositories, and exposing the Category Service.

## Prerequisites
- The `categories` table with RLS is already created via `0002_core_entities.sql`.

## Proposed Changes

### 1. Protobuf Definitions
#### [MODIFY] `proto/inventory.proto`
- Add a new `Category` message.
- Add requests/responses: `CreateCategoryRequest`, `GetCategoryRequest`, `ListCategoriesRequest`, `ListCategoriesResponse`, `UpdateCategoryRequest`, `DeleteCategoryRequest`.
- Note: We should probably move Category endpoints to `inventory.proto` or a dedicated `category.proto`. Let's add them to `inventory.proto` to keep catalogue/inventory logic grouped.

### 2. Domain (Rust)
#### [NEW] `crates/domain/src/models/category.rs`
- Define the `Category` struct mapping to the DB.
  ```rust
  pub struct Category {
      pub id: Uuid,
      pub tenant_id: Uuid,
      pub name: String,
      pub parent_id: Option<Uuid>,
      pub created_at: DateTime<Utc>,
  }
  ```
- Export it in `crates/domain/src/models/mod.rs` and `crates/domain/src/lib.rs`.

### 3. Infrastructure (Rust)
#### [MODIFY] `crates/infra/src/repository.rs` (or a dedicated file if refactored)
- Create `CategoryRepository` with `PgPool`.
- Implement CRUD operations using SQLx:
  - `create(&self, category: &Category) -> Result<Category>`
  - `find_by_id(&self, tenant_id: &Uuid, id: &Uuid) -> Result<Option<Category>>`
  - `list_by_tenant(&self, tenant_id: &Uuid) -> Result<Vec<Category>>`
  - `update(&self, ...) -> Result<Category>`
  - `delete(&self, tenant_id: &Uuid, id: &Uuid) -> Result<()>`

### 4. Services (Rust)
#### [NEW] `crates/services/src/category.rs`
- Implement robust gRPC `CategoryService` (or add to `InventoryServiceServer`) handling context and executing requests via `CategoryRepository`.

#### [MODIFY] `crates/services/src/lib.rs`
- Export and register the Service in the main application router.

#### [MODIFY] `backend/src/main.rs`
- Attach the Service to `tonic` server.

---

## Verification Plan

### Automated Tests
- Verify standard Rust compilation (`cargo check`).

### Manual Verification
- Use `evans` or `grpcurl` to call `CreateCategory` and verify successful creation in PostgreSQL.
- Ensure RLS constraints hold (Tenant A cannot see Tenant B's categories).
