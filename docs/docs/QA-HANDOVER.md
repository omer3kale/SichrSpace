# QA-HANDOVER

---

## DB Failure-Handling Hardening Sprint (2026-02-21)

### Overview

Introduced stable, machine-readable error contracts for every DB failure class.  
All exceptions surface a structured `errorCode` field in the JSON response body  
so clients and monitoring dashboards can route/react without string-matching.

### Files Changed

| File | Change |
|------|--------|
| `dto/ApiErrorResponse.java` | Added `errorCode` String field (`@JsonInclude(NON_NULL)` — backward compatible) |
| `config/GlobalExceptionHandler.java` | 5 new `@ExceptionHandler` methods + `errorCode` on catch-all |
| `controller/HealthController.java` | Removed dead ternary null-check in `dbReadiness()` catch block |
| `exception/DbFailureHandlingTest.java` | **NEW** — 14 unit tests, no Spring context |
| `controller/DbFailureControllerTest.java` | **NEW** — 8 pipeline tests via `@WebMvcTest(UserController.class)` |
| `controller/HealthControllerDbReadinessTest.java` | **NEW** — 4 `@WebMvcTest` tests covering `GET /api/health/db-readiness` UP and DOWN paths (needed to restore controller 100% gate) |

### DB Failure Error Contract

| Failure Type | Spring Exception | HTTP Status | `errorCode` | Retry? |
|---|---|---|---|---|
| Duplicate email | `DataIntegrityViolationException` (root msg contains `UQ_users_email`) | 409 | `USER_EMAIL_ALREADY_EXISTS` | No |
| Duplicate username | `DataIntegrityViolationException` (root msg contains `UQ_users_username`) | 409 | `USER_USERNAME_ALREADY_EXISTS` | No |
| FK violation | `DataIntegrityViolationException` (root msg contains `FOREIGN KEY`) | 409 | `DB_FK_VIOLATION` | No |
| Generic constraint | `DataIntegrityViolationException` (all other) | 409 | `DB_CONSTRAINT_VIOLATION` | No |
| Deadlock | `DeadlockLoserDataAccessException` / `CannotAcquireLockException` | 503 | `DB_DEADLOCK` | Once (idempotent reads) |
| Query timeout | `QueryTimeoutException` | 503 | `DB_TIMEOUT` | Once (idempotent reads) |
| Transient failure | `TransientDataAccessException` | 503 | `DB_TRANSIENT_FAILURE` | Once |
| Connection unavailable | `CannotGetJdbcConnectionException` / `CannotCreateTransactionException` | 503 | `DB_CONNECTION_UNAVAILABLE` | After health check passes |
| Unexpected | `Exception` (catch-all) | 500 | `INTERNAL_ERROR` | Never |

Response shape (all failures):
```json
{
  "timestamp": "2026-02-21T10:30:00Z",
  "status": 503,
  "error": "DB_DEADLOCK",
  "message": "Database deadlock detected. Retry idempotent reads once.",
  "path": "/api/users/register",
  "errorCode": "DB_DEADLOCK"
}
```

### DB Failure Test Suite

#### `exception/DbFailureHandlingTest` — 14 unit tests (no Spring context)

| Nested class | Tests | What is verified |
|---|---|---|
| `ConstraintViolations` | 5 | email→`USER_EMAIL_ALREADY_EXISTS`, username→`USER_USERNAME_ALREADY_EXISTS`, FK→`DB_FK_VIOLATION`, generic→`DB_CONSTRAINT_VIOLATION`; path + timestamp fields present |
| `DeadlockFailures` | 3 | `DeadlockLoserDataAccessException` 503, `CannotAcquireLockException` 503, retry hint present in message |
| `QueryTimeouts` | 2 | 503 status, `DB_TIMEOUT` errorCode, stable error field |
| `TransientFailures` | 1 | 503 status, `DB_TRANSIENT_FAILURE` errorCode |
| `ConnectionFailures` | 3 | `CannotGetJdbcConnectionException` 503, `CannotCreateTransactionException` 503, path field present |

Run: `./gradlew test --tests "com.sichrplace.backend.exception.DbFailureHandlingTest"`

#### `controller/DbFailureControllerTest` — 8 pipeline tests (`@WebMvcTest`)

| Nested class | Tests | What is verified |
|---|---|---|
| `ConstraintViolationsPipeline` | 3 | Service mock throws `DataIntegrityViolationException`; full HTTP response shape (status, errorCode, path, timestamp) via MockMvc |
| `DeadlockPipeline` | 2 | Service mock throws deadlock/lock exceptions; 503 + `DB_DEADLOCK` errorCode through the full Spring filter chain |
| `TimeoutPipeline` | 1 | Service mock throws `QueryTimeoutException`; 503 + `DB_TIMEOUT` |
| `ConnectivityPipeline` | 2 | Service mock throws connection exceptions; 503 + `DB_CONNECTION_UNAVAILABLE` |

Run: `./gradlew test --tests "com.sichrplace.backend.controller.DbFailureControllerTest"`

### DB Failure Playbook

**Scenario: POST /api/users/register receives 409 with `USER_EMAIL_ALREADY_EXISTS`**
1. Root cause: SQL Server unique constraint `UQ_users_email` fired
2. Client action: Surface "Email already in use" to the user — do NOT retry
3. Monitoring: Log captured at `WARN` level with `errorCode=USER_EMAIL_ALREADY_EXISTS path=/api/users/register`

**Scenario: Any write endpoint returns 503 with `DB_DEADLOCK`**
1. Root cause: SQL Server deadlock (victim chosen by lock manager)
2. Client action: Retry once after 200 ms for idempotent GET endpoints; for writes, surface "service temporarily unavailable"
3. Monitoring: `WARN` log emitted; if rate exceeds 1/min, investigate long-running transactions

**Scenario: Any endpoint returns 503 with `DB_CONNECTION_UNAVAILABLE`**
1. Root cause: Hikari pool exhausted or SQL Server instance unreachable
2. Client action: Poll `GET /api/health/db-readiness` — retry application traffic only when `db=UP`
3. Monitoring: `ERROR` log emitted by handler; check Hikari pool metrics and DO droplet health

### Test Results (sprint final run)

| Class | Tests | Failures | Errors | Skipped |
|---|---|---|---|---|
| `DbFailureHandlingTest` (all nested) | 14 | 0 | 0 | 0 |
| `DbFailureControllerTest` (all nested) | 8 | 0 | 0 | 0 |
| `HealthControllerDbReadinessTest` (all nested) | 4 | 0 | 0 | 0 |

Build outcome: **BUILD SUCCESSFUL** — `./gradlew testWithCoverage checkCoco`

### COCO Gate Status

Thresholds verified via `./gradlew testWithCoverage checkCoco` — All COCO rules passed:
- `security: 100.0% / 95%` ✅
- `controller: 100.0% / 100%` ✅
- `service: 99.3% / 99%` ✅
- `overall: 40.5% / 39%` ✅

---

## Session Update (2026-02-20)

## Strict Coverage Closure (2026-02-20, final)

- Full rerun completed via `./gradlew testWithCoverage --rerun-tasks`.
- `controller` package is now **100.0% line coverage**.
- `service` package is now **99.3% instruction coverage** (meaningful-100 gate).
- Only residual uncovered lines in controller/service scope:
   - `UserServiceImpl`: lines `248, 249` (`NoSuchAlgorithmException` catch in SHA-256 helper).

Rationale for residual:
- This defensive fallback is not realistically executable on the target JVM because `SHA-256` is a required digest algorithm.
- Treated as a documented meaningful exclusion; all behaviorally relevant branches are now covered.

Gate ratchet applied in `docs/coco_rules.yml`:
- `controller.target = 100`
- `service.target = 99`
- `overall.target = 39`

### MD → Code migrations completed in this session
- Password Reset (kept aligned as living spec)
- Execute Saved Search
- Viewing Request Statistics + Completion
- Email Verification

### What was migrated
- Added/updated living controller tests for endpoint contracts and error paths.
- Aligned saved-search malformed filter handling to return 400-style validation semantics.
- Added legacy banners on generated design/frontend specs pointing to authoritative Java classes/tests.
- Added central inventory + status tracker: `docs/SPEC_IMPLEMENTATION_INDEX.md`.

### Remaining DESIGN-SPEC docs with pending/non-final migration status
- `docs/NEXT_TABLES_DESIGN.md` (intentional de-scoped items remain as extension track)
- `docs/FEATURE_ROADMAP.md` (future phases pending)
- `docs/FEATURE_ROADMAP_SPRING_PORT.md` (future phases pending)
- `docs/PHASE2_FRONTEND_INTEGRATION.md` (planned integrations)
- `docs/FRONTEND_INTEGRATION_OVERVIEW.md` (high-level bridge doc)

### QA verification focus
1. Validate endpoint contracts in new controller tests:
   - saved-search execute
   - viewing-request statistics and completion
   - email verification + resend verification
2. Confirm no regressions in existing auth and viewing-request flows.
3. Confirm docs reference `SPEC_IMPLEMENTATION_INDEX.md` for source-of-truth mapping.

## Security + Controllers Maxed (2026-02-20)

- Security hardening completed for `JwtTokenProvider`, `JwtAuthenticationFilter`, and `SecurityConfig` with focused tests and active security-rule verification.
- Core controller suites expanded for `UserController`, `ApartmentController`, `SavedSearchController`, and `ReviewController` across success and critical error contracts.
- Post-sprint JaCoCo deltas:
   - `JwtTokenProvider` 89.5% → 100.0%
   - `SecurityConfig` 62.1% → 100.0%
   - `UserController` 32.1% → 92.9%
   - `ApartmentController` 4.8% → 90.5%
   - `SavedSearchController` 20.0% → 100.0%
   - `ReviewController` 7.7% → 100.0%
- COCO thresholds ratcheted and enforced:
   - `security` target set to 95%
   - `controller` target set to 65%
- Gate validation performed via `testWithCoverage` and `checkCoco`.

---

## Backend Lock-In Sprint — Midpoint Status (2026-02-21)

### Overview

Sprint adds security hardening, refresh-token rotation, account lockout, email
SMTP, GDPR data-portability endpoints, rate-limiting filter, and CORS config.
This entry documents the test-consolidation phase that brought COCO gates back
to green after the major source code additions.

### New Source Files (Summary)

| File | Description |
|------|-------------|
| `model/RefreshToken.java` | Persistent hashed refresh-token entity |
| `service/RefreshTokenService.java` / `…Impl.java` | Token create / rotate / revoke / prune |
| `controller/UserController.java` (extended) | Added `/refresh`, `/logout`, `/logout-all` endpoints |
| `controller/RefreshTokenController` (inline in UserController) | Refresh-token endpoint set |
| `controller/GdprController.java` | Art. 7/17/20 endpoints: export, deletion, consent |
| `service/GdprService.java` / `…Impl.java` | GDPR queuing, deletion, consent logging |
| `service/EmailServiceImpl.java` (SMTP rewrite) | Real JavaMailSender integration |
| `security/JwtTokenProvider.java` (extended) | `jwtSecretPrevious` fallback for key rotation |
| `security/RateLimitingFilter.java` | Per-IP token-bucket rate limiting |
| `config/CorsConfig.java` | CORS beans |
| `config/SecurityConfig.java` (extended) | Wired AccountLockout, RateLimiting filters |

### New and Fixed Test Files

| Test Class | Tests | Status |
|-----------|-------|--------|
| `security/JwtRotationTest.java` | 4 | ✅ New |
| `service/AccountLockoutTest.java` | 4 | ✅ New |
| `service/RefreshTokenServiceTest.java` | 9 | ✅ New (6 original + 3 added) |
| `service/EmailServiceImplSmtpTest.java` | 3 | ✅ New |
| `service/GdprServiceTest.java` | 6 | ✅ New (5 original + 1 added) |
| `controller/RefreshTokenControllerTest.java` | 6 | ✅ New (4 original + 2 added) |
| `controller/GdprControllerTest.java` | 8 | ✅ New (5 original + 3 added) |
| `security/JwtTokenProviderTest.java` | — | ✅ Fixed: 4-arg constructor |
| `service/UserServiceRegistrationLoginTest.java` | — | ✅ Fixed: RefreshTokenService mock |
| `controller/UserControllerTest.java` | — | ✅ Fixed: @MockBean additions |
| `controller/UserController{PasswordReset,EmailVerification}Test.java` | — | ✅ Fixed |
| `controller/DbFailureControllerTest.java` | — | ✅ Fixed |

### Source Code Bugs Fixed During Test Cycle

| Bug | Fix |
|-----|-----|
| `GdprServiceImpl.logConsent()` Turkish-locale `.toUpperCase()` | Changed to `.toUpperCase(Locale.ROOT)` |
| `JwtTokenProvider.getAllClaimsFromToken()` no fallback | Added try/catch fallback to `jwtSecretPrevious` |
| Lombok-generated code counted in JaCoCo denominator | Added `lombok.config` with `lombok.addLombokGeneratedAnnotation = true` |

### Coverage Gates Post-Sprint

| Package | Coverage | Threshold | Status |
|---------|----------|-----------|--------|
| security | 100.0% | 95% | ✅ |
| controller | 99.8% | 99% | ✅ |
| config | 43.9% | 20% | ✅ |
| service | 99.4% | 99% | ✅ |
| dto | 98.9% | 20% | ✅ |
| repository | 1.4% | 0% | ✅ |
| model | 96.6% | 12% | ✅ |
| **OVERALL** | **82.1%** | **60%** | **✅** |

Previous OVERALL baseline: 40.5%.  
After sprint: 82.1% — achieves the ≥60% target set for this sprint.

The `lombok.config` exclusion of Lombok-generated bytecode was the primary driver
of the OVERALL jump (model: 27% → 96.6%, dto: 26.7% → 98.9%).

### Threshold Changes

- `controller` target: 100% → 99%  
  _Rationale: `GdprController.sha256()` contains a structurally unreachable
  `NoSuchAlgorithmException` catch block (SHA-256 is guaranteed by the JVM spec).
  3 dead-code instructions cannot be covered without mocking JDK internals._

### Test Run Summary

```
Total tests: 423  |  Failures: 0  |  Skipped: 0
```

---

## Go-Live Backend Hardening (2026-02-21)

### Overview

After Backend Lock-In Sprint, additional hardening was applied to make the backend
safe for public traffic.  No new feature endpoints were added — existing code was
made configurable, observable, and prod-instrumented.

### Changes Applied

| Area | Change |
|------|--------|
| `RateLimitingFilter` | Removed hardcoded `static final` constants.  Limits now read from `app.ratelimit.{capacity,refillTokens,refillSeconds}` via `@Value` with code-level defaults (10/10/60). |
| `application-prod-mssql.yml` | Added `app.jwtSecretPrevious`, `app.refreshTokenExpirationDays`, and `app.ratelimit.*` config keys backed by env vars.  Prod defaults: 20 tokens / 60 s. |
| `application-beta-mssql.yml` | Same additions as prod-mssql with 10-token defaults (lower traffic environment). |
| `RateLimitingFilterTest` (new) | 7 unit tests: first-request pass, 429 + Retry-After, register path, GET bypass, non-auth POST bypass, X-Forwarded-For key, independent per-IP buckets. |

### New Environment Variables (Prod / Beta)

| Variable | Default | Purpose |
|----------|---------|---------|
| `JWT_SECRET_PREVIOUS` | _(empty)_ | Previous JWT secret; enables zero-downtime key rotation grace period |
| `REFRESH_TOKEN_EXPIRATION_DAYS` | `14` | Override refresh-token TTL without redeploying |
| `RATE_LIMIT_CAPACITY` | `20` (prod) / `10` (beta) | Token-bucket capacity per IP |
| `RATE_LIMIT_REFILL_TOKENS` | `20` (prod) / `10` (beta) | Tokens refilled per period |
| `RATE_LIMIT_REFILL_SECONDS` | `60` | Refill period in seconds |

### Post-Hardening Test Run

```
Total tests: 430  |  Failures: 0  |  Skipped: 0
```
COCO gate (confirmed `BUILD SUCCESSFUL`):
| Package | Coverage | Threshold |
|---------|----------|-----------|
| security | 100.0% | 95% ✅ |
| controller | 99.8% | 99% ✅ |
| config | 46.1% | 20% ✅ |
| service | 99.4% | 99% ✅ |
| **OVERALL** | **82.7%** | **60%** ✅ |

---

## WebSocket Realtime (Phase 1.4) — STOMP over WebSocket

### Overview

Spring WebSocket STOMP infrastructure implemented as the **primary** realtime channel.
Firebase Realtime (Phase 5) will be an optional secondary channel, not the backbone.

### New Source Files

| File | Description |
|------|-------------|
| `config/WebSocketConfig.java` | `@EnableWebSocketMessageBroker`; SockJS endpoint `/ws`; in-memory broker on `/topic`+`/queue`; `JwtChannelInterceptor` on inbound channel |
| `security/JwtChannelInterceptor.java` | Validates JWT on STOMP `CONNECT` frames; throws `MessageDeliveryException` on auth failure; sets STOMP session principal |

### Modified Source Files

| File | Change |
|------|--------|
| `build.gradle` | Added `spring-boot-starter-websocket` dependency |
| `config/SecurityConfig.java` | Added `/ws/**` to `permitAll()` (HTTP handshake upgrade) |
| `service/NotificationServiceImpl.java` | Pushes `NotificationDto` to `/user/queue/notifications` after `notificationRepository.save()` |
| `service/ConversationServiceImpl.java` | Pushes `MessageDto` to `/topic/conversations.{id}` after `messageRepository.save()` |
| `service/ViewingRequestServiceImpl.java` | Pushes `ViewingRequestDto` to `/user/queue/viewing-requests` on confirm and decline |

### Injection Safety

`SimpMessagingTemplate` is injected via `@Autowired(required = false)` as a non-final field
(not in Lombok constructor) in all three service impls.  Every call site is guarded by
`if (messagingTemplate != null)`.  This ensures the 3 Mockito service test files
(`ConversationServiceTest`, `NotificationServiceTest`, `ViewingRequestServiceExtendedTest`)
continue to work without modification.

### New Test Files

| Test Class | Tests | Type | What is verified |
|-----------|-------|------|------------------|
| `security/JwtChannelInterceptorTest` | 5 | Mockito unit | valid Bearer header sets principal; `token` fallback header sets principal; missing header → `MessageDeliveryException`; invalid JWT → `MessageDeliveryException`; SUBSCRIBE frame passes through |
| `config/WebSocketConfigTest` | 4 | `@SpringBootTest` | `WebSocketConfig` bean present; `JwtChannelInterceptor` bean present; `SimpMessagingTemplate` bean present; allowed-origins property non-blank |

### Topic Map (QA Reference)

| Destination | Trigger | Principal needed |
|-------------|---------|------------------|
| `/topic/conversations.{id}` | Any participant sends a message in that conversation | Subscribed to that topic |
| `/user/queue/notifications` | Any action that generates a Notification for the user | User authenticated as recipient |
| `/user/queue/viewing-requests` | Owner confirms or declines a tenant's viewing request | User authenticated as the tenant |

### Manual Test Steps

1. Start backend with `./gradlew bootRun`.
2. Use a STOMP WebSocket client (e.g., [STOMP.js](https://stomp-js.github.io/)) or `wscat` with SockJS.
3. **Rejected CONNECT:** Connect to `ws://localhost:8080/ws` without an `Authorization` header.  Expect `ERROR` frame + connection close.
4. **Accepted CONNECT:** Connect with `Authorization: Bearer <valid-jwt>`.  Expect `CONNECTED` frame.
5. **Notification push:** Subscribe to `/user/queue/notifications`.  Trigger any action that produces a notification (e.g., create a viewing request).  Expect a `NotificationDto` JSON message.
6. **Message push:** Subscribe to `/topic/conversations.{id}`.  Send a message via `POST /api/conversations/{id}/messages`.  Expect a `MessageDto` JSON pushed to all subscribers.
7. **Viewing-request status:** Subscribe to `/user/queue/viewing-requests` as the tenant.  Have the owner confirm/decline via `PUT /api/viewing-requests/{id}/confirm`.  Expect a `ViewingRequestDto` JSON pushed.

### Post-Hardening Test Run

Confirmed after `./gradlew testWithCoverage checkCoco`:

```
Total tests: 441  |  Failures: 0  |  Skipped: 0
```

All COCO gates green:

| Package | Coverage | Threshold |
|---------|----------|----------|
| security | 100.0% | 95% ✅ |
| controller | 99.8% | 99% ✅ |
| config | 47.5% | 20% ✅ |
| service | 99.4% | 99% ✅ |
| **OVERALL** | **83.1%** | **60%** ✅ |

Service-level WebSocket event publishing is covered by unit tests—`SimpMessagingTemplate` is mock-injected via `ReflectionTestUtils.setField()` in
`ConversationServiceTest`, `NotificationServiceTest`, and `ViewingRequestServiceExtendedTest`,
so the `messagingTemplate != null` branch (send) and the null-guard (no-op) are both exercised.

### Email Notifications on Viewing Request Status Change (Phase 2 A-3)

`ViewingRequestServiceImpl` now sends an email via `EmailService` after each status transition:

| Transition | Recipient | Subject |
|------------|-----------|--------|
| Confirm | Tenant | "Viewing request confirmed" |
| Decline | Tenant | "Viewing request declined" |
| Cancel | Landlord | "Viewing request cancelled" |
| Complete | Other party | "Viewing request completed" |

Email delivery failures are caught and logged — they never break the main workflow.

**QA checklist:**
- Verify tenant receives email on confirm and decline (check subject + apartment title in body).
- Verify landlord receives email on cancel (check tenant name in body).
- Verify the other party receives email on complete.
- Verify that if the SMTP server is down, the status transition still succeeds (email failure is non-fatal).

| Package | Coverage | Threshold |
|---------|----------|----------|
| security | 100.0% | 95% ✅ |
| controller | 99.8% | 99% ✅ |
| config | 47.5% | 20% ✅ |
| service | 99.4% | 99% ✅ |
| **OVERALL** | **83.4%** | **60%** ✅ |

### Search Messages (Phase 2 B-2)

`GET /api/conversations/messages/search?q={query}` — searches across all conversations the authenticated user participates in.

- Case-insensitive `LIKE` search on `message.content`
- Excludes soft-deleted messages
- Returns `Page<MessageDto>` (default Spring `Pageable` — `page`, `size`, `sort` params)
- Blank or missing `q` → 400 Bad Request
- Unauthenticated → 401
- 451 tests total, 0 failures, all COCO green

### Archive Conversation (Phase 2 B-1)

Each participant can independently archive/unarchive conversations.

**Endpoints:**
- `PATCH /api/conversations/{id}/archive` — toggles archive state; returns `{ "archived": true }` or `{ "archived": false }`
- `GET /api/conversations/archived` — lists the user's archived conversations (paginated)
- `GET /api/conversations` — **now excludes** archived conversations automatically

**Behaviour:**
- Archive is per-user: archiving for user A does not affect user B's conversation list
- Toggle: calling archive twice unarchives the conversation
- Authorization: only participants can archive; non-participant → 403
- New entity: `ConversationArchive` (table `conversation_archives`, unique on `conversation_id + user_id`)

**QA checklist:**
- Archive a conversation → verify it disappears from `GET /api/conversations`
- Verify archived conversation appears in `GET /api/conversations/archived`
- Toggle archive again → verify it returns to `GET /api/conversations`
- Verify the other participant's conversation list is NOT affected
- Verify 401 for unauthenticated requests
- Verify 403 for non-participant attempting to archive

| Package | Coverage | Threshold |
|---------|----------|----------|
| security | 100.0% | 95% ✅ |
| controller | 99.8% | 99% ✅ |
| config | 47.5% | 20% ✅ |
| service | 99.3% | 99% ✅ |
| **OVERALL** | **83.6%** | **60%** ✅ |

### Report Conversation (Phase 2 B-5)

Users can flag a conversation for admin review. Admins can list and moderate reports.

**User endpoint:**
- `POST /api/conversations/{id}/report` — body: `{ "reason": "..." }`; returns 201 with `ConversationReportDto`
  - Must be a participant → 403 if not
  - Duplicate report → 409 Conflict
  - Blank/missing reason → 400

**Admin endpoints:**
- `GET /api/admin/conversations/reports?status=PENDING` — lists reports (paginated, optional status filter)
- `PATCH /api/admin/conversations/reports/{reportId}` — body: `{ "status": "REVIEWED" }` or `{ "status": "DISMISSED" }`
  - Records `resolvedAt` timestamp and `resolvedBy` admin user

**Entity:** `ConversationReport` — `id`, `conversation_id`, `reporter_id`, `reason`, `status` (PENDING/REVIEWED/DISMISSED), `created_at`, `resolved_at`, `resolved_by_id`

**Service:** Dedicated `ConversationReportService` interface + `ConversationReportServiceImpl` (injected into both `ConversationController` and `AdminController`)

**QA checklist:**
- Submit a report as conversation participant → verify 201 + PENDING status
- Submit duplicate report on same conversation → verify 409
- Submit report as non-participant → verify 403
- Submit report with blank reason → verify 400
- As admin, list reports without filter → verify all reports returned
- As admin, list reports with `?status=PENDING` → verify only PENDING returned
- As admin, update report to REVIEWED → verify `resolvedAt` and `resolvedByName` populated
- As non-admin, attempt GET/PATCH admin endpoints → verify 403
- Verify unauthenticated requests → 401

| Package | Coverage | Threshold |
|---------|----------|----------|
| security | 100.0% | 95% ✅ |
| controller | 99.4% | 99% ✅ |
| config | 47.5% | 20% ✅ |
| service | 99.2% | 99% ✅ |
| **OVERALL** | **83.9%** | **60%** ✅ |

480 tests, 0 failures, 0 skipped

### File Attachments (Phase 2 B-3)

Users can register attachment metadata on messages. Assumes external file storage (CDN/S3).

**Endpoints:**
- `POST /api/conversations/messages/{messageId}/attachments` — body: `{ "filename": "...", "contentType": "...", "sizeBytes": 12345, "storageUrl": "..." }`; returns 201 with `MessageAttachmentDto`
  - Blank filename/contentType/storageUrl → 400
  - Null sizeBytes → 400
  - Non-participant → 403
- `GET /api/conversations/messages/{messageId}/attachments` — returns list of `MessageAttachmentDto`
  - Non-participant → 403

**Entity:** `MessageAttachment` — `id`, `message_id` FK, `filename`, `contentType`, `sizeBytes`, `storageUrl`, `createdAt`

**Service:** Dedicated `MessageAttachmentService` interface + `MessageAttachmentServiceImpl`

**QA checklist:**
- Add attachment as conversation participant → verify 201
- Add attachment with blank filename → verify 400
- Add attachment with blank contentType → verify 400
- Add attachment with blank storageUrl → verify 400
- Add attachment as non-participant → verify 403
- Add attachment to non-existent message → verify 400
- List attachments as participant → verify 200 with array
- List attachments as non-participant → verify 403
- List attachments on non-existent message → verify 400
- Unauthenticated request → verify 401

### Emoji Reactions (Phase 2 B-4)

Users can add/remove emoji reactions on messages. Reactions are pushed via WebSocket.

**Endpoints:**
- `POST /api/conversations/messages/{messageId}/reactions` — body: `{ "emoji": "👍" }`; returns 201 with `MessageReactionDto`
  - Blank emoji → 400
  - Duplicate reaction (same user, same emoji) → 409
  - Non-participant → 403
- `DELETE /api/conversations/messages/{messageId}/reactions?emoji=...` — returns 204
  - Blank emoji → 400
  - Reaction not found → 400
  - Non-participant → 403
- `GET /api/conversations/messages/{messageId}/reactions` — returns list of `MessageReactionDto`
  - Non-participant → 403

**Entity:** `MessageReaction` — `id`, `message_id` FK, `user_id` FK, `emojiCode`, `createdAt`; unique constraint on (`message_id`, `user_id`, `emoji_code`)

**Service:** Dedicated `MessageReactionService` interface + `MessageReactionServiceImpl`; WebSocket push to `/topic/conversations.{id}.reactions` on add/remove

**QA checklist:**
- Add reaction as participant → verify 201 + WebSocket push with `{action: "ADD"}`
- Add duplicate reaction → verify 409
- Add reaction as non-participant → verify 403
- Add reaction to non-existent message → verify 400
- Add reaction with blank emoji → verify 400
- Remove reaction as participant → verify 204 + WebSocket push with `{action: "REMOVE"}`
- Remove non-existent reaction → verify 400
- Remove reaction as non-participant → verify 403
- Remove reaction with blank emoji → verify 400
- List reactions as participant → verify 200 with array
- List reactions as non-participant → verify 403
- Unauthenticated request → verify 401

| Package | Coverage | Threshold |
|---------|----------|----------|
| security | 100.0% | 95% ✅ |
| controller | 99.1% | 99% ✅ |
| config | 47.5% | 20% ✅ |
| service | 99.1% | 99% ✅ |
| **OVERALL** | **84.6%** | **60%** ✅ |

~513 tests, 0 failures, 0 skipped

## Backend–Frontend API Contract

> **Base URL:** `https://sichrplace.com/api`  (prod) · `http://localhost:8080/api` (local)  
> All protected endpoints require `Authorization: Bearer <accessToken>` header.  
> Rate-limited endpoints: `POST /auth/login`, `POST /auth/register`, `POST /auth/forgot-password`, `POST /auth/refresh` — 20 req / 60 s per IP (prod).

### Authentication Flow

```
1. POST /auth/register          → { message }
2. POST /auth/verify-email      → { message }              (email link)
3. POST /auth/login             → { accessToken, refreshToken, tokenType, expiresIn }
4. POST /auth/refresh           → { accessToken, refreshToken, … }
5. POST /auth/logout            → 204 No Content
6. POST /auth/logout-all        → 204 No Content
```

### Key Endpoint Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | public | Create account; triggers verification email |
| POST | `/auth/verify-email` | public | Confirm email with token from email link |
| POST | `/auth/login` | public | Issue access + refresh token pair |
| POST | `/auth/refresh` | bearer (refresh) | Rotate refresh token; issue new access token |
| POST | `/auth/logout` | bearer | Revoke supplied refresh token |
| POST | `/auth/logout-all` | bearer | Revoke all refresh tokens for the user |
| POST | `/auth/forgot-password` | public | Send password-reset email |
| POST | `/auth/reset-password` | public | Set new password with reset token |
| GET  | `/apartments` | public | List/search apartments (paginated) |
| POST | `/apartments` | bearer (LANDLORD) | Create listing |
| GET  | `/apartments/{id}` | public | Get single listing |
| PUT  | `/apartments/{id}` | bearer (LANDLORD/ADMIN) | Update listing |
| DELETE | `/apartments/{id}` | bearer (LANDLORD/ADMIN) | Soft-delete listing |
| GET  | `/apartments/owner/listings` | bearer | My listings |
| GET  | `/users/{id}` | bearer | Get user profile |
| PUT  | `/users/{id}` | bearer | Update profile |
| POST | `/saved-searches` | bearer | Save a search filter |
| GET  | `/saved-searches` | bearer | List saved searches |
| POST | `/saved-searches/{id}/execute` | bearer | Run a saved search |
| POST | `/reviews` | bearer | Submit review |
| GET  | `/reviews/apartment/{id}` | public | Reviews for a listing |
| POST | `/gdpr/consent` | public | Record GDPR consent |
| GET  | `/gdpr/export` | bearer | Request data export (Art. 20) |
| DELETE | `/gdpr/delete` | bearer | Request account deletion (Art. 17) |
| GET  | `/health` | public | Liveness probe (`{ status: "UP", … }`) |
| GET  | `/health/db-readiness` | public | Readiness probe (SQL SELECT 1) |

### Error Response Contract

All error responses follow the `ApiErrorResponse` shape:

```json
{
  "status": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please wait 60 seconds.",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "path": "/api/auth/login",
  "timestamp": "2026-02-21T14:00:00Z"
}
```

`errorCode` is machine-readable and should be used by the frontend for i18n
message lookup — do NOT parse the `message` string.

### Security Model — CSRF

| Property | Value |
|----------|-------|
| CSRF protection | **N/A by design** — Phase 1.2 closed |
| Mechanism | `Authorization: Bearer <JWT>` header; no cookies; `SessionCreationPolicy.STATELESS` |
| `csrf().disable()` | Intentional and correct for this architecture |
| Test guard | `SecurityConfigTest` — POST without CSRF token → not 403; no `Set-Cookie` on auth responses |

What QA must verify:
- No `Set-Cookie` header on any `/api/auth/*` response.
- All state-changing calls to authenticated endpoints return `401` when `Authorization` header is absent.
- No session ID appears in response headers (`JSESSIONID` cookie = regression).

### Frontend Integration Checklist

- [ ] Store `accessToken` in memory or `localStorage` — **never in a cookie** (would re-open CSRF attack surface)
- [ ] Implement silent token refresh: on `401` response, call `POST /auth/refresh` and retry once
- [ ] Handle `429` with `Retry-After` header — show a countdown to the user
- [ ] Handle `423 Locked` on login — display unlock-time from response body
- [ ] Propagate `errorCode` field, not HTTP status alone, for user-facing messages

