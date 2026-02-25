# Deployment Checklist — Phase 3 Payments

> **Created:** 2026-02-22 (Post-Phase 3 Consolidation)  
> **Updated:** 2026-02-23 (FTL Block Closure — 807 tests)  
> **Backend baseline:** 807 tests, 0 failures, all COCO gates green  
> **Providers:** Stripe + PayPal (dual provider via PaymentProviderRouter)

---

## 1  Environment Variables

### 1.1  Stripe

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `STRIPE_SECRET_KEY` | ✅ | `sk_test_51...` / `sk_live_51...` | Server-side API key |
| `STRIPE_PUBLISHABLE_KEY` | ✅ | `pk_test_51...` / `pk_live_51...` | Exposed to frontend (not sensitive) |
| `STRIPE_SUCCESS_URL` | ✅ | `https://sichrplace.com/payments/success` | Redirect after successful Stripe checkout |
| `STRIPE_CANCEL_URL` | ✅ | `https://sichrplace.com/payments/cancel` | Redirect if user cancels Stripe checkout |
| `STRIPE_WEBHOOK_SECRET` | ✅ | `whsec_...` | Used for signature verification on webhook endpoint |

### 1.2  PayPal

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `PAYPAL_CLIENT_ID` | ✅ | `AX...` | PayPal app client ID |
| `PAYPAL_CLIENT_SECRET` | ✅ | `EL...` | PayPal app client secret |
| `PAYPAL_MODE` | ✅ | `sandbox` / `live` | Determines PayPal environment |
| `PAYPAL_SUCCESS_URL` | ✅ | `https://sichrplace.com/payments/success` | Redirect after PayPal approval |
| `PAYPAL_CANCEL_URL` | ✅ | `https://sichrplace.com/payments/cancel` | Redirect if user cancels PayPal |
| `PAYPAL_WEBHOOK_ID` | Optional | `WH-...` | PayPal webhook ID for signature verification (production hardening) |

### 1.3  General (existing — no changes needed for Phase 3)

| Variable | Required | Notes |
|----------|----------|-------|
| `JWT_SECRET` | ✅ | At least 64 characters (HMAC-SHA512) |
| `LOCAL_DB_USER` / `LOCAL_DB_PASS` | ✅ | Database credentials |
| Spring datasource URL | ✅ | MSSQL connection string |

### 1.4  Feature Flags

| Variable | Default | Notes |
|----------|---------|-------|
| `features.smart-matching.enabled` | `true` | Tenant/landlord matching scoring |
| `features.secure-payments.enabled` | `true` | Payment processing (Stripe/PayPal) |
| `features.google-maps.enabled` | `false` | Google Maps integration |
| `features.chat.enabled` | `true` | Conversation/messaging system |
| `features.viewing-requests.enabled` | `true` | Viewing request flow |
| `features.booking-requests.enabled` | `true` | Booking request flow |
| `features.gdpr.enabled` | `true` | GDPR consent and data export |
| `features.email-automation.enabled` | `false` | Automated email notifications |

### 1.5  Rate Limiting

| Variable | Default | Notes |
|----------|---------|-------|
| `app.ratelimit.capacity` | `10` | Token bucket capacity per IP |
| `app.ratelimit.refillTokens` | `10` | Tokens added per refill cycle |
| `app.ratelimit.refillSeconds` | `60` | Refill cycle duration (seconds) |

### 1.6  CORS & Security

| Variable | Default | Notes |
|----------|---------|-------|
| `app.cors.allowed-origins` | `http://localhost:3000,http://localhost:8080` | Comma-separated allowed origins |
| `app.login.maxFailedAttempts` | `5` | Account lockout threshold |
| `app.login.lockoutMinutes` | `30` | Lockout duration |

### 1.7  Google Maps

| Variable | Default | Notes |
|----------|---------|-------|
| `GOOGLE_MAPS_API_KEY` | _(empty)_ | Required if `features.google-maps.enabled=true` |
| `GEOCODING_ENABLED` | `true` | Enable/disable geocoding service |

---

## 2  Webhook Endpoints

### 2.1  Stripe Webhook

| Setting | Value |
|---------|-------|
| **Endpoint URL** | `https://<your-domain>/api/payments/stripe/webhook` |
| **HTTP method** | POST |
| **Authentication** | None (protected by `Stripe-Signature` header verification) |
| **Backend class** | `StripeWebhookController` → `StripeWebhookService` |

**Required event types to subscribe in Stripe Dashboard:**

| Event | Backend action |
|-------|---------------|
| `checkout.session.completed` | Marks PaymentTransaction → `COMPLETED`; triggers `PENDING → CONFIRMED` on ViewingRequest |
| `payment_intent.payment_failed` | Marks PaymentTransaction → `FAILED` |
| `charge.refunded` | Marks PaymentTransaction → `REFUNDED`; triggers `CONFIRMED → CANCELLED` on ViewingRequest |

**Stripe Dashboard setup:**
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks).
2. Click "Add endpoint".
3. Enter: `https://<your-domain>/api/payments/stripe/webhook`
4. Select events: `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`.
5. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET` env var.

### 2.2  PayPal Webhook

| Setting | Value |
|---------|-------|
| **Endpoint URL** | `https://<your-domain>/api/payments/paypal/webhook` |
| **HTTP method** | POST |
| **Authentication** | None (secured by PayPal IP allow-list and webhook ID verification) |
| **Backend class** | `PayPalWebhookController` → `PayPalWebhookService` |

**Required event types to subscribe in PayPal Developer Dashboard:**

| Event | Backend action |
|-------|---------------|
| `CHECKOUT.ORDER.APPROVED` | Marks PaymentTransaction → `COMPLETED`; triggers `PENDING → CONFIRMED` on ViewingRequest |
| `PAYMENT.CAPTURE.COMPLETED` | Marks PaymentTransaction → `COMPLETED`; triggers `PENDING → CONFIRMED` on ViewingRequest |
| `PAYMENT.CAPTURE.DENIED` | Marks PaymentTransaction → `FAILED` |
| `PAYMENT.CAPTURE.REFUNDED` | Marks PaymentTransaction → `REFUNDED`; triggers `CONFIRMED → CANCELLED` on ViewingRequest |

**PayPal Developer Dashboard setup:**
1. Go to [PayPal Developer → My Apps & Credentials](https://developer.paypal.com/dashboard/applications/).
2. Select your app.
3. Under "Webhooks", click "Add Webhook".
4. Enter: `https://<your-domain>/api/payments/paypal/webhook`
5. Select events: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`.
6. Copy the webhook ID → set as `PAYPAL_WEBHOOK_ID` env var (optional, for signature verification).

---

## 3  HTTPS Requirement

Both Stripe and PayPal **require HTTPS** for webhook endpoints in production.

- Ensure TLS is terminated at the load balancer / reverse proxy (nginx, Cloudflare, etc.).
- The Spring Boot app itself can run on HTTP behind the proxy.
- For local development / sandbox testing, use [Stripe CLI](https://stripe.com/docs/stripe-cli) or [ngrok](https://ngrok.com) to expose `localhost:8080`.

---

## 4  Deployment Verification Checklist

### 4.1  Pre-deployment

| # | Task | Status |
|---|------|--------|
| 1 | All env vars set in deployment environment | ☐ |
| 2 | `STRIPE_SECRET_KEY` is for the correct environment (test vs live) | ☐ |
| 3 | `PAYPAL_MODE` matches environment (`sandbox` for staging, `live` for production) | ☐ |
| 4 | `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` point to deployed frontend URLs | ☐ |
| 5 | `PAYPAL_SUCCESS_URL` / `PAYPAL_CANCEL_URL` point to deployed frontend URLs | ☐ |
| 6 | Database is accessible and JPA `ddl-auto: update` has run | ☐ |
| 7 | Stripe webhook endpoint configured in Stripe Dashboard | ☐ |
| 8 | PayPal webhook endpoint configured in PayPal Developer Dashboard | ☐ |
| 9 | Both webhook URLs are reachable over HTTPS from provider servers | ☐ |

### 4.2  Smoke Test — Stripe

| # | Step | Expected result | Status |
|---|------|-----------------|--------|
| 1 | Call `POST /api/viewing-requests/{id}/payments/session` with `{"provider":"stripe"}` | 201 with `redirectUrl` to Stripe Checkout | ☐ |
| 2 | Open `redirectUrl` in browser | Stripe Checkout page loads | ☐ |
| 3 | Pay with test card `4242 4242 4242 4242` | Redirected to `SUCCESS_URL` | ☐ |
| 4 | Check `GET /api/viewing-requests/{id}/payments/status` | `{ "status": "COMPLETED" }` | ☐ |
| 5 | Verify ViewingRequest status | Transitioned from `PENDING` → `CONFIRMED` | ☐ |
| 6 | Issue test refund via Stripe Dashboard | Webhook fires `charge.refunded` | ☐ |
| 7 | Check ViewingRequest status after refund | Transitioned from `CONFIRMED` → `CANCELLED` | ☐ |

### 4.3  Smoke Test — PayPal

| # | Step | Expected result | Status |
|---|------|-----------------|--------|
| 1 | Call `POST /api/viewing-requests/{id}/payments/session` with `{"provider":"paypal"}` | 201 with `redirectUrl` to PayPal approval page | ☐ |
| 2 | Open `redirectUrl` in browser | PayPal sandbox login / approval page loads | ☐ |
| 3 | Approve payment with sandbox account | Redirected to `SUCCESS_URL` | ☐ |
| 4 | Check `GET /api/viewing-requests/{id}/payments/status` | `{ "status": "COMPLETED" }` | ☐ |
| 5 | Verify ViewingRequest status | Transitioned from `PENDING` → `CONFIRMED` | ☐ |

---

## 5  SecurityConfig — Webhook Permit List

Both webhook endpoints are configured as `permitAll()` in `SecurityConfig.java`:

```java
.requestMatchers(HttpMethod.POST, "/api/payments/stripe/webhook").permitAll()
.requestMatchers(HttpMethod.POST, "/api/payments/paypal/webhook").permitAll()
```

- Stripe webhooks are secured by `Stripe-Signature` header verification (`STRIPE_WEBHOOK_SECRET`).
- PayPal webhooks are secured by PayPal's event delivery system; production hardening should add
  [webhook signature verification](https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/#verify-event-notifications) using `PAYPAL_WEBHOOK_ID`.

---

## 6  Production Hardening Recommendations

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 1 | PayPal webhook signature verification | High | Use PayPal Notifications SDK with `PAYPAL_WEBHOOK_ID` |
| 2 | Idempotency keys on payment session creation | Medium | Prevent duplicate transactions on network retries |
| 3 | Rate limiting on webhook endpoints | Medium | Protect against replay attacks |
| 4 | Logging / alerting on webhook failures | Medium | Monitor for provider delivery issues |
| 5 | Secrets in a vault (Azure Key Vault / AWS Secrets Manager) | Medium | Don't store in plain env vars in production |
| 6 | IP allow-listing for PayPal webhooks | Low | Additional defence layer |

---

## 7  FTL Readiness Statement

> **Date:** 2026-02-23 · **Tests:** 807 · **Failures:** 0 · **COCO:** All GREEN

The backend is deployment-ready with the following hardening in place:

- **Stripe webhook idempotency:** Webhook events are verified via `Stripe-Signature` header; duplicate event delivery is handled gracefully
- **PayPal webhook verification:** Event delivery secured; production should add full signature verification (see §6 item 1)
- **Locale hardening:** All 14 `.toUpperCase()` call sites use `Locale.ROOT` — eliminates Turkish-I class of bugs
- **Rate limiting:** Login + sensitive endpoints protected with automatic 429/423 responses
- **JWT security:** Stateless authentication with token refresh; no session cookies

**Pre-deploy verification command:**
```
.\gradlew.bat clean testWithCoverage checkCoco --no-daemon --console=plain
```
