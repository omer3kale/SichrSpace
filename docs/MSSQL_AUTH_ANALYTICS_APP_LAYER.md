# SichrPlace on MSSQL — App-Layer Auth + Realtime Plan

## Scope
This document defines how SichrPlace enforces auth/tenant boundaries and realtime behavior when running on SQL Server without Supabase RLS/realtime automation.

## 1) Authorization Rules (Backend-Enforced)
JWT includes at least: `userId`, `role`.

- Users profile
  - `GET/PUT /api/auth/profile`: allowed only when `subject.userId == targetUserId`.
  - Admin (`role=admin`) may read/update any user in admin endpoints only.
- Apartments
  - Create/update/delete only by apartment owner (`ownerId == subject.userId`) or admin.
  - Public listing endpoints expose only approved/public fields.
- Conversations/messages
  - Read conversation/messages only if user is participant.
  - Send/edit/delete messages only if sender is current user and business-window rules pass.
- Viewing requests
  - Tenant can manage own requests.
  - Landlord can manage requests for own apartments.
  - Admin can moderate/inspect according to admin service contracts.

Implementation pattern in service layer:
1. Load resource by id.
2. Compare ownership/participant ids to `subject.userId`.
3. Apply role overrides (`admin`) explicitly.
4. Throw `SecurityException`/domain error mapped by `GlobalExceptionHandler`.

## 2) Lockout / Auth Hardening Flow
Using `users.failed_login_attempts`, `users.locked_until`, and `users.password_changed_at`:

- On failed login
  - Increment `failed_login_attempts`.
  - If threshold reached (e.g., 5), set `locked_until = now + lockWindow`.
- On successful login
  - Reset `failed_login_attempts = 0`, clear `locked_until`.
- On password reset/change
  - Set `password_changed_at = now`.
  - Invalidate existing refresh tokens/session state at app layer.

## 3) Realtime Strategy (No Supabase Publication)
Pick one runtime pattern:

- Option A (direct): SignalR/WebSocket hub in backend.
- Option B (decoupled): broker-backed domain events (RabbitMQ/Kafka) then push to clients.

Recommended domain events emitted by services:
- `MessageSent`, `MessageEdited`, `MessageDeleted`
- `ViewingRequestCreated`, `ViewingRequestConfirmed`, `ViewingRequestDeclined`, `ViewingRequestCompleted`
- `NotificationCreated`, `NotificationRead`
- `ApartmentAnalyticsIncremented`

Emission point:
- Emit events after successful transaction commit in service/application layer (outbox pattern preferred for reliability).

## 4) Database Responsibility Split
- SQL Server: integrity constraints, indexes, trigger-based timestamps, analytics upsert procedure.
- Backend services: authorization, tenancy boundaries, and event publication.

## 5) Migration Artifact
Primary SQL template: [src/main/resources/db/migrations/MSSQL_SICHRPLACE_TEMPLATE.sql](../src/main/resources/db/migrations/MSSQL_SICHRPLACE_TEMPLATE.sql)

## 6) Transactions and Isolation (Deepening Sprint Findings)

Observed in `sichrplace_playground` (`is_read_committed_snapshot_on = 0`, `SNAPSHOT = OFF`):

- Session A kept an open transaction after updating `apartment_analytics.total_views` to `999`.
- Session B under `READ COMMITTED` hit lock timeout (`1222`) when reading same row.
- Session B under `READ UNCOMMITTED` read dirty value `999` before rollback.

Recommended defaults:

- Auth and core identity workflows (`users`, login/lockout/reset):
  - Keep `READ COMMITTED` (or stricter only for critical transitions).
  - Avoid `READ UNCOMMITTED`.
- Core transactional CRUD (ownership-sensitive updates):
  - `READ COMMITTED` + explicit transactions in service layer.
  - Use optimistic locking/version checks at app level where needed.
- Analytics/reporting:
  - Prefer `READ COMMITTED`; optionally use snapshot-based reads if DB enables RCSI/SNAPSHOT.
  - Avoid dirty reads unless explicitly acceptable for ephemeral dashboards.

## 7) Default Index Patterns

Auth/user lookups:
- `users(email)` for login lookup.
- `users(role)` for admin list/filter.
- `users(email_verified)` for verification flows.
- `users(created_at)` for timeline/admin ordering.
- Filtered unique index for username: `UX_users_username_not_null`.

Analytics:
- PK on `apartment_analytics(apartment_id, date)` for point upserts.
- Reporting index for range scans: `IX_apartment_analytics_date_apartment(date, apartment_id)`
  with `INCLUDE (total_views, total_likes, viewing_requests, updated_at)`.
- Requests timeline index: `viewing_requests(apartment_id, created_at)`.

## 8) Views/Procedures vs ORM Queries

Use stored procedures when:
- You need atomic upsert/counter behavior (`increment_apartment_views`).
- You want a stable contract for high-write operations independent of ORM SQL generation.

Use views when:
- Reusing complex report joins/aggregations across dashboards and admin tooling.
- You need a shared read model consumed by SQL clients and backend.

Use pure ORM/service queries when:
- Endpoint logic is domain-rich and authorization-sensitive per request.
- Query shape is simple and better maintained in repository/service code.

Operational rule:
- Authorization decisions remain in backend services (JWT `userId`/`role`), not in DB policies.

## 9) SichrPlace Mini MSSQL Backend Includes

This mini slice is designed to be reusable as a blueprint for domain expansion.

### A) Apartments
- DB layer
  - `apartments` with FK `landlord_id -> users.id`.
  - Status integrity via `CK_apartments_status`.
  - Query performance index: `IX_apartments_landlord_status_city`.
  - Update timestamp trigger: `trg_apartments_update_timestamp`.
- Java service layer
  - Owner/admin authorization for mutate operations.
  - Search/list filtering, DTO shaping, pagination contracts.

### B) Viewing Requests
- DB layer
  - `viewing_requests` linked to both apartment and tenant via FK.
  - Status integrity via `CK_viewing_requests_status`.
  - Timeline/index support: `IX_viewing_requests_apartment_tenant_status`.
  - Write contract: `sp_CreateViewingRequest` validates apartment/tenant and creates pending request.
- Java service layer
  - Tenant-only create/update/cancel for own requests.
  - Landlord-only confirm/reject for requests on owned apartments.
  - Domain transitions (e.g., pending -> confirmed/completed/cancelled) and policy checks.

### C) Conversations
- DB layer
  - `conversations` ties `apartment`, `landlord`, `tenant` with FK constraints.
  - Composite index for participant lookup: `IX_conversations_landlord_tenant_apartment`.
  - Update timestamp trigger: `trg_conversations_update_timestamp`.
- Java service layer
  - Conversation creation rules (e.g., require apartment + valid participants).
  - Participant authorization checks for read/list endpoints.

### D) Messages
- DB layer
  - `messages` with FK to `conversations` and `users`.
  - Ordered retrieval index: `IX_messages_conversation_created_at`.
  - Read contract: `sp_GetConversationWithMessages` returns conversation header + ordered messages.
- Java service layer
  - Only participant send/read rules.
  - Message-level moderation, edit/delete windows, notification dispatch.

### E) Analytics Read Model
- DB layer
  - `ApartmentPerformanceSummary` view for 30-day KPI aggregation.
  - `increment_apartment_views` procedure for atomic counter updates.
- Java service layer
  - Decide endpoint exposure (public/admin/internal).
  - Keep authorization and tenancy filtering outside SQL view/procedure definitions.

### F) Reusable Base Pattern
When adding the next domain (favorites, notifications, payments), keep this split:
1. DB: FKs/checks/indexes + optional high-value proc/view read-write contracts.
2. Service: auth/ownership/participant checks + transition rules + API-level errors.
3. Events: publish domain events after commit for realtime delivery.

## 10) New Project Setup

- [ ] Create database.
  - Success looks like: target DB is listed in `sys.databases` and accepts `USE <db_name>;` without error.
- [ ] Apply `MSSQL_SICHRPLACE_TEMPLATE.sql`.
  - Success looks like: core auth/analytics objects exist (`users`, trigger, username UDF, analytics tables, `increment_apartment_views`).
- [ ] Apply `V008__sichrplace_mini_backend.sql` (and any later migrations).
  - Success looks like: relational mini-backend tables/FKs/indexes/procs/views are created (`apartments`, `viewing_requests`, `conversations`, `messages`, `sp_CreateViewingRequest`, `sp_GetConversationWithMessages`, `ApartmentPerformanceSummary`).
- [ ] Run smoke test from [docs/SQL_MSSQL_FEATURES_SHOWCASE.md](SQL_MSSQL_FEATURES_SHOWCASE.md).
  - Success looks like: top-5 table snapshots return rows, create-viewing proc inserts one pending row, conversation proc returns 2 result sets.
- [ ] Run `sqlcmd` smoke test (local/CI) and verify exit code `0`.
  - Success looks like: command completes with no SQL errors (`-b` enabled) and pipeline/local shell reports success.
- [ ] Confirm CI job `mssql-verify` is green in [\.github/workflows/deploy-backend.yml](../.github/workflows/deploy-backend.yml).
  - Success looks like: CI creates `sichrplace_ci`, applies migrations, seeds mini data, runs `db/mssql/smoke_test.sql`, and exits successfully.

## 11) 15-Minute Rebuild Plan

For a fresh MSSQL instance, run this sequence:
1. Create and switch DB.
   - `CREATE DATABASE <db_name>;`
   - `USE <db_name>;`
2. Apply migration files in order.
   - `src/main/resources/db/migrations/MSSQL_SICHRPLACE_TEMPLATE.sql`
   - `src/main/resources/db/migrations/V008__sichrplace_mini_backend.sql`
   - then any newer versioned migrations.
3. Insert minimal seed rows (at least one landlord, one tenant, one available apartment, one conversation, one message).
4. Execute the smoke-test block from [docs/SQL_MSSQL_FEATURES_SHOWCASE.md](SQL_MSSQL_FEATURES_SHOWCASE.md).
5. Verify proc contracts.
   - `sp_CreateViewingRequest` returns inserted row.
   - `sp_GetConversationWithMessages` returns conversation + ordered messages and enforces participant authorization.
6. Run non-interactive smoke test command and check exit code.
  - Example: `SQLCMD.EXE -S <server> -d <db_name> -E -C -b -i db/mssql/smoke_test.sql`
