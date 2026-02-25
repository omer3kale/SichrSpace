# Backend Phases 1–3 Summary

> Developer-facing recap — suitable for code review, handover, or frontend alignment.
> Generated after the final Phase 3 green build (643 tests, 0 failures, 86.3 % coverage).

---

## 1. Overview

SichrPlace is a Spring Boot 3.2.2 / Java 21 REST API backed by MSSQL 2025 (H2 in
tests).  It exposes **85 endpoints across 14 controllers**, covering the full
apartment-listing lifecycle: register → browse → favourite → request a viewing →
chat with the landlord → pay (Stripe or PayPal) → auto-confirm → complete or
cancel.  Authentication is stateless JWT (Bearer); real-time messaging is pushed
over WebSocket with a `JwtChannelInterceptor`.

---

## 2. Capabilities by Domain

### Auth & Security
| Capability | Detail |
|---|---|
| Registration / login | Email + password, JWT access + refresh tokens |
| Email verification | `POST /api/auth/verify-email`, resend endpoint |
| Password reset | Forgot-password → reset-password flow |
| Rate limiting | Bucket4j per-endpoint throttle |
| Failed-login tracking | Account lockout after repeated failures |
| CSRF | Disabled (stateless API) |
| CORS | Configured centrally in `SecurityConfig` |
| Role-based access | `ROLE_ADMIN` for `/api/admin/**` |

### Apartments & Listings
* Full CRUD with image-metadata support.
* Public `GET` endpoints (`/api/apartments/**`) are unauthenticated.
* Admin moderation endpoints for listing approval.

### Favourites
* Add / remove / list favourites per user — 100 % feature parity.

### Reviews
* Create / update / delete reviews per apartment.
* Public read (`/api/reviews/apartment/**`) is unauthenticated.

### Viewings
| Status | Transitions to |
|---|---|
| `PENDING` | `CONFIRMED`, `DECLINED`, `CANCELLED` |
| `CONFIRMED` | `COMPLETED`, `CANCELLED` |

* Transition audit trail via `ViewingRequestTransition`.
* `paymentRequired` flag + optional `paymentTransaction` FK.
* Convenience helpers: `isPaid()`, `isPaymentInProgress()`, `isRefunded()`.
* Statistics endpoint for landlord / admin dashboards.

### Conversations & Messaging
* CRUD messages with 24-hour edit window and soft-delete.
* Archive, search, emoji reactions, attachment metadata.
* Conversation-level reporting.
* Real-time push via WebSocket (`/ws/**`).

### Notifications
* In-app notification CRUD, mark-read, bulk operations.

### Saved Searches
* Persist and replay search criteria per user.

### Payments (Phase 3)

**Dual-provider architecture**

```
Frontend
  ↓  POST /api/payments/session  { provider: "stripe"|"paypal", viewingRequestId, amount, currency }
  ↓
PaymentSessionController → PaymentProviderRouter.resolve(provider)
  ├─ StripePaymentProviderClient   (Stripe Java SDK 24.3.0)
  └─ PayPalPaymentProviderClient   (PayPal Checkout SDK 1.0.5)
```

| Entity | Enum values |
|---|---|
| `PaymentTransactionStatus` | `CREATED → PENDING → COMPLETED \| FAILED`, `COMPLETED → REFUNDED` |
| `ViewingStatus` (booking) | `PENDING → CONFIRMED → COMPLETED`, `↘ DECLINED`, `↘ CANCELLED` |

**Webhooks** — each provider has its own controller and service:

| Route | Controller |
|---|---|
| `POST /api/payments/stripe/webhook` | `StripeWebhookController` |
| `POST /api/payments/paypal/webhook` | `PayPalWebhookController` |

Both are `permitAll` in `SecurityConfig` (provider verifies signatures).

**PaymentDomainListener** — event-driven booking transitions:

| Payment event | Booking side-effect |
|---|---|
| `COMPLETED` | `PENDING → CONFIRMED` (auto-confirm) |
| `REFUNDED` | `CONFIRMED → CANCELLED` (auto-cancel) |

Each transition persists a `ViewingRequestTransition` audit record inside a
`@Transactional` boundary.

### Admin
* User management, listing moderation, analytics stubs.
* Protected by `ROLE_ADMIN`.

### Health
* `GET /api/health` — basic liveness.
* `GET /api/health/db-readiness` — database connectivity check.

---

## 3. Metrics (Final Phase 3 Build)

| Metric | Value |
|---|---|
| Tests | **643** (0 failures) |
| Controllers | 14 |
| Endpoints | 85 |
| Overall coverage (COCO) | **86.3 %** (gate 60 %) |
| Security coverage | 100.0 % (gate 95 %) |
| Controller coverage | 99.2 % (gate 99 %) |
| Service coverage | 99.0 % (gate 99 %) |
| DTO coverage | 99.1 % (gate 20 %) |
| Config coverage | 48.9 % (gate 20 %) |
| Model coverage | 96.0 % (gate 12 %) |
| Repository coverage | 1.4 % (gate 0 %) |

---

## 4. Known Follow-ups (Post-Phase 3 Backlog)

| ID | Item |
|---|---|
| B-1 | Admin listing of all payment transactions |
| B-2 | Admin-triggered refund flow |
| B-3 | Audit / event logging (application-level) |
| B-4 | User payment history endpoint |
| B-5 | Retry / resume for interrupted payments |
| B-6 | PayPal webhook signature verification (production hardening) |
| B-7 | Idempotency keys for payment session creation |
| B-8 | Payment reporting / analytics dashboard data |

See also: `DEPLOYMENT_CHECKLIST.md` for env-var matrix,
`FRONTEND_INTEGRATION_PLAN.md` for frontend contract details,
`FEATURE_ROADMAP.md` for the full 24-category gap analysis.

---

*Document generated as part of the Phase 3 backend handover bundle.*
