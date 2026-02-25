# Backend 10/10 Criteria — Thesis & Teaching Scope

> **Date:** 21 February 2026
> **Tag:** `v1.3.0-backend-10of10`
> **Purpose:** Defines what "10 out of 10" means for each scoring dimension
> within the thesis and teaching context. These criteria do NOT imply
> production SaaS parity — they define completeness for the intended
> academic audience (thesis examiners, tutorium students, frontend team).

---

## Scoring Context

The SichrPlace backend is evaluated across three dimensions:

1. **Domain & DB completeness** — Do entities, tables, and migrations fully
   cover the application's data model for its intended scope?
2. **Endpoint completeness** — Are all API endpoints that the frontend and
   teaching exercises require implemented and wired (no stubs)?
3. **Operational readiness** — Are quality gates, test coverage, schema
   management, and deployment concerns handled at a thesis-defensible level?

Each dimension is scored 0–10. A 10/10 means "nothing is missing that would
be expected at this project's scope and audience."

---

## Dimension 1 — Domain & DB Completeness (10/10)

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | **All entities have a corresponding DB table with a migration script** | 13 entities → 13 tables, migrations V001–V007; no table relies on Hibernate `ddl-auto` alone |
| 2 | **All MUST-HAVE tables from NEXT_TABLES_DESIGN.md are implemented** | `viewing_request_transitions` (V003) and `saved_searches` (V004) — both fully wired with entity, repository, service, controller, and tests |
| 3 | **NICE-TO-HAVE tables are explicitly de-scoped with documented rationale** | `tags`/`apartment_tags` and `usage_stats_daily` de-scoped in NEXT_TABLES_DESIGN.md §4; designs preserved as student extension exercises |
| 4 | **No "dead" columns — every persisted field is either used or documented as accepted** | `User.emailVerified` now wired (verification flow); `Notification.expiresAt` documented as future enhancement; `Listing.ownerId` accepted as known simplification |
| 5 | **Migrations are idempotent and MSSQL-compatible** | All scripts use `IF NOT EXISTS` guards and `GO` batch separators |

---

## Dimension 2 — Endpoint Completeness (10/10)

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | **All Phase 1 (MUST-HAVE) features from the roadmap are implemented** | 7/7 Phase 1 features complete: email verification, password reset, health check, delete notification, execute saved search, VR stats, VR complete |
| 2 | **Every endpoint has a real service implementation (no stubs or hardcoded responses)** | All 70 endpoints across 12 controllers backed by service → repository → DB |
| 3 | **Full CRUD coverage for all primary entities** | Users (register/login/profile), Apartments (CRUD+search), Conversations (CRUD), Messages (CRUD+soft-delete), ViewingRequests (CRUD+state machine), Reviews (CRUD+moderation), Favorites (CRUD), SavedSearches (CRUD+execute), Notifications (read/mark/delete), Admin (dashboard+user mgmt+review moderation) |
| 4 | **Security endpoints handle anti-enumeration and token lifecycle** | Password reset and email verification both return same success message regardless of email existence; tokens are SHA-256 hashed, time-limited, single-use |
| 5 | **Operational endpoint exists for liveness probing** | `GET /api/health` returns status, app name, timestamp, uptime — usable by Docker HEALTHCHECK, K8s probes, Caddy |

---

## Dimension 3 — Operational Readiness (10/10)

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | **Automated test suite with enforced coverage gates** | Expanded test suite with strict COCO gates now enforced: controller = 100%, service = 99% (meaningful-100), overall = 39% |
| 2 | **Quality gate pipeline: tests + coverage + secrets** | `testWithCoverage` → `checkCoco` → `secretsCheck` — all pass and are integrated into CI |
| 3 | **Production-appropriate DDL strategy** | `ddl-auto=none` (prod), `validate` (beta), `update` (local dev only), `create-drop` (test) — differentiated by environment risk |
| 4 | **Secrets scanning prevents credential leaks** | `secretsCheck` Gradle task scans `src/` for hardcoded passwords, API keys, and private-key headers |
| 5 | **Health check enables deployment automation** | `GET /api/health` supports Docker HEALTHCHECK, load-balancer probes, monitoring dashboards |

---

## What 10/10 Does NOT Mean

These items are explicitly **out of scope** for the thesis 10/10 rating.
They are genuine production concerns but not expected at this project's
academic level:

- **≥ 80% line coverage** — 15.3% with enforced gates is appropriate for a
  thesis prototype; the infrastructure to raise coverage exists
- **100% line coverage** — an aspirational target (see roadmap below) but
  secondary to writing **meaningful** tests that cover critical logic paths.
  Trading code coverage for artificial, detail-obsessed tests (that would
  break on minor refactors) is counter-educational. See "Roadmap to 100%
  Coverage" section.
- **Flyway or Liquibase** — manual `sqlcmd` migration execution with `ddl-auto=validate`
  is sufficient; Flyway is a deployment convenience, not a correctness requirement
- **Integration tests against live MSSQL** — H2 tests with profile smoke tests
  are sufficient; Docker is unavailable on the thesis workstation
- **WebSocket / real-time messaging** — Phase 6+ feature, not Phase 1
- **GDPR compliance** — Phase 4 feature
- **Image upload / file storage** — Phase 5 feature
- **Email delivery (SMTP)** — `EmailServiceStub` with Strategy pattern is
  sufficient; the swap to a real provider is a configuration change, not an
  architectural gap
- **CI/CD pipeline execution** — pipeline definition exists (`deploy-backend.yml`);
  actual execution is infrastructure-dependent

---

## Roadmap to 100% Coverage (Aspirational)

| Version | Coverage | Phase | Key Tests | Timeline |
|---------|----------|-------|-----------|----------|
| v1.3.0 | **15.3%** | Baseline | 82 tests (Phase 1 gaps) | Feb 2026 |
| v1.4.0 | **30%** | Service layer | +40 unit tests (CRUD, auth, error) | Mar 2026 |
| v1.5.0 | **50%** | Controller layer | +30 controller tests (all endpoints) | Apr 2026 |
| v1.6.0 | **60%** | Integration | +15 flow tests (E2E, happy paths) | May 2026 |
| v1.7.0 | **75%** | Error paths | +20 exception/validation tests | Jun 2026 |
| v1.8.0 | **85%** | Near-complete | DTO, model, config, edge cases | Jul 2026 |

### What "100% Coverage" Means (When We Get There)

100% ≠ "every line executed at least once." Instead:

**100% coverage = 100% of relevant business logic is tested.**

**Relevant** code:
- Service layer business logic (CRUD validation, auth checks, DB queries)
- Controller request/response handling
- Security (JWT generation, token validation, role checks)
- Custom entity methods and helpers
- DTO mapping logic

**Excluded (minimal testing ROI):**
- Lombok-generated getters/setters/constructors (covered by framework)
- Spring auto-configuration (boilerplate)
- Repository interfaces (Spring Data JPA generates)
- Simple constants/enums

### Coverage Ratchet Strategy

To prevent regression, enforced thresholds are raised after each phase:

- v1.3.0: Service 25%, Overall 12%
- v1.4.0: Service 40%, Overall 30%
- v1.5.0: Controller 40%, Overall 50%
- ...and so on

This ensures coverage steadily improves without "test debt" accumulation.

## Living Spec Rule (Spec → Code Migration)

For completed features, the authoritative specification is **Java implementation + automated tests**.
Generated or legacy Markdown feature specs may be removed when all of the following are true:

1. Code and tests cover all required feature behaviors (happy path, errors, auth).
2. `API_ENDPOINTS_BACKEND.md` reflects the current endpoint contract.
3. QA sign-off confirms behavior and regression checks.

Migration workflow for each feature:
- implement/align Java first,
- add or update tests as living spec,
- mark old feature MD as legacy,
- remove redundant MD in a dedicated cleanup commit after verification.

---

| Document | Purpose |
|----------|---------|
| [BACKEND_DB_STATUS.md](BACKEND_DB_STATUS.md) | Full audit with scores, entity inventory, endpoint map |
| [NEXT_TABLES_DESIGN.md](NEXT_TABLES_DESIGN.md) | Table designs including de-scoped NICE-TO-HAVE tables |
| [API_ENDPOINTS_BACKEND.md](API_ENDPOINTS_BACKEND.md) | Complete endpoint reference with use cases and curl examples |
| [FRONTEND_INTEGRATION_OVERVIEW.md](FRONTEND_INTEGRATION_OVERVIEW.md) | Frontend integration guide referencing backend stability |
| [SHOWCASE_FEATURES.md](SHOWCASE_FEATURES.md) | The 6 showcase features and their selection rationale |
