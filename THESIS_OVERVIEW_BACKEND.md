# SichrPlace — Thesis Overview (Backend)

> **Author:** Ömer Kale  
> **Programme:** MSc Software Engineering, RWTH Aachen University  
> **Supervisor:** *(to be confirmed)*  
> **Last updated:** February 2026

---

## 1  Problem & Context

Finding affordable student housing in Aachen is a recurring problem every
semester.  Students rely on fragmented channels — WG-Gesucht, Facebook groups,
WhatsApp chains — none of which integrate landlord verification, in-app
messaging, or structured viewing-request workflows.

**SichrPlace** is a full-stack web platform that consolidates apartment search,
tenant ↔ landlord communication, and review moderation into a single
application.  The backend is the core of this thesis: a production-grade
REST API that demonstrates modern Java/Spring Boot engineering practices in a
university teaching context.

### Thesis contribution

| Dimension | Contribution |
|-----------|-------------|
| **Software Engineering** | 55-endpoint REST API, role-based access, JWT auth, stateful workflows (viewing requests, review moderation) |
| **Teaching** | Reusable tutorium labs (3 sessions, 9 exercises), student extension tracks, ERD/sequence/state diagrams |
| **DevOps** | Reproducible environments (local ↔ beta ↔ prod), Docker Compose, CI/CD via GitHub Actions → GHCR → DigitalOcean |
| **Database** | Dual-database support (PostgreSQL + MSSQL 2025) via JPA abstraction; idempotent seed data for both |

---

## 2  Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Internet / Browser                      │
└─────────────────────────┬──────────────────────────────────┘
                          │ HTTPS (443)
                ┌─────────▼──────────┐
                │   Caddy (reverse   │   auto-TLS, /api/* → :8080
                │   proxy)           │
                └─────────┬──────────┘
                          │ HTTP (8080)
        ┌─────────────────▼─────────────────────┐
        │          Spring Boot 3.2.2             │
        │  ┌────────────┐  ┌─────────────────┐  │
        │  │ Controllers │→│   Services       │  │
        │  │ (9 REST)    │  │ (business logic)│  │
        │  └────────────┘  └───────┬─────────┘  │
        │                          │             │
        │  ┌───────────────────────▼──────────┐  │
        │  │ Spring Data JPA / Hibernate      │  │
        │  │ Repositories (9 interfaces)      │  │
        │  └───────────────┬──────────────────┘  │
        └──────────────────┼─────────────────────┘
                           │ JDBC
           ┌───────────────▼───────────────┐
           │   PostgreSQL 16 (prod)        │
           │   — OR —                      │
           │   MSSQL 2025 Developer (beta) │
           └───────────────────────────────┘
```

### Key layers

| Layer | Responsibility | Key classes |
|-------|---------------|-------------|
| **Controller** | REST endpoints, request validation, auth checks | `UserController`, `ApartmentController`, `ConversationController`, `ListingController`, `FavoriteController`, `ReviewController`, `ViewingRequestController`, `NotificationController`, `AdminController` |
| **Service** | Business logic, state transitions, DTO mapping | `UserService`, `ApartmentService`, `ConversationService`, … |
| **Repository** | Data access (JPQL + Spring Data derived queries) | `UserRepository`, `ApartmentRepository`, `MessageRepository`, … |
| **Security** | JWT generation/validation, role-based access | `JwtTokenProvider`, `JwtAuthenticationFilter`, `SecurityConfig` |
| **Config** | DataSeeder, CORS, Swagger/OpenAPI | `DataSeeder`, `WebConfig`, `SwaggerConfig` |

### Request flow

See [`docs/diagrams/arch_request_flow.png`](docs/diagrams/arch_request_flow.png)
for a visual representation of `HTTP request → Controller → Service → Repository → Database → Response`.

---

## 3  Environments

SichrPlace runs in **four environments**, selected via Spring profiles:

| Profile | Database | Host | Purpose |
|---------|----------|------|---------|
| `local` | PostgreSQL (Docker) | `localhost:5432` | Local dev, default |
| `local-mssql` | MSSQL 2025 (Docker) | `localhost:1433` | Local MSSQL dev, tutorium labs |
| `beta-mssql` | MSSQL 2025 (Docker) | `206.189.53.163:1433` | Shared beta on DigitalOcean droplet |
| `prod` | PostgreSQL (managed) | Cloud | Production |

All environments share the **same JAR** — only the active Spring profile
changes.  This is possible because:

1. JPA entities use standard annotations (`@Entity`, `@Column`) — no database-specific SQL.
2. Hibernate auto-detects the dialect from the JDBC URL (`SQLServerDialect` vs `PostgreSQLDialect`).
3. `DataSeeder.java` uses the repository layer, not raw SQL.

**Docker Compose files:**

| File | Environment |
|------|-------------|
| `docker-compose.yml` | Production (PostgreSQL) |
| `docker-compose.local-mssql.yml` | Local MSSQL development |
| `docker-compose.mssql.yml` | Beta MSSQL on droplet |

---

## 4  Data Model

### Entity–Relationship Overview

| Entity | Table | Key relationships |
|--------|-------|-------------------|
| `User` | `users` | Central entity: owner of apartments, sender/receiver of messages, reviewer |
| `Apartment` | `apartments` | Belongs to a `User` (owner) |
| `Listing` | `listings` | Extends `Apartment` with listing-specific metadata |
| `Conversation` | `conversations` | Links two `User`s about one `Apartment` |
| `Message` | `messages` | Belongs to `Conversation`, sent by a `User` |
| `ViewingRequest` | `viewing_requests` | `TENANT` requests viewing of `Apartment` owned by `LANDLORD` |
| `ApartmentReview` | `apartment_reviews` | `TENANT` reviews an `Apartment` — moderated by `ADMIN` |
| `UserFavorite` | `user_favorites` | `User` bookmarks an `Apartment` |
| `Notification` | `notifications` | Cross-cutting: created by side-effects (new message, viewing confirmed, …) |

**Full ERD:** [`docs/diagrams/erd_sichrplace.png`](docs/diagrams/erd_sichrplace.png)

### Schema metrics

| Metric | Count |
|--------|-------|
| Tables | 9 |
| Columns (total) | 123 |
| Indexes | 41 |
| Constraints (FK + unique + check) | 26 |

---

## 5  API Surface

The backend exposes **55 REST endpoints** across 9 controllers.

| Controller | Endpoints | Auth |
|------------|-----------|------|
| `UserController` | 11 | Mixed (public registration, JWT-protected profile) |
| `ApartmentController` | 8 | JWT (create/update), public (search/list) |
| `ListingController` | 6 | JWT |
| `ConversationController` | 7 | JWT |
| `FavoriteController` | 4 | JWT |
| `ReviewController` | 8 | JWT (submit), ADMIN (moderate) |
| `ViewingRequestController` | 7 | JWT, role-restricted |
| `NotificationController` | 5 | JWT |
| `AdminController` | 6 | ADMIN only |

**Full endpoint reference:** [`docs/API_ENDPOINTS_BACKEND.md`](docs/API_ENDPOINTS_BACKEND.md)

---

## 6  Seed Data & Teaching Labs

### Seed data

`DataSeeder.java` runs automatically when the database is empty on MSSQL
profiles (`beta-mssql`, `local-mssql`).  It creates **43 rows** across all
9 tables — enough to demonstrate every workflow without overwhelming students.

| Table | Rows | Purpose |
|-------|------|---------|
| `users` | 6 | ADMIN, 2 LANDLORDs, 3 TENANTs |
| `apartments` | 4 | Ponttor, Lousberg, WG-Zimmer, Mitte |
| `listings` | 2 | Active listings for apartments #1 and #3 |
| `conversations` | 3 | Cross-role messaging (tenant ↔ landlord) |
| `messages` | 12 | Realistic German-language apartment inquiry threads |
| `viewing_requests` | 3 | CONFIRMED, PENDING, PENDING |
| `apartment_reviews` | 3 | 2 APPROVED, 1 PENDING (for moderation exercise) |
| `user_favorites` | 5 | 3 students, various apartments |
| `notifications` | 5 | Side-effect notifications |

**Seed documentation:** [`docs/SEED_WORKPLACE_MSSQL.md`](docs/SEED_WORKPLACE_MSSQL.md)

### Teaching labs

A **3-session tutorium lab** guides students through the API and data model:

| Session | Focus | Exercises |
|---------|-------|-----------|
| **Lab 1** | Setup, ERD mapping, role-based access | 1.1 Map ERD to API calls, 1.2 Role-based access matrix |
| **Lab 2** | Messaging, viewing requests, reviews | 2.1 Conversation flow, 2.2 State machine verification, 2.3 Review moderation |
| **Lab 3** | Extend the backend | 3.1 New endpoint, 3.2 New seed data, 3.3 Schema evolution |

**Lab guide:** [`docs/TUTORIUM_LAB_WORKPLACE.md`](docs/TUTORIUM_LAB_WORKPLACE.md)

### Student extension tracks

Three structured mini-projects allow students to extend the platform
beyond the base labs:

| Track | Theme | Difficulty |
|-------|-------|-----------|
| **A** | Analytics & Reporting | ★★☆ Intermediate |
| **B** | Soft-delete & State Transitions | ★★★ Advanced |
| **C** | Search & Filtering Enhancements | ★★☆ Intermediate |

**Extension guide:** [`docs/STUDENT_EXTENSION_TRACKS.md`](docs/STUDENT_EXTENSION_TRACKS.md)

---

## 7  Why MSSQL 2025 for the Beta Environment?

The decision to deploy MSSQL 2025 Developer Edition alongside the existing
PostgreSQL production database was deliberate and serves multiple purposes:

### 7.1  Academic rationale

| Reason | Explanation |
|--------|-------------|
| **Curriculum alignment** | RWTH SE courses teach relational databases using MSSQL + SSMS. Students work with a familiar stack. |
| **JPA portability proof** | Running the *same* Spring Boot JAR against two different RDBMSs demonstrates that JPA is truly database-agnostic — no code changes needed. |
| **Real-world scenario** | Enterprise environments often maintain multiple database engines. Students see how Spring profiles isolate configuration from code. |

### 7.2  Technical justification

| Aspect | MSSQL 2025 benefit |
|--------|-------------------|
| **Docker support** | Official `mcr.microsoft.com/mssql/server:2025-latest` image, ARM64 + AMD64 |
| **Tooling** | SSMS (Windows), Azure Data Studio (cross-platform) — students already have these installed |
| **Feature parity** | `DATETIME2`, `VARCHAR(MAX)`, `DECIMAL(10,2)` map 1:1 from JPA `@Column` annotations |
| **Licensing** | Developer Edition is free for non-production use — perfect for university labs |

### 7.3  Practical validation

The identical seed data (43 rows) was verified on both engines:

```
Local MSSQL (localhost:1433)  →  9 tables, 123 columns, 41 indexes, 26 constraints
Beta  MSSQL (droplet:1433)   →  9 tables, 123 columns, 41 indexes, 26 constraints
──── Zero discrepancies ────
```

Every API endpoint (55/55) returns identical responses regardless of the
underlying database.  This was validated by logging in as each seed user and
exercising all five use cases on both environments.

### 7.4  What stays on PostgreSQL

PostgreSQL remains the **production** database for:
- Managed hosting options (DigitalOcean Managed DB, Supabase, AWS RDS)
- JSON/JSONB columns if needed in future
- PostGIS for potential geo-search features

MSSQL is intentionally scoped to **development and teaching** environments.

---

## 8  Migration Versioning

Schema evolution is tracked via versioned migration scripts in
[`db/migrations/`](db/migrations/):

| Version | Script | Description |
|---------|--------|-------------|
| **V001** | `V001__initial_schema_mssql.sql` | Baseline — documents the 9-table schema as created by Hibernate `ddl-auto=update` |
| **V002** | `V002__seed_workplace_mssql.sql` | Seed data — wraps the DataSeeder output as a reproducible SQL script |

All scripts are **idempotent** (use `IF NOT EXISTS` guards) and
**MSSQL-compatible** (`DATETIME2`, `VARCHAR(MAX)`, `GO` batch separators).

**Migration process:** [`docs/SEED_WORKPLACE_MSSQL.md`](docs/SEED_WORKPLACE_MSSQL.md) → Schema Evolution section

---

## 9  Diagrams

All diagrams are maintained as Mermaid source (`.md`) with pre-rendered `.png`
exports in [`docs/diagrams/`](docs/diagrams/):

| Diagram | Source | Rendered |
|---------|--------|----------|
| **Entity–Relationship Diagram** | [`erd_sichrplace.md`](docs/diagrams/erd_sichrplace.md) | [`erd_sichrplace.png`](docs/diagrams/erd_sichrplace.png) |
| **State Charts** (Message, ViewingRequest, Review) | [`state_charts.md`](docs/diagrams/state_charts.md) | [`state_message_lifecycle.png`](docs/diagrams/state_message_lifecycle.png) |
| **Sequence Diagrams** (Send Message) | [`sequence_diagrams.md`](docs/diagrams/sequence_diagrams.md) | [`sequence_send_message.png`](docs/diagrams/sequence_send_message.png) |
| **Architecture Request Flow** | [`architecture_flow.md`](docs/diagrams/architecture_flow.md) | [`arch_request_flow.png`](docs/diagrams/arch_request_flow.png) |

---

## 10  Frontend Integration

The SichrPlace frontend is a **Vanilla JS (ES6+)** multi-page application
originally built against Supabase (managed PostgreSQL). It is hosted at
[`github.com/omer3kale/sichrplace`](https://github.com/omer3kale/sichrplace)
and deployed on Netlify.

The frontend's API configuration
([`frontend/js/config.js`](https://github.com/omer3kale/sichrplace/blob/main/frontend/js/config.js))
already resolves to `http://localhost:8080` in development and
`https://api.sichrplace.com` in production — both of which are served by the
Spring Boot backend. This means the existing frontend can call the Spring Boot
REST API **without code changes** for the core flows (login, apartments,
favorites, messaging, viewing requests).

### Full-stack architecture at a glance

```
┌──────────────────────┐     HTTPS      ┌──────────────────┐
│  Browser             │ ◄────────────► │  Caddy (TLS)     │
│  Vanilla JS / HTML   │                │  api.sichrplace  │
│  (Netlify or local)  │                │  .com            │
└──────────────────────┘                └────────┬─────────┘
                                                 │ :8080
                                        ┌────────▼─────────┐
                                        │  Spring Boot     │
                                        │  3.2.2 (Java 21) │
                                        │  55 endpoints    │
                                        └────────┬─────────┘
                                                 │ JDBC
                                        ┌────────▼─────────┐
                                        │  MSSQL 2025      │
                                        │  (or PostgreSQL) │
                                        └──────────────────┘
```

### Bridge documentation

| Document | Purpose |
|----------|--------|
| [`docs/FULLSTACK_GOLDEN_PATH.md`](docs/FULLSTACK_GOLDEN_PATH.md) | Traces one action (favorite an apartment) from browser click to MSSQL row |
| [`docs/FULLSTACK_LAB_EXERCISES.md`](docs/FULLSTACK_LAB_EXERCISES.md) | 3 student exercises: trace favorites, trace messaging, extend the API |
| [`docs/BACKEND_VARIANTS.md`](https://github.com/omer3kale/sichrplace/blob/main/docs/BACKEND_VARIANTS.md) | Frontend-side guide: how to point at local-mssql vs beta-mssql backend |

### What examiners should know

The thesis demonstrates that a **single Spring Boot JAR** replaces the
combination of Node.js/Express + 107 Netlify Functions + Supabase that the
original frontend relied on — while keeping the same REST contract. The
frontend HTML/JS files remain unchanged; only the backend and database
layer are swapped. This validates the **JPA portability thesis**: the same
business logic runs on PostgreSQL (production) and MSSQL 2025 (teaching).

---

## 11  Future Work

The following extensions are planned or proposed for continuation:

1. **Deeper frontend integration** — Migrate the Vanilla JS frontend to
   a modern framework (Vue 3 / React) with Vite, consuming `.env` files
   for backend URL configuration.
2. **Real-time messaging** — Replace polling with WebSocket (STOMP over
   SockJS) for instant message delivery.
3. **Geo-search** — Add coordinates to `Apartment` and implement
   distance-based search (PostGIS on prod, spatial queries on MSSQL).
4. **CI test suite** — Expand beyond smoke tests: integration tests
   with Testcontainers (MSSQL + PostgreSQL) in GitHub Actions.
5. **Flyway adoption** — Replace manual migration scripts with
   Flyway-managed migrations for automatic version tracking.

---

## 12  Profile-Specific Smoke Tests

The test class [`MssqlProfileSmokeTest.java`](src/test/java/com/sichrplace/backend/MssqlProfileSmokeTest.java)
validates the application in CI without requiring a real MSSQL instance.

| Test | What it verifies |
|------|-----------------|
| `contextLoads` | All 9 repositories wire correctly; full Spring context starts |
| `repositoryCountWorks` | `count()` executes against all 9 tables |
| `tablesExistAndAreQueryable` | `findAll()` returns empty lists (schema is valid) |
| `userFindByEmail` | Custom `@Query` method compiles and runs |
| `userExistsByEmail` | Derived query method works |
| `apartmentFindByOwner` | FK-based query executes without error |

**Profile:** `test` (configured in [`src/test/resources/application-test.yml`](src/test/resources/application-test.yml))
uses H2 in-memory — no Docker or MSSQL required.

**Run locally:**

```bash
./gradlew test
```

**CI integration:** The tests run automatically via `./gradlew test` in the
GitHub Actions workflow.

---

## 13  Debugging and Observability

### Startup logging

`StartupInfoLogger.java` runs at startup and prints:

```
═══════════════════════════════════════════════════════
  SichrPlace Backend — Startup Info
───────────────────────────────────────────────────────
  Profiles:    [local-mssql]
  Database:    jdbc:sqlserver://localhost:1433;databaseName=sichrplace;encrypt=false
  DB User:     sichrplace_user
  DDL-Auto:    update
  Dialect:     org.hibernate.dialect.SQLServerDialect
  Pool:        SichrPlace-MSSQL-Local
═══════════════════════════════════════════════════════
  MSSQL profile active — DataSeeder will run if database is empty.
```

This immediately tells you which profile, database, and pool are active —
without revealing passwords.

### Where logs live in Docker

| Container | Command |
|-----------|---------|
| **API (Spring Boot)** | `docker logs sichrplace-api-1 --tail 100` |
| **MSSQL** | `docker logs sichrplace-database-1 --tail 50` |
| **Caddy** | `docker logs sichrplace-caddy-1 --tail 50` |
| **Follow live** | `docker logs -f sichrplace-api-1` |

### Useful log levels to adjust for teaching

| Logger | Level | Effect |
|--------|-------|--------|
| `org.hibernate.SQL` | `DEBUG` | Prints every SQL statement |
| `org.hibernate.type.descriptor.sql.BasicBinder` | `TRACE` | Shows bound parameter values |
| `com.sichrplace.backend` | `DEBUG` | Application-level debug logs |
| `org.springframework.web` | `DEBUG` | Incoming HTTP request details |
| `com.zaxxer.hikari` | `DEBUG` | Connection pool lifecycle |

Set these in the profile YAML under `logging.level`:

```yaml
logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

### Common error patterns

| Log pattern | Meaning | Fix |
|------------|---------|-----|
| `SQLServerException: Connection reset` | MSSQL container restarted or OOM | `docker compose restart database api` |
| `HikariPool-1 - Connection is not available` | Pool exhausted | Check for leaked connections; increase `maximum-pool-size` |
| `ExpiredJwtException` | JWT token expired | Re-login to get fresh token |
| `AccessDeniedException` | Role doesn't match `@PreAuthorize` | Verify user role in seed data |

---

## 14  Doc / Behavior Consistency Checklist

These claims have been verified against the running MSSQL beta and local instances.
Check them after any schema or seed change.

- [x] **6 seed users** — `SELECT COUNT(*) FROM users` returns 6
- [x] **4 apartments** — `SELECT COUNT(*) FROM apartments` returns 4
- [x] **12 messages across 3 conversations** — counts match SEED_WORKPLACE_MSSQL.md
- [x] **55 endpoints** — `API_ENDPOINTS_BACKEND.md` quick reference table lists 55 rows
- [x] **9 tables, 123 columns, 41 indexes, 26 constraints** — schema metrics in §4 match live DB
- [x] **ViewingRequest states: PENDING/CONFIRMED/DECLINED/COMPLETED/CANCELLED** — matches `ViewingRequest.ViewingStatus` enum
- [x] **Review states: PENDING/APPROVED/REJECTED** — matches `ApartmentReview.ReviewStatus` enum
- [x] **charlie.student@rwth-aachen.de login returns JWT** — HTTP 200 on both local and beta
- [x] **DataSeeder is idempotent** — re-running on seeded DB skips insertion (checks `userRepository.count() > 0`)
- [x] **Extension Track B references soft-delete** — `STUDENT_EXTENSION_TRACKS.md` Track B requires `deletedAt`/`deletedBy` columns (not yet in base schema — correct, it's an extension)

---

## 15  Release Notes — v1.0.0-mssql-workplace

**Tag:** `v1.0.0-mssql-workplace`
**Date:** February 2026

This tag marks the **thesis-submission baseline** — a fully documented,
tested, and reproducible MSSQL workplace for teaching and review.

### What's included

| Category | Deliverable |
|----------|-------------|
| **Schema** | 9 JPA entities → 9 tables, 123 columns, 41 indexes, 26 constraints |
| **Seed data** | 43 rows via `DataSeeder.java` (idempotent, profile-gated) |
| **Endpoints** | 55 REST endpoints across 9 controllers |
| **Profiles** | `local`, `local-mssql`, `beta-mssql`, `prod` |
| **Migrations** | `V001__initial_schema_mssql.sql`, `V002__seed_workplace_mssql.sql` |
| **Tests** | 6 smoke tests (H2 in-memory, CI-safe) |
| **Docs** | Thesis overview, API reference, tutorium lab (3 sessions), extension tracks (3 tracks), seed guide, demo script |
| **Diagrams** | ERD, state charts, sequence diagram, architecture flow |
| **Infra** | Docker Compose for local + beta MSSQL, Caddy reverse proxy, GitHub Actions CI/CD |

### What's guaranteed

- Application context loads and all repositories are functional (smoke tests green).
- Same JAR runs on PostgreSQL and MSSQL 2025 with zero code changes.
- Seed data is identical on local and beta (verified row counts).
- All 55 endpoints respond correctly against seeded MSSQL.
- Documentation matches actual behavior (consistency checklist verified).

### Starting from this baseline

Students and future cohorts can clone at this tag:

```bash
git clone --branch v1.0.0-mssql-workplace https://github.com/omer3kale/sichrplace-backend.git
```

Then follow [`docs/ENV_SETUP_GUIDE.MD`](docs/ENV_SETUP_GUIDE.MD) to set up
their local MSSQL environment in under 10 minutes.

---

## References

| Resource | Path |
|----------|------|
| API endpoint reference | [`docs/API_ENDPOINTS_BACKEND.md`](docs/API_ENDPOINTS_BACKEND.md) |
| Seed data documentation | [`docs/SEED_WORKPLACE_MSSQL.md`](docs/SEED_WORKPLACE_MSSQL.md) |
| Tutorium lab guide | [`docs/TUTORIUM_LAB_WORKPLACE.md`](docs/TUTORIUM_LAB_WORKPLACE.md) |
| Student extension tracks | [`docs/STUDENT_EXTENSION_TRACKS.md`](docs/STUDENT_EXTENSION_TRACKS.md) |
| Migration conventions | [`db/migrations/README.md`](db/migrations/README.md) |
| Environment setup | [`docs/ENV_SETUP_GUIDE.MD`](docs/ENV_SETUP_GUIDE.MD) |
| Diagrams (Mermaid sources) | [`docs/diagrams/`](docs/diagrams/) |
| Demo script (live demo) | [`DEMO_SCRIPT_BACKEND.md`](DEMO_SCRIPT_BACKEND.md) |
| Full-stack golden path | [`docs/FULLSTACK_GOLDEN_PATH.md`](docs/FULLSTACK_GOLDEN_PATH.md) |
| Full-stack lab exercises | [`docs/FULLSTACK_LAB_EXERCISES.md`](docs/FULLSTACK_LAB_EXERCISES.md) |
| Frontend repo | [`github.com/omer3kale/sichrplace`](https://github.com/omer3kale/sichrplace) |
| Frontend backend variants | [`docs/BACKEND_VARIANTS.md`](https://github.com/omer3kale/sichrplace/blob/main/docs/BACKEND_VARIANTS.md) |
| Smoke tests | [`src/test/java/com/sichrplace/backend/MssqlProfileSmokeTest.java`](src/test/java/com/sichrplace/backend/MssqlProfileSmokeTest.java) |
| Test profile | [`src/test/resources/application-test.yml`](src/test/resources/application-test.yml) |
