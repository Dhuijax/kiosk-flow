# KioskFlow — Master Architecture Plan

> **SaaS POS/ERP System inspired by KiotViet**
> Stack: Next.js + Tailwind CSS | Rust + gRPC (tonic) | PostgreSQL (Multi-tenant RLS)

---

## 1. System Overview

**KioskFlow** is a cloud-based, multi-tenant SaaS platform for managing retail stores, restaurants (F&B), and service businesses. The MVP focuses on the **Restaurant (F&B)** vertical.

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTS                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ Web App  │  │ POS App  │  │ Mobile (PWA future)  │   │
│  │ (Next.js)│  │ (Next.js)│  │                      │   │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘   │
│       │              │                   │               │
│  ─────┴──────────────┴───────────────────┴──────         │
│                 gRPC-Web (Envoy Proxy)                   │
│  ────────────────────────────────────────────────        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  BACKEND (Rust)                          │
│  ┌────────────┐ ┌──────────┐ ┌───────────────────────┐  │
│  │ Auth       │ │ POS      │ │ Inventory             │  │
│  │ Service    │ │ Service  │ │ Service               │  │
│  └────────────┘ └──────────┘ └───────────────────────┘  │
│  ┌────────────┐ ┌──────────┐ ┌───────────────────────┐  │
│  │ Reporting  │ │ Tenant   │ │ Notification          │  │
│  │ Service    │ │ Service  │ │ Service               │  │
│  └────────────┘ └──────────┘ └───────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │        Shared: Middleware (Auth, Tenant, Tracing) │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  DATABASE                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │   PostgreSQL (Shared DB, RLS per tenant)          │   │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │   │
│  │   │ tenants  │ │ users    │ │ products         │ │   │
│  │   │ branches │ │ roles    │ │ categories       │ │   │
│  │   │ orders   │ │ payments │ │ inventory        │ │   │
│  │   │ tables   │ │ receipts │ │ suppliers        │ │   │
│  │   └──────────┘ └──────────┘ └──────────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │   Redis (Sessions, Cache, Pub/Sub)                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Core Technology Decisions

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 15 + Tailwind CSS v4 | SSR/SSG, fast dev, excellent DX |
| **Backend** | Rust + tonic (gRPC) | Memory-safe, blazing fast, ideal for POS real-time |
| **Database** | Neon Postgres (v16) | Serverless Postgres + RLS, scalable, cloud-native |
| **Cache** | Redis 7 | Sessions, real-time pub/sub for order updates |
| **gRPC-Web** | Internal (tonic-web) | Integrated proxy, no standalone container needed |
| **ORM** | SQLx (Rust, compile-time checked) | Type-safe queries, no runtime overhead |
| **Auth** | JWT + Refresh Token | Stateless, scalable |
| **Infrastructure** | Zero-Docker (Native Binaries) | Cloud-native services (Neon, Upstash) |

### 1.3 Multi-Tenant Strategy

**Model:** Shared Database + Row-Level Security (RLS)

```sql
-- Every table has tenant_id
-- RLS enforces isolation at DB level
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**Flow:**
1. JWT contains `tenant_id` claim
2. Rust interceptor extracts `tenant_id` from gRPC metadata
3. Before each DB query: `SET LOCAL app.current_tenant_id = '{tenant_id}'`
4. PostgreSQL RLS automatically filters all queries

---

## 2. Database Schema (Core Tables)

### 2.1 Tenant & Auth Domain

```
tenants
├── id (uuid, PK)
├── name (varchar)
├── slug (varchar, unique) — subdomain identifier
├── plan (enum: free/starter/pro/enterprise)
├── settings (jsonb) — currency, timezone, locale
├── created_at / updated_at
└── is_active (bool)

users
├── id (uuid, PK)
├── tenant_id (uuid, FK → tenants)
├── email (varchar, unique per tenant)
├── password_hash (varchar)
├── full_name (varchar)
├── role (enum: owner/manager/cashier/waiter/chef)
├── branch_id (uuid, FK → branches, nullable)
├── avatar_url (varchar, nullable)
├── is_active (bool)
└── created_at / updated_at
```

### 2.2 Branch & Location Domain

```
branches
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── name (varchar)
├── address (text)
├── phone (varchar)
├── is_main (bool)
└── settings (jsonb) — receipt header/footer, tax config

floor_plans
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── branch_id (uuid, FK → branches)
├── name (varchar) — "Tang 1", "San vuon"
└── layout_data (jsonb) — grid/positions of tables

tables
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── branch_id (uuid, FK)
├── floor_plan_id (uuid, FK)
├── name (varchar) — "Ban 01"
├── capacity (int)
├── position_x / position_y (int) — for visual layout
├── status (enum: available/occupied/reserved/cleaning)
└── current_order_id (uuid, FK → orders, nullable)
```

### 2.3 Product & Menu Domain

```
categories
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── name (varchar)
├── parent_id (uuid, FK → categories, nullable) — nested categories
├── sort_order (int)
└── image_url (varchar, nullable)

products
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── category_id (uuid, FK)
├── sku (varchar)
├── name (varchar)
├── description (text)
├── price (decimal)
├── cost_price (decimal)
├── unit (varchar) — "phan", "ly", "kg"
├── image_url (varchar, nullable)
├── is_active (bool)
├── allow_topping (bool)
├── track_inventory (bool)
└── created_at / updated_at

toppings
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── name (varchar) — "Them tran chau", "Size L"
├── price (decimal)
└── is_active (bool)

product_toppings (M2M)
├── product_id (uuid, FK)
└── topping_id (uuid, FK)
```

### 2.4 Order & Payment Domain

```
orders
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── branch_id (uuid, FK)
├── table_id (uuid, FK, nullable) — null = takeaway
├── order_number (varchar) — auto-increment per branch per day
├── status (enum: draft/confirmed/preparing/served/completed/cancelled)
├── customer_name (varchar, nullable)
├── customer_phone (varchar, nullable)
├── subtotal (decimal)
├── discount_amount (decimal)
├── tax_amount (decimal)
├── total (decimal)
├── note (text, nullable)
├── created_by (uuid, FK → users)
├── created_at / updated_at
└── completed_at (timestamp, nullable)

order_items
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── order_id (uuid, FK)
├── product_id (uuid, FK)
├── product_name (varchar) — snapshot at order time
├── quantity (int)
├── unit_price (decimal)
├── subtotal (decimal)
├── note (text, nullable) — "it da", "khong hanh"
└── status (enum: pending/preparing/ready/served/cancelled)

order_item_toppings
├── id (uuid, PK)
├── order_item_id (uuid, FK)
├── topping_id (uuid, FK)
├── topping_name (varchar) — snapshot
├── price (decimal)
└── quantity (int)

payments
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── order_id (uuid, FK)
├── method (enum: cash/card/transfer/momo/zalopay)
├── amount (decimal)
├── received_amount (decimal) — for cash: how much customer gave
├── change_amount (decimal)
├── transaction_ref (varchar, nullable)
├── status (enum: pending/completed/refunded)
└── paid_at (timestamp)
```

### 2.5 Inventory Domain

```
inventory
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── branch_id (uuid, FK)
├── product_id (uuid, FK)
├── quantity (decimal)
├── min_quantity (decimal) — alert threshold
└── updated_at

inventory_transactions
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── branch_id (uuid, FK)
├── product_id (uuid, FK)
├── type (enum: sale/purchase/adjustment/transfer/return)
├── quantity_change (decimal) — negative = outgoing
├── reference_id (uuid) — order_id or purchase_order_id
├── note (text, nullable)
├── created_by (uuid, FK → users)
└── created_at
```

---

## 3. gRPC Service Definitions (Proto)

```
proto/
├── common.proto        — Shared types (Pagination, Timestamp, Money)
├── auth.proto          — Login, Register, RefreshToken, Logout
├── tenant.proto        — CreateTenant, GetTenant, UpdateSettings
├── user.proto          — CRUD users, ChangePassword, AssignRole
├── branch.proto        — CRUD branches
├── category.proto      — CRUD categories (nested)
├── product.proto       — CRUD products, toppings
├── table.proto         — CRUD tables, UpdateStatus, TransferTable
├── order.proto         — Create/Update/Cancel orders, AddItem, RemoveItem
├── payment.proto       — ProcessPayment, Refund
├── inventory.proto     — GetStock, AdjustStock, StockAlerts
└── report.proto        — RevenueSummary, TopProducts, SalesByPeriod
```

---

## 4. Sprint Breakdown (Step-by-Step Execution)

> **Rule: ONE sprint at a time. Each sprint is independently verifiable.**

### Phase 0: Foundation

| Sprint | Name | Description | Verify |
|--------|------|-------------|--------|
| **S00** | Project Scaffolding | Create monorepo structure, init Rust workspace + Next.js app | `cargo check` passes, `npm run dev` shows blank page | [x] |
| **S01** | Infrastructure | **Cloud-Only (Neon + Upstash)** | Zero-Docker environment verified | [x] |
| **S02** | Database Migrations | Core schema (tenants, users, branches) + RLS policies | `sqlx migrate run` succeeds, RLS test passes | [x] |
| **S03** | Proto Definitions | Define `common.proto`, `auth.proto`, `tenant.proto` | `cargo build` compiles proto stubs | [x] |

### Phase 1: Auth & Tenant

| Sprint | Name | Description | Verify | Status |
|--------|------|-------------|--------|--------|
| **S04** | Auth Service (Rust) | Login, Register (with Tenant creation), JWT, hashing | gRPC returns JWT + Tenant record created | [x] |
| **S05** | Tenant Middleware | gRPC interceptor: extract tenant_id, set RLS context | Multi-tenant queries isolated correctly | [x] |
| **S06** | Staff Management (BE) | CRUD staff, role/branch assignment (Backend logic) | Create staff → list staff works via gRPC | [x] |
| **S07** | Auth UI (Next.js) | Login page, registration page, auth context provider | Login flow works end-to-end in browser | [x] |
| **S07.1**| Staff Management UI | Dashboard: Staff list, Add/Edit/Delete staff modal | Admin can manage staff via UI | [x] |

### Phase 2: Product & Menu

| Sprint | Name | Description | Verify | Status |
|--------|------|-------------|--------|--------|
| **S08** | Category Service | CRUD categories with nested tree structure | Create parent → child categories works | [x] |
| **S09** | Product Service | CRUD products, images, toppings, pricing | Full product lifecycle via gRPC | [x] |
| **S10** | Product UI — Dashboard | Category tree + Product list + CRUD modals in admin panel | Admin can add/edit/delete products | [x] |
| **S11** | Menu Display | POS-optimized menu grid with category tabs | Menu renders beautifully with images | [x] |

### Phase 3: Table & Order (Core F&B)

| Sprint | Name | Description | Verify | Status |
|--------|------|-------------|--------|--------|
| **S12** | Table Service | CRUD tables, floor plan layout, status management | Tables CRUD + status change works | [x] |
| **S13** | Table Map UI | Visual floor plan with drag-drop table positioning | Interactive table map renders | [x] |
| **S14** | Order Service | Create order, add/remove items, toppings, status flow | Full order lifecycle via gRPC | [x] |
| **S15** | POS Order UI | Touchscreen-optimized order creation interface | Tap product → add to order → see total | [x] |
| **S16** | Kitchen Display | Real-time order queue for kitchen staff (WebSocket/SSE) | New order appears on kitchen screen | [>] |

### Phase 4: Payment & Checkout

| Sprint | Name | Description | Verify | Status |
|--------|------|-------------|--------|--------|
| **S17** | Payment Service | Process payment, calculate change, receipt data | Payment completes, order marked paid | [x] |
| **S18** | Payment UI | Cash/card/transfer selection, receipt preview | Complete checkout flow in browser | [x] |
| **S19** | Receipt Printing | Thermal printer integration (ESC/POS commands) | Receipt prints on thermal printer | [x] |

### Phase 5: Inventory & Reporting

| Sprint | Name | Description | Verify | Status |
|--------|------|-------------|--------|--------|
| **S20** | Inventory Service | Stock tracking, auto-deduct on sale, alerts | Sale reduces stock, alert at min level | [x] |
| **S21** | Inventory UI | Stock dashboard, adjustment form, transaction log | Admin views and adjusts stock | [x] |
| **S22** | Report Service | Revenue, top products, sales by period, export | Reports return correct aggregated data | [x] |
| **S23** | Report Dashboard UI | Charts (revenue, trends), filterable by date/branch | Beautiful charts render with real data | [x] |
| **S23.3**| Admin Inventory Fix | Fix dashboard link, real data seeding, remove mock data | Inventory shows real data, reachable from Sidebar | [x] |
| **S23.4**| Admin Orders | Orders management page, data seeding, real gRPC connect | Admin can see real orders from Dashboard Sidebar | [x] |

### Phase 7: Advanced F&B Inventory (BOM)

| Sprint | Name | Description | Verify | Status |
|--------|------|-------------|--------|--------|
| **S29** | Ingredient Management | CRUD for raw materials (Back-end) | Create/List ingredients via gRPC | [ ] |
| **S30** | Ingredient UI | Admin UI for managing raw materials | CRUD ingredients in dashboard | [ ] |
| **S31** | Recipe/BOM Service | Map Products to Ingredients + Quantities | Define recipes for products | [ ] |
| **S32** | Recipe/BOM UI | UI to manage product recipes | Admin can set formulas per item | [ ] |
| **S33** | Auto-Deduction Engine | Real-time ingredient deduction on Order completion | Stock levels update based on sales | [ ] |
| **S34** | Procurement & Alerts | Purchase orders for ingredients + low stock alerts | Purchase ingredients to refill stock | [ ] |

### Phase 6: Polish & Production

| Sprint | Name | Description | Verify | Status |
|--------|------|-------------|--------|--------|
| **S24** | Multi-branch | Branch switching, data scoping per branch | Switch branch → see different data | [ ] |
| **S25** | Settings & Customization | Store settings, receipt config, tax rates | Settings persist and affect behavior | [ ] |
| **S26** | Responsive & PWA | Mobile-responsive POS, offline queueing (service worker) | POS works on tablet, queues offline orders | [ ] |
| **S27** | E2E Testing | Playwright tests for critical flows | All tests green | [ ] |
| **S28** | Deployment Config | Dockerfile, docker-compose.prod, Nginx/Envoy config | `docker compose -f prod up` works | [ ] |

---

## 5. Directory Structure

```
kiosk-flow/
├── proto/                          # gRPC Protocol Buffer definitions
│   ├── common.proto
│   ├── auth.proto
│   ├── tenant.proto
│   ├── user.proto
│   ├── branch.proto
│   ├── category.proto
│   ├── product.proto
│   ├── table.proto
│   ├── order.proto
│   ├── payment.proto
│   ├── inventory.proto
│   └── report.proto
│
├── backend/                        # Rust workspace
│   ├── Cargo.toml                  # Workspace root
│   ├── migration/                  # SQLx migrations
│   │   ├── 001_create_tenants.sql
│   │   ├── 002_create_users.sql
│   │   └── ...
│   ├── crates/
│   │   ├── server/                 # Main binary — gRPC server
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       ├── main.rs
│   │   │       ├── config.rs
│   │   │       └── startup.rs
│   │   ├── services/               # Business logic crate
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       ├── auth/
│   │   │       ├── tenant/
│   │   │       ├── product/
│   │   │       ├── order/
│   │   │       ├── payment/
│   │   │       ├── inventory/
│   │   │       └── report/
│   │   ├── domain/                 # Domain models & validation
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   ├── infra/                  # DB, cache, external integrations
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       ├── db/
│   │   │       ├── cache/
│   │   │       └── middleware/
│   │   └── proto-gen/              # Auto-generated protobuf code
│   │       ├── Cargo.toml
│   │       └── build.rs
│   └── .env.example
│
├── frontend/                       # Next.js 15 application
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── src/
│   │   ├── app/                    # App Router
│   │   │   ├── (auth)/             # Auth pages (login, register)
│   │   │   ├── (dashboard)/        # Admin dashboard
│   │   │   │   ├── products/
│   │   │   │   ├── inventory/
│   │   │   │   ├── reports/
│   │   │   │   ├── settings/
│   │   │   │   └── staff/
│   │   │   ├── (pos)/              # POS interface
│   │   │   │   ├── order/
│   │   │   │   ├── tables/
│   │   │   │   └── checkout/
│   │   │   └── (kitchen)/          # Kitchen display
│   │   ├── components/
│   │   │   ├── ui/                 # Design system primitives
│   │   │   ├── forms/
│   │   │   ├── charts/
│   │   │   └── layout/
│   │   ├── lib/
│   │   │   ├── grpc/               # gRPC-Web client setup
│   │   │   ├── auth/               # Auth context, JWT handling
│   │   │   └── hooks/              # Custom React hooks
│   │   ├── styles/
│   │   │   └── globals.css         # Tailwind + custom design tokens
│   │   └── types/                  # TypeScript types (from proto)
│   └── public/
│
├── docker-compose.yml              # Dev: Postgres + Redis + Envoy
├── docker-compose.prod.yml         # Production
├── envoy.yaml                      # gRPC-Web proxy config
├── .env.example
└── README.md
```

---

## 6. UI/UX Design Direction

### 6.1 Design Language

| Aspect | Decision |
|--------|----------|
| **Theme** | Dark mode primary, Light mode secondary |
| **Colors** | Deep navy (#0F172A) + Electric blue (#3B82F6) + Warm amber accents (#F59E0B) |
| **Typography** | Inter (UI) + JetBrains Mono (numbers/prices) |
| **Radius** | 12px cards, 8px buttons, 16px modals |
| **Shadows** | Layered glassmorphism with subtle blur |
| **Animations** | Framer Motion — 200ms ease-out transitions |

### 6.2 Key Screens

1. **Login** — Minimal, centered card with gradient background
2. **Dashboard** — Revenue cards, trend charts, quick actions
3. **POS Order** — Split-screen: Menu grid (left) + Order summary (right)
4. **Table Map** — Visual floor plan with color-coded status
5. **Kitchen Display** — Card-based order queue with countdown timers
6. **Product Management** — Data table with inline editing
7. **Reports** — Interactive charts with date range filters

---

## 7. Next Step

> **Sprint S14: Order Service**
>
> Khi bạn sẵn sàng, hãy nói "Bắt đầu S14" và tôi sẽ thực hiện **chỉ sprint đó**.
> Mỗi sprint hoàn thành sẽ được đánh dấu `[x]` trong plan này.

---

## Status Tracker

| Sprint | Status | Date |
|--------|--------|------|
| S00 | `[x]` Completed | 2026-04-22 |
| S01 | `[x]` Completed | 2026-04-22 |
| S02 | `[x]` Completed | 2026-04-23 |
| S03 | `[x]` Completed | 2026-04-23 |
| S04 | `[x]` Completed | 2026-04-23 |
| S05 | `[x]` Completed | 2026-04-23 |
| S06 | `[x]` Completed | 2026-04-23 |
| S07 | `[x]` Completed | 2026-04-23 |
| S07.1| `[x]` Completed | 2026-04-23 |
| S08 | `[x]` Completed | 2026-04-24 |
| S09 | `[x]` Completed | 2026-04-24 |
| S10 | `[x]` Completed | 2026-04-24 |
| S11 | `[x]` Completed | 2026-04-24 |
| S12 | `[x]` Completed | 2026-04-24 |
| S13 | `[x]` Completed | 2026-04-24 |
| S14 | `[x]` Completed | 2026-04-24 |
| S15 | `[x]` Completed | 2026-04-24 |
| S16 | `[x]` Completed | 2026-04-24 |
| S17 | `[x]` Completed | 2026-04-24 |
| S18 | `[x]` Completed | 2026-04-24 |
| S19 | `[x]` Completed | 2026-04-25 |
| S20 | `[x]` Completed | 2026-04-25 |
| S21 | `[x]` Completed | 2026-04-25 |
| S22 | `[x]` Completed | 2026-04-25 |
| S23 | `[x]` Completed | 2026-04-25 |
| S23.1| `[x]` Modal Stacking Fix | 2026-05-10 |
| S23.2| `[x]` Transparency Policy (Status Badges) | 2026-05-10 |
| S23.3| `[x]` Completed | 2026-05-12 |
| S23.4| `[x]` Completed | 2026-05-12 |
| S24 | `[>]` In Progress | 2026-05-10 |
| S25 | `[ ]` Pending | — |
| S26 | `[ ]` Pending | — |
| S27 | `[ ]` Pending | — |
| S28 | `[ ]` Pending | — |
| S29 | `[ ]` Pending | — |
| S30 | `[ ]` Pending | — |
| S31 | `[ ]` Pending | — |
| S32 | `[ ]` Pending | — |
| S33 | `[ ]` Pending | — |
| S34 | `[ ]` Pending | — |
