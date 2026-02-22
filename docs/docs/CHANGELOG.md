# Changelog

All notable changes to the SichrPlace backend are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [v1.3.0-backend-10of10] — 2026-02-21

### Summary

Backend 10/10 release. Closes all Phase 1 gaps (email verification, health
check, delete notification, V006 migration), adds 51 new tests (82 total),
raises coverage from ~10% to 15.3% with enforced quality gates, differentiates
`ddl-auto` per environment, and comprehensively updates all documentation.
All three dimensions (Domain, Endpoints, Operations) now score 10/10 within
the thesis and teaching scope.

### Added

- **Email verification flow** — `POST /api/auth/verify-email` and
  `POST /api/auth/resend-verification`. SHA-256 hashed tokens, 24-hour expiry,
  single-use. Anti-enumeration: resend always returns same success message.
  Verification token issued automatically on registration.
- **New entity:** `EmailVerificationToken` — SHA-256 hashed token storage with
  expiry, single-use, and user FK. Mirrors `PasswordResetToken` pattern.
- **New repository:** `EmailVerificationTokenRepository` — `findByTokenHash()`.
- **New interface:** `EmailService` — Strategy pattern for email delivery.
- **New implementation:** `EmailServiceStub` — logs email content to console;
  swap for SMTP in production by changing `@Primary` annotation.
- **New migration:** `V006__password_reset_tokens.sql` — makes the v1.2.0 showcase
  feature reproducible without Hibernate auto-DDL. Includes 3 indexes.
- **New migration:** `V007__email_verification_tokens.sql` — table for email
  verification tokens with 3 indexes.
- **Health check endpoint** — `GET /api/health` returns JSON with status, app
  name, timestamp, and uptime. Public (no auth). Usable by Docker HEALTHCHECK,
  K8s probes, Caddy.
- **Delete notification endpoint** — `DELETE /api/notifications/{id}` with
  ownership enforcement. Returns 204 No Content.
- **51 new unit tests** across 7 new test classes:
  - `UserServiceEmailVerificationTest` (7): verify valid/expired/used/invalid,
    resend unverified/unknown/already-verified
  - `UserServiceRegistrationLoginTest` (12): register/login/getUserById/
    updateUser/emailExists happy + error paths
  - `NotificationServiceTest` (15): create/get/markRead/markAllRead/
    getUnreadCount/delete with ownership checks
  - `HealthControllerTest` (2): MockMvc integration — 200+UP, no auth
  - `EmailServiceStubTest` (3): normal/long-body/empty-body
  - `DtoMappingTest` (4): UserDto/NotificationDto fromEntity
  - `EntityLogicTest` (8): PasswordResetToken/EmailVerificationToken
    isExpired/isUsed
- **Smoke test updated:** 13th repository (`EmailVerificationTokenRepository`)
  added to all smoke test assertions.
- **docs/BACKEND_10OF10_CRITERIA.md** — defines 10/10 for each dimension with
  5 criteria per dimension and explicit out-of-scope list.

### Changed

- **Endpoint count:** 66 → 70 (4 new endpoints).
- **Entity count:** 12 → 13 (EmailVerificationToken).
- **Repository count:** 13 → 14 (EmailVerificationTokenRepository).
- **Controller count:** 10 → 12 (HealthController, GlobalExceptionHandler counted).
- **Test count:** 31 → 82 (51 new unit tests).
- **COCO coverage:** 10.3% → 15.3% overall; service 17.7% → 32.1%.
- **COCO targets raised:** overall 3→12, service 4→25, dto 0→5, security 10→15,
  controller 5→8, model 3→12.
- **JaCoCo minimum:** 3% → 12%.
- **`ddl-auto` differentiation:**
  - `prod`: `update` → **`none`** (no Hibernate DDL)
  - `beta` + `beta-mssql`: `update` → **`validate`** (schema must match)
  - `local` + `local-mssql`: unchanged (`update`)
  - `test`: unchanged (`create-drop`)
- **SecurityConfig** — added `.permitAll()` for verify-email and
  resend-verification endpoints.
- **UserService** — `register()` now issues verification token; added
  `verifyEmail()` and `resendVerificationEmail()`.
- **NotificationService** — added `deleteNotification()` with ownership check.
- **BACKEND_DB_STATUS.md** — comprehensive revision: 13 entities, 70 endpoints,
  82 tests, Phase 1 100% complete, scores updated to 10/10.
- **API_ENDPOINTS_BACKEND.md** — added endpoints 67–70, Use Cases 8–10
  (email verification, delete notification, health check).
- **NEXT_TABLES_DESIGN.md** — added de-scope annotations for `tags`/
  `apartment_tags` and `usage_stats_daily`; updated phase status.
- **FRONTEND_INTEGRATION_OVERVIEW.md** — added links to BACKEND_10OF10_CRITERIA.md
  and BACKEND_DB_STATUS.md.

---

## [v1.2.0-thesis-showcase] — 2026-02-20

### Summary

Thesis-ready showcase release.  Adds three high-impact features demonstrating
advanced Spring Boot patterns (JPA Specifications, secure token lifecycle,
aggregate statistics), 21 new unit tests, and comprehensive documentation
updates across API reference, tutorium labs, demo script, thesis overview,
and exam checklist.

### Added

- **Execute Saved Search** — `POST /api/saved-searches/{id}/execute`.
  Deserializes `filter_json` into `SearchFilterDto`, builds a JPA
  `Specification<Apartment>` via `ApartmentSpecifications.fromFilter()`,
  and returns paginated matching apartments.  Updates `matchCount` and
  `lastMatchedAt` on execution.
- **Password Reset** — `POST /api/auth/forgot-password` and
  `POST /api/auth/reset-password`.  Generates 256-bit `SecureRandom` token,
  stores SHA-256 hash in `password_reset_tokens` table, enforces 1-hour
  expiry and single-use semantics.  Anti-enumeration: always returns same
  success message regardless of email existence.
- **Viewing Request Completion** — `PUT /api/viewing-requests/{id}/complete`.
  Extends the VR state machine: CONFIRMED → COMPLETED.  Either tenant or
  landlord can mark as completed.  Records transition in audit trail.
- **Viewing Request Statistics** — `GET /api/viewing-requests/statistics`.
  Returns aggregate counts (total, pending, confirmed, declined, completed,
  cancelled) plus average response time.  Role-aware: landlords see stats
  for their apartments, tenants see stats for their requests.
- **New entity:** `PasswordResetToken` — SHA-256 hashed token storage with
  expiry, single-use, and user FK.
- **New DTO:** `SearchFilterDto` — 13 composable filter fields (city,
  district, price range, bedrooms, size, furnished, pet-friendly, parking,
  elevator, balcony).
- **New DTO:** `ViewingRequestStatsDto` — aggregate statistics with optional
  average response time.
- **New class:** `ApartmentSpecifications` — JPA Specification builder from
  `SearchFilterDto` with AND-based predicate composition.
- **21 new unit tests** across 3 test classes:
  - `UserServicePasswordResetTest` (6 tests): forgot/reset happy + error paths
  - `SavedSearchServiceTest` (6 tests): execute, unauthorized, malformed JSON,
    not found, empty filter, accumulating match count
  - `ViewingRequestServiceExtendedTest` (9 tests): complete (tenant/landlord/
    unauthorized/invalid state/not found), statistics (tenant/landlord/avg
    response time/unknown user)
- **Smoke test updated:** 12th repository (`PasswordResetTokenRepository`)
  added to all 8 smoke test assertions (12 repos → 12 counts → 12 findAlls).
- **docs/SHOWCASE_FEATURES.md** — feature selection rationale with impact
  tables for users, examiners, and students.
- **API docs:** Use Case 6 (Execute Saved Search) and Use Case 7 (Password
  Reset) with curl examples.
- **Tutorium labs:** 3 new bonus exercises (S.1 saved search, S.2 password
  reset, S.3 VR statistics + completion).
- **Demo script:** Steps 6–7 added (password reset + saved search showcase).
- **Exam checklist:** Item 5 added (demonstrate one showcase feature).

### Changed

- **Endpoint count:** 61 → 66 (5 new endpoints).
- **Entity count:** 11 → 12 (PasswordResetToken).
- **Repository count:** 11 → 12 (PasswordResetTokenRepository).
- **Test count:** 8 → 29 (21 new unit tests).
- **COCO coverage:** 3.7% → 10.3% overall; service layer 0% → 17.7%.
- **SecurityConfig** — added `.permitAll()` for forgot-password and
  reset-password endpoints.
- **ViewingRequest state machine** — extended with COMPLETED state.
- **Thesis overview** — added §5b (Showcase Features), updated counts
  (66 endpoints, 12 tables, 12 repositories).
- **Exam checklist** — updated tag references, test counts, added showcase
  demonstration item.
- **Demo script** — updated architecture line (66 endpoints, 11 controllers),
  added showcase feature demo steps.
- **API docs** — updated endpoint table (rows 62–66), extended VR state
  machine diagram with COMPLETED.

---

## [v1.1.0-quality-baseline] — 2026-02-20

### Summary

Quality baseline for open-source release.  Adds automated coverage gates,
secrets scanning, and comprehensive quality/security documentation.  This tag
is the recommended starting point for forks and university adoptions.

### Added

- **JaCoCo coverage** — `./gradlew testWithCoverage` generates HTML + XML
  reports and enforces a global instruction-coverage minimum (currently 3 %,
  raising as tests are added).
- **COCO system** — `./gradlew checkCoco` reads per-package thresholds from
  `docs/coco_rules.yml` and fails the build if any package drops below its
  enforced target.  Two-tier model: enforceable-now + aspiration targets.
- **Secrets scanning** — `./gradlew secretsCheck` scans `src/` for hardcoded
  passwords, API keys, and private-key headers.  Integrated into CI.
- **docs/TEST_STRATEGY.md** — 4 test layers (unit / slice / integration / E2E),
  naming conventions, coverage goals, CI integration.
- **docs/COCO_RULES.md** — per-package coverage targets, critical scenarios
  per feature area, threshold update process with ratchet-up rule and
  `[COCO-EXCEPTION]` tag for lowering.
- **docs/SECURITY_AND_SECRETS.md** — secrets policy, env-var placeholder
  guidance, `.env.local` setup, CI secrets, leak response plan.
- **docs/CONTRIBUTING_QUALITY.md** — PR checklist for contributors (tests,
  coverage, secrets).
- **docs/TEST_TODO.md** — prioritised list of missing test classes and
  edge cases.
- **.env.example** updated with safe, obviously-fake placeholder values for
  local development.
- **Bonus lab exercises** in TUTORIUM_LAB_WORKPLACE.md — coverage and secrets
  scanning exercises for students.
- **Quality & Security Tour** section in tutorium — 15-minute guided walkthrough
  of JaCoCo, COCO, and secretsCheck.

### Changed

- **build.gradle** — added `jacoco` plugin, `testWithCoverage`, `checkCoco`,
  and `secretsCheck` Gradle tasks.  Fixed YAML parser to strip inline comments
  and handle DTD in JaCoCo XML.
- **application-local.yml** — replaced hardcoded credentials with `${ENV_VAR:placeholder}` syntax.
- **application-local-mssql.yml** — replaced hardcoded password default with `changeme`.
- **.gitignore** — added `*.pem`, `*.key`, `*.p12`, `*.jks`, `*.pfx`, `*.dump`, `*.bak`.
- **deploy-backend.yml** — replaced `./gradlew test` (continue-on-error) with
  `secretsCheck` → `testWithCoverage` → `checkCoco` pipeline.  Added coverage
  artifact upload.
- **ONBOARDING_README.md** — added "Quality & Security" section, updated
  endpoint counts (55 → 61).
- **TUTORIUM_LAB_WORKPLACE.md** — updated table/endpoint counts, added quality
  exercises and tour section.
- **FEATURE_ROADMAP_SPRING_PORT.md** — added COCO target lines per phase.

### Previous Releases

#### v1.0.0-mssql-workplace — 2026-02 (thesis submission baseline)

- 9 JPA entities → 9 tables, 55 endpoints, 9 controllers.
- Full seed data (43 rows), MSSQL 2025 + PostgreSQL dual-DB support.
- 6 smoke tests, Docker Compose, GitHub Actions CI/CD.
- Complete documentation suite (thesis overview, tutorium, API reference,
  extension tracks, demo script, diagrams).

[v1.3.0-backend-10of10]: https://github.com/omer3kale/sichrplace-backend/releases/tag/v1.3.0-backend-10of10
[v1.2.0-thesis-showcase]: https://github.com/omer3kale/sichrplace-backend/releases/tag/v1.2.0-thesis-showcase
[v1.1.0-quality-baseline]: https://github.com/omer3kale/sichrplace-backend/releases/tag/v1.1.0-quality-baseline
