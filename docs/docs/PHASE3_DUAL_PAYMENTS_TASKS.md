# Phase 3 — Dual Payments + Booking Flow

> **Created:** 2026-02-22  
> **Depends on:** Phase 1 (auth) ✅, Phase 2 (conversations) ✅  
> **Constraint:** Schema via JPA `ddl-auto: update` (no Flyway — consistent with Phases 1–2)

---

## Phase 2 Baseline (before Phase 3)

| Metric | Value |
|--------|-------|
| Tests | 518 (0 failures, 0 skipped) |
| security | 100.0% / 95% ✅ |
| controller | 99.1% / 99% ✅ |
| config | 47.5% / 20% ✅ |
| service | 99.1% / 99% ✅ |
| dto | 99.0% / 20% ✅ |
| model | 96.7% / 12% ✅ |
| **OVERALL** | **84.6%** / **60%** ✅ |

Phase 2 is **fully complete**: all conversation features (archive, search, reports, attachments, reactions) shipped with COCO green.  
81 endpoints across 12 controllers.

---

## Architecture Decision: Booking Status vs Payment Transaction Status

Two **separate** status machines — never conflated:

### 1. Booking Status (exists: `ViewingRequest.status`)

Lifecycle of the *appointment*. Already implemented:

```
PENDING → CONFIRMED → COMPLETED
       ↘ DECLINED
       ↘ CANCELLED
```

This is "did the viewing happen?" — independent of money.

### 2. Payment Transaction Status (new: `PaymentTransaction.status`)

Lifecycle of a *single payment attempt*:

```
CREATED → PENDING → COMPLETED
                  → FAILED
       COMPLETED → REFUNDED
```

This is "did the money move?" A single booking can have:
- **Zero** transactions (free viewing — no payment required)
- **One** successful transaction
- **Multiple** transactions (failed attempt → retry → success)

### 3. The Thin Join

`ViewingRequest` gets:
- `paymentRequired` (boolean, default `false`) — business rule: "does this viewing type need payment?"
- Optional FK to `PaymentTransaction` — **nullable**; only populated when a payment is initiated

The booking can answer "am I paid?" via:
```java
public boolean isPaid() {
    return !paymentRequired || 
           (paymentTransaction != null && 
            paymentTransaction.getStatus() == PaymentStatus.COMPLETED);
}
```

This design avoids the anti-pattern of a `paymentStatus` column on `ViewingRequest` that breaks when:
- A booking needs no payment (free viewings)
- A payment fails and the tenant retries (two transactions, one booking)
- A refund happens after the viewing is completed
- A second provider is added (which transaction does the status column refer to?)

---

## Phase 3 Scope (from ROADMAP.md + FEATURE_ROADMAP.md)

| Source | Item |
|--------|------|
| ROADMAP.md §2 | PayPal + Stripe server-side proxy; no payment logic in frontend JS |
| ROADMAP.md §2.2 | `payments` table schema (provider, orderId, status, amount, currency) |
| ROADMAP.md §2.3 | PayPal create-order + capture + webhook endpoints |
| ROADMAP.md §2.4 | Stripe create-payment-intent + webhook endpoints |
| FEATURE_ROADMAP.md §3 | Payment status tracking on ViewingRequest — **MISSING** |
| FEATURE_ROADMAP.md §7 | Phase 7 PayPal: create, capture, webhook; payment_status on viewing_requests |
| FEATURE_ROADMAP.md §10-11 | PayPal (6 endpoints) + Stripe (3 endpoints) — entirely absent |

---

## Phase 3 Backend Task List

### P3-1 — PaymentTransaction Entity + Repository ✅ IMPLEMENTED

> Foundation: the payment record that all later stories depend on.
>
> **Status:** Implemented & tested (537 tests, 0 failures, service 99.2%)
> **Implemented:** 2026-02-22

**New files:**
- `model/PaymentTransaction.java` — entity
- `dto/PaymentTransactionDto.java` — DTO with `fromEntity()`
- `repository/PaymentTransactionRepository.java`
- `service/PaymentTransactionService.java` — interface
- `service/PaymentTransactionServiceImpl.java` — basic CRUD + status transitions

**Entity fields:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK IDENTITY | |
| `user_id` | BIGINT FK → users | Who initiated the payment |
| `viewing_request_id` | BIGINT FK → viewing_requests | **Nullable** — booking reference |
| `provider` | VARCHAR(20) | `PAYPAL` or `STRIPE` |
| `provider_order_id` | VARCHAR(255) | External ID from provider |
| `status` | VARCHAR(20) | `CREATED`, `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED` |
| `amount` | DECIMAL(10,2) | |
| `currency` | CHAR(3) | ISO 4217 (EUR, USD) |
| `description` | VARCHAR(500) | Human-readable purpose |
| `provider_metadata` | TEXT | JSON blob from provider (capture response, etc.) |
| `created_at` | DATETIME2 | @CreatedDate |
| `updated_at` | DATETIME2 | @LastModifiedDate |
| `completed_at` | DATETIME2 | Set when status → COMPLETED |

**Repository methods:**
- `findByUserIdOrderByCreatedAtDesc(Long userId)`
- `findByViewingRequestId(Long viewingRequestId)`
- `findByProviderAndProviderOrderId(String provider, String providerOrderId)`
- `findByStatus(PaymentStatus status)`

**Service methods:**
- `createTransaction(userId, viewingRequestId, provider, amount, currency, description)` → PaymentTransactionDto
- `updateStatus(transactionId, newStatus, providerMetadata)` → PaymentTransactionDto
- `getByViewingRequest(viewingRequestId, userId)` → List<PaymentTransactionDto>
- `getByUser(userId)` → List<PaymentTransactionDto>

**Tests expected:** ~8–10 service tests + 0 controller tests (no endpoints yet)

**Schema change:** New table `payment_transactions` (JPA auto-DDL)  
**Risk:** Low — pure domain model, no external API calls

---

### P3-2 — Wire ViewingRequest ↔ PaymentTransaction ✅ IMPLEMENTED

> Add `paymentRequired` flag and optional FK to `ViewingRequest`; update DTO.
>
> **Status:** Implemented & tested (550 tests, 0 failures, service 99.2%)
> **Implemented:** 2026-02-22

**What was implemented:**
- `model/ViewingRequest.java` — added `paymentRequired` (boolean, default false), `paymentTransaction` (@ManyToOne, nullable), convenience methods `isPaid()`, `isPaymentInProgress()`, `isRefunded()`
- `dto/ViewingRequestDto.java` — added `paymentRequired`, `paymentStatus` (derived from linked transaction status)
- `service/ViewingRequestService.java` — added `markViewingAsPaymentRequired(viewingId, amount, currency, provider)`, `clearPaymentRequirement(viewingId)` (no new HTTP endpoints)
- `service/ViewingRequestServiceImpl.java` — implemented above methods using `PaymentTransactionService`
- Tests: 13 new tests covering service wiring + DTO mapping + entity convenience methods

**Schema change:** 2 new columns on `viewing_requests` (`payment_required`, `payment_transaction_id`)  
**Risk:** Low — backward-compatible (default false), no endpoints exposed yet

---

### P3-3 — Payment Session Endpoints (Mocked Provider) ✅ IMPLEMENTED

> Expose backend endpoints to start a payment session and query payment status, with stubbed provider responses.
>
> **Status:** Implemented & tested (571 tests, 0 failures, service 99.2%, controller 99.2%)
> **Implemented:** 2026-02-22

**What was implemented:**
- `dto/PaymentSessionDto.java` — DTO with `transactionId`, `provider`, `status`, `redirectUrl` + static `from()` factory
- `dto/CreatePaymentSessionRequest.java` — Request body with validated `provider` field
- `service/ViewingRequestService.java` — added `createPaymentSession(viewingRequestId, userId, provider)`, `getPaymentStatus(viewingRequestId, userId)`
- `service/ViewingRequestServiceImpl.java` — implemented both methods with auth checks (tenant-only for session creation, tenant+landlord for status)
- `controller/ViewingRequestController.java` — 2 new endpoints:
  - `POST /api/viewing-requests/{id}/payments/session` → 201 with PaymentSessionDto
  - `GET /api/viewing-requests/{id}/payments/status` → 200 with `{ "status": "CREATED" | ... | "NONE" }`
- 21 new tests (11 service + 10 controller) covering happy paths, auth guards, error cases

**Stubbed behaviour:** `redirectUrl` is `https://payments.example.test/{transactionId}` — no real provider calls.
**Schema change:** None  
**Risk:** Low — no external HTTP calls yet

---

### P3-4 — Stripe Integration Service ✅ IMPLEMENTED

> Server-side Stripe integration: create Checkout Session via SDK.

**New files created:**
- `config/StripeConfig.java` — `@Configuration`; reads `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`; sets `Stripe.apiKey` via `@PostConstruct`
- `service/PaymentProviderClient.java` — provider-agnostic interface with `createCheckoutSession(PaymentTransaction, ViewingRequest)` → `PaymentProviderSession`
- `dto/PaymentProviderSession.java` — DTO: `providerTransactionId`, `redirectUrl`
- `service/StripePaymentProviderClient.java` — Stripe implementation using `com.stripe:stripe-java:24.3.0`; creates `SessionCreateParams` with line items, metadata, success/cancel URLs; calls `Session.create()`; wraps `StripeException` → `IllegalStateException`

**Modified files:**
- `build.gradle` — added `implementation 'com.stripe:stripe-java:24.3.0'`
- `service/PaymentTransactionService.java` — added `updateProviderDetails(Long id, String providerTransactionId)` method
- `service/PaymentTransactionServiceImpl.java` — implemented `updateProviderDetails`: sets provider tx id + validates/transitions to PENDING
- `service/ViewingRequestServiceImpl.java` — injected `PaymentProviderClient`; `createPaymentSession()` now calls real provider, stores `providerTransactionId`, marks tx PENDING

**Endpoints:** No new endpoints — existing `POST /api/viewing-requests/{id}/payments/session` now returns provider-backed redirect URL instead of stub.

**Config env vars:** `${STRIPE_SECRET_KEY}`, `${STRIPE_PUBLISHABLE_KEY}`, `${STRIPE_SUCCESS_URL}`, `${STRIPE_CANCEL_URL}`

**Tests added:** 11 new tests (582 total, 0 failures)
- `StripePaymentProviderClientTest` — 5 tests: success, StripeException wrapping, null URL, param building, config URL usage
- `StripeConfigTest` — 2 tests: bean loading, default URL values
- `PaymentTransactionServiceTest` — 3 tests: updateProviderDetails success/invalid-transition/not-found
- `ViewingRequestServiceExtendedTest` — 1 new test: provider error propagation; 2 existing tests updated for provider mocking

**Coverage:** service 99.2%, controller 99.2%, config 47.9%, overall 85.4% — all COCO gates passed

**Schema change:** None
**Note:** Session creation now calls real Stripe SDK; transaction status depends on future webhook work (P3-5).

---

### P3-5 — Stripe Webhook + Transaction Status Updates ✅ IMPLEMENTED

> Receive Stripe webhook events, verify signature, update PaymentTransaction status.
>
> **Status:** Implemented & tested (605 tests, 0 failures, service 99.1%, controller 99.2%)
> **Implemented:** 2026-02-22

**New files created:**
- `service/StripeWebhookService.java` — processes Stripe webhook events; verifies signature via `Webhook.constructEvent()`; routes events to PaymentTransactionService by provider ID; handles `checkout.session.completed` → COMPLETED, `payment_intent.payment_failed` → FAILED, `charge.refunded` → REFUNDED; gracefully ignores unknown event types and empty/wrong data objects
- `controller/StripeWebhookController.java` — `POST /api/payments/stripe/webhook`; reads raw body + `Stripe-Signature` header; validates signature presence; delegates to StripeWebhookService; returns 200 `{"received": true}` on success, 400 `{"received": false, "error": "..."}` on failure
- `test/service/StripeWebhookServiceTest.java` — 12 tests using spy pattern to bypass real Stripe signature verification
- `test/controller/StripeWebhookControllerTest.java` — 5 tests for endpoint behaviour

**Modified files:**
- `config/StripeConfig.java` — added `webhookSecret` field (`${stripe.webhook-secret}` / `${STRIPE_WEBHOOK_SECRET}`)
- `config/SecurityConfig.java` — added `POST /api/payments/stripe/webhook` as `permitAll()` (unauthenticated, signature-verified)
- `service/PaymentTransactionService.java` — added 3 interface methods: `markCompletedByProviderId(String)`, `markFailedByProviderId(String, String)`, `markRefundedByProviderId(String)`
- `service/PaymentTransactionServiceImpl.java` — implemented `byProviderId` methods (look up by `providerTransactionId`, delegate to existing `markCompleted`/`markFailed`/`markRefunded`)
- `test/service/PaymentTransactionServiceTest.java` — added 6 tests for byProviderId methods

**Endpoint:**
- `POST /api/payments/stripe/webhook` — unauthenticated (Stripe signature-verified)

**Event mapping:**
| Stripe Event | PaymentTransaction Status | Method Called |
|---|---|---|
| `checkout.session.completed` | COMPLETED | `markCompletedByProviderId(sessionId)` |
| `payment_intent.payment_failed` | FAILED | `markFailedByProviderId(paymentIntentId, reason)` |
| `charge.refunded` | REFUNDED | `markRefundedByProviderId(chargeId)` |

**Config env vars:** `${STRIPE_WEBHOOK_SECRET}` (or `stripe.webhook-secret` in application.yml)

**Tests added:** 23 new tests (605 total, 0 failures)
- `StripeWebhookServiceTest` — 12 tests: 3 happy-path event types, unknown event ignored, invalid signature (SignatureVerificationException path), malformed payload (generic Exception path), 3 empty data object resilience tests, 3 wrong data object type tests
- `StripeWebhookControllerTest` — 5 tests: valid event → 200, invalid signature → 400, no auth required, missing header → 400, blank header → 400
- `PaymentTransactionServiceTest` — 6 tests: markCompletedByProviderId (success + not found), markFailedByProviderId (success + not found), markRefundedByProviderId (success + not found)

**Schema change:** None
**Note:** PayPal webhook support deferred to future story. Booking status (ViewingRequest.status) remains separate from payment status.

> **P3-5 baseline:** 605 tests, all COCO gates green; Stripe payments end-to-end (session + webhook) working at backend level.

---

### P3-6 — Booking-Aware Payment Transitions ✅ IMPLEMENTED

> When a Stripe payment completes or is refunded, the linked ViewingRequest
> status transitions automatically — no manual confirmation needed.

**Rules:**

| Payment Event | Viewing Status Before | Viewing Status After | Reason |
|---|---|---|---|
| `COMPLETED` | `PENDING` | `CONFIRMED` | Auto-confirmed: payment completed |
| `REFUNDED` | `CONFIRMED` | `CANCELLED` | Auto-cancelled: payment refunded |

All other viewing statuses are left unchanged (e.g. a refund on a COMPLETED
viewing is a no-op — the viewing already happened).

**New files:**
- `service/PaymentDomainListener.java` — reacts to payment status changes, applies booking transitions via `onPaymentCompleted(tx)` / `onPaymentRefunded(tx)`
- `test/service/PaymentDomainListenerTest.java` — 12 tests: happy-path confirm + cancel, all non-matching status combinations, no-linked-viewing-request cases

**Modified files:**
- `repository/ViewingRequestRepository.java` — added `findByPaymentTransactionId(Long)` query
- `service/StripeWebhookService.java` — injected `PaymentDomainListener`; calls `onPaymentCompleted` after checkout.session.completed, `onPaymentRefunded` after charge.refunded
- `test/service/StripeWebhookServiceTest.java` — added `PaymentDomainListener` mock, updated constructor, added listener verification to checkout/refund tests

**Tests added:** 12 new tests (617 total, 0 failures)

**Schema change:** None

**COCO coverage after P3-6:**
| Layer | Coverage / Gate |
|---|---|
| security | 100.0% / 95% ✅ |
| controller | 99.2% / 99% ✅ |
| config | 48.1% / 20% ✅ |
| service | 99.1% / 99% ✅ |
| dto | 99.1% / 20% ✅ |
| overall | 85.9% / 60% ✅ |

---

### P3-7 — PayPal Integration (Dual Provider) ✅ IMPLEMENTED

> Full PayPal parity with Stripe — the payment infrastructure now supports two
> providers via a `PaymentProviderRouter` that resolves the correct client by
> provider name. Orders are created via the PayPal Checkout SDK v2.

**New production files:**
- `config/PayPalConfig.java` — PayPal SDK configuration (clientId, clientSecret, mode, URLs, webhookId); creates `PayPalHttpClient` bean
- `service/PayPalPaymentProviderClient.java` — implements `PaymentProviderClient`; creates PayPal Order via `OrdersCreateRequest`, extracts approval URL
- `service/PaymentProviderRouter.java` — resolves `PaymentProviderClient` by provider name (`"stripe"` / `"paypal"`); replaces single-client injection
- `service/PayPalWebhookService.java` — processes PayPal webhook events: `CHECKOUT.ORDER.APPROVED` → COMPLETED, `PAYMENT.CAPTURE.COMPLETED` → COMPLETED, `PAYMENT.CAPTURE.DENIED` → FAILED, `PAYMENT.CAPTURE.REFUNDED` → REFUNDED
- `controller/PayPalWebhookController.java` — `POST /api/payments/paypal/webhook`; unauthenticated endpoint

**New test files:**
- `test/service/PayPalPaymentProviderClientTest.java` — 6 tests (success, IOException wrapping, order request fields, no approve link, URLs from config)
- `test/service/PayPalWebhookServiceTest.java` — 9 tests (all 4 event types, unknown event, malformed payload, missing event_type, missing resource, missing resource id)
- `test/controller/PayPalWebhookControllerTest.java` — 4 tests (valid event, invalid payload, empty payload, no auth required)
- `test/service/PaymentProviderRouterTest.java` — 7 tests (stripe/paypal resolve, case-insensitive, null/blank/unknown throws)

**Modified files:**
- `build.gradle` — added `com.paypal.sdk:checkout-sdk:1.0.5`
- `config/SecurityConfig.java` — added `POST /api/payments/paypal/webhook` to permitAll list
- `service/ViewingRequestServiceImpl.java` — replaced `PaymentProviderClient` field with `PaymentProviderRouter`; resolves provider dynamically
- `test/service/ViewingRequestServiceExtendedTest.java` — added `PaymentProviderRouter` mock; updated 3 payment session tests

**Tests added:** 26 new tests (643 total, 0 failures)

**Schema change:** None

**COCO coverage after P3-7:**
| Layer | Coverage / Gate |
|---|---|
| security | 100.0% / 95% ✅ |
| controller | 99.2% / 99% ✅ |
| config | 48.9% / 20% ✅ |
| service | 99.0% / 99% ✅ |
| dto | 99.1% / 20% ✅ |
| overall | 86.3% / 60% ✅ |

---

### P3-8 — Payment Audit Logging

> Every payment state change is logged for compliance and debugging.

**New files:**
- `model/PaymentAuditLog.java` — entity: transactionId, action, previousStatus, newStatus, ipAddress, userAgent, timestamp
- `repository/PaymentAuditLogRepository.java`

**Modified files:**
- `PaymentTransactionServiceImpl.java` — log every `updateStatus()` call
- `WebhookController` — log incoming webhook events

**Endpoints:**
- `GET /api/admin/payments/audit?transactionId={id}` — admin-only audit trail

**Tests expected:** ~3–4

**Schema change:** New table `payment_audit_logs`  
**Risk:** Low

---

### P3-9 — Payment Listing + Status Endpoints

> User-facing: "my payments" and per-booking payment status.

**Endpoints:**
- `GET /api/payments/my` — authenticated user's payment history (paged)
- `GET /api/payments/{id}` — single transaction detail (owner or admin)
- `GET /api/viewing-requests/{id}/payment-status` — quick check: `{ required, paid, transactionId, status }`

**Tests expected:** ~5–6

**Schema change:** None  
**Risk:** Low

---

### P3-10 — Admin Payment Management

> Admin-only endpoints for viewing all payments, issuing refunds.

**Endpoints:**
- `GET /api/admin/payments` — all transactions (paged, filterable by status/provider)
- `POST /api/admin/payments/{id}/refund` — initiate refund via provider API
- `PATCH /api/admin/payments/{id}/status` — manual status override (with audit log)

**Tests expected:** ~5–6

**Schema change:** None  
**Risk:** Medium — refund API calls to external providers

---

## Recommended Implementation Order

| Order | Story | Rationale |
|-------|-------|-----------|
| 1 | **P3-1** PaymentTransaction entity ✅ | Foundation — zero external deps, pure domain model |
| 2 | **P3-2** Wire ViewingRequest ↔ PaymentTransaction ✅ | Thin join; makes booking payment-aware without breaking existing tests |
| 3 | **P3-3** Payment session endpoints ✅ | Stub endpoints ready for provider wiring |
| 4 | **P3-4** Stripe integration ✅ | Real Stripe SDK wired into existing session endpoint |
| 5 | **P3-5** Webhook endpoints ✅ | Stripe webhooks close the payment loop |
| 6 | **P3-6** Booking-aware transitions ✅ | Auto-confirm/cancel viewings on payment events |
| 7 | **P3-7** PayPal Integration ✅ | Dual-provider parity with Stripe via PaymentProviderRouter |
| 8 | **P3-8** Payment Audit Log | Audit table needs to be ready before admin tools |
| 9 | **P3-9** Payment listing + status endpoints | User-facing read endpoints — low risk |
| 10 | **P3-10** Admin payment management | Admin tools after both providers are working |

---

## Estimated Totals

| Metric | Value |
|--------|-------|
| New entities | 2 (`PaymentTransaction`, `PaymentAuditLog`) |
| New tables (JPA auto-DDL) | 2 (`payment_transactions`, `payment_audit_logs`) |
| Modified entities | 1 (`ViewingRequest` — 2 new columns) |
| New controllers | 1–2 (`PaymentController`, `WebhookController`) |
| New endpoints | ~15–18 |
| New service interfaces | ~4 (`PaymentTransactionService`, `PayPalService`, `StripeService`, `WebhookVerificationService`) |
| New test cases | ~40–55 |
| Expected post-Phase-3 endpoint count | ~96–99 |

---

## COCO Impact Assessment

All new code follows existing patterns:
- Controller tests via `@WebMvcTest` with `@MockBean`
- Service tests via `@ExtendWith(MockitoExtension.class)` with `@InjectMocks`
- Webhook endpoints excluded from JWT via `SecurityConfig.filterChain()` permit list
- Each story must pass `.\gradlew.bat testWithCoverage checkCoco` before merge

Expected post-Phase-3 test count: **~555–570 tests**  
Expected COCO gates: all green (service ≥ 99%, controller ≥ 99%)

---

## Phase 3 Core Goals — DONE ✅

> **Consolidated:** 2026-02-22

Phase 3 core payment infrastructure is **complete**. The dual-provider payment
system is fully operational with booking-aware transitions.

| Metric | Value |
|--------|-------|
| Tests | **643** (0 failures, 0 skipped) |
| Endpoints | **85** across **14** controllers |
| Providers | Stripe + PayPal (routed via `PaymentProviderRouter`) |
| Booking automation | `PaymentDomainListener` auto-CONFIRMED / auto-CANCELLED |
| COCO overall | **86.3%** / 60% ✅ |
| COCO service | **99.0%** / 99% ✅ |
| COCO controller | **99.2%** / 99% ✅ |
| COCO security | **100.0%** / 95% ✅ |

### Implemented stories (P3-1 through P3-7)

| Story | Summary |
|-------|---------|
| P3-1 | `PaymentTransaction` entity + `PaymentTransactionService` |
| P3-2 | `ViewingRequest` ↔ `PaymentTransaction` linkage (`paymentRequired`, FK) |
| P3-3 | Payment session + status endpoints on `ViewingRequestController` |
| P3-4 | Stripe SDK integration (`StripePaymentProviderClient`) |
| P3-5 | Stripe webhook endpoint + `StripeWebhookService` |
| P3-6 | `PaymentDomainListener` — auto PENDING→CONFIRMED, auto CONFIRMED→CANCELLED |
| P3-7 | PayPal SDK integration (`PayPalPaymentProviderClient`, `PaymentProviderRouter`, `PayPalWebhookController`) |

---

## Post-Phase 3 Backlog

Items below are **optional enhancements** — not required for the thesis demo.
They are captured here for future reference if needed.

| # | Item | Priority | Description |
|---|------|----------|-------------|
| B-1 | **Admin payment listing** | Medium | `GET /api/admin/payments` — paged, filterable by status/provider. See P3-10. |
| B-2 | **Admin refund endpoint** | Medium | `POST /api/admin/payments/{id}/refund` — initiate refund via provider API. See P3-10. |
| B-3 | **Payment audit logging** | Low | `PaymentAuditLog` entity recording every status change with IP, user-agent, timestamp. See P3-8. |
| B-4 | **User payment history** | Low | `GET /api/payments/my` — authenticated user's payment history (paged). See P3-9. |
| B-5 | **Retry / resume for FAILED payments** | Low | Frontend-driven: call session endpoint again (backend creates new transaction). No backend changes needed. |
| B-6 | **PayPal webhook signature verification** | Low | Use PayPal Notifications SDK with `PAYPAL_WEBHOOK_ID` for production hardening. |
| B-7 | **Idempotency keys** | Low | Prevent duplicate transactions on network retries. |
| B-8 | **Payment reporting / analytics** | Low | Aggregate payment stats for admin dashboard. |

---

## First Story Sketch: P3-1 — PaymentTransaction Model

### Entity: `PaymentTransaction`

```java
@Entity
@Table(name = "payment_transactions", indexes = {
    @Index(name = "idx_pt_user", columnList = "user_id"),
    @Index(name = "idx_pt_viewing_request", columnList = "viewing_request_id"),
    @Index(name = "idx_pt_provider_order", columnList = "provider, provider_order_id"),
    @Index(name = "idx_pt_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentTransaction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viewing_request_id")
    private ViewingRequest viewingRequest;  // nullable — payment may exist without booking

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentProvider provider;       // PAYPAL, STRIPE

    @Column(name = "provider_order_id", length = 255)
    private String providerOrderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status;           // CREATED, PENDING, COMPLETED, FAILED, REFUNDED

    @Column(nullable = false, precision = 10, scale = 2)
    private java.math.BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;                // ISO 4217

    @Column(length = 500)
    private String description;

    @Column(name = "provider_metadata", columnDefinition = "TEXT")
    private String providerMetadata;        // JSON from provider

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    public enum PaymentProvider { PAYPAL, STRIPE }
    public enum PaymentStatus { CREATED, PENDING, COMPLETED, FAILED, REFUNDED }
}
```

### Integration Points (P3-1 scope)

- `PaymentTransaction` references `User` and `ViewingRequest` but does NOT modify them
- `ViewingRequest` is NOT touched in P3-1 (that's P3-2)
- No controller endpoints in P3-1 — pure domain + service layer
- All methods return `PaymentTransactionDto` (no entity leaks)

### Service: `PaymentTransactionService`

```java
public interface PaymentTransactionService {
    PaymentTransactionDto createTransaction(Long userId, Long viewingRequestId,
            String provider, BigDecimal amount, String currency, String description);
    PaymentTransactionDto updateStatus(Long transactionId, String newStatus, String providerMetadata);
    PaymentTransactionDto getById(Long transactionId, Long userId);
    List<PaymentTransactionDto> getByViewingRequest(Long viewingRequestId, Long userId);
    Page<PaymentTransactionDto> getByUser(Long userId, Pageable pageable);
}
```

### Test Plan (P3-1)

| # | Test | Expected |
|---|------|----------|
| 1 | createTransaction_success | Saves entity, returns DTO with CREATED status |
| 2 | createTransaction_userNotFound | IllegalArgumentException |
| 3 | createTransaction_viewingRequestNotFound | IllegalArgumentException |
| 4 | createTransaction_nullViewingRequest_success | Allows null VR (standalone payment) |
| 5 | updateStatus_success | Status transitions correctly, completedAt set for COMPLETED |
| 6 | updateStatus_transactionNotFound | IllegalArgumentException |
| 7 | updateStatus_invalidTransition | IllegalStateException (e.g. COMPLETED → CREATED) |
| 8 | getById_success | Returns DTO |
| 9 | getById_notOwner | SecurityException |
| 10 | getByViewingRequest_success | Returns list of transaction DTOs |
| 11 | getByUser_success | Returns paged list |
