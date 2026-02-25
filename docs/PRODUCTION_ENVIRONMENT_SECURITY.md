# Production Environment Security Guide

> **Last updated:** 2026-02-23 (FTL Endgame)
> **Status:** All security hardening complete — Sprints 1–8

---

## 1. Environment Variables — Complete Registry

### 1.1 Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOCAL_DB_USER` | Yes | `sichrplace_user` | MSSQL database username |
| `LOCAL_DB_PASS` | Yes | `changeme` | MSSQL database password |
| `spring.datasource.url` | Yes | `jdbc:sqlserver://localhost:1433;databaseName=sichrplace;encrypt=true;trustServerCertificate=true` | JDBC connection string |

### 1.2 JWT / Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | dev-only placeholder | HMAC-SHA512 secret (min 64 chars in production) |
| `app.jwtSecretPrevious` | No | _(empty)_ | Previous JWT secret for key rotation |
| `app.jwtExpirationMs` | No | `86400000` (24h) | Access token lifetime |
| `app.jwtRefreshExpirationMs` | No | `604800000` (7d) | Refresh token lifetime |
| `app.refreshTokenExpirationDays` | No | `14` | Refresh token DB expiry |

### 1.3 Stripe Payments

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | Yes | `sk_test_placeholder` | Stripe API secret key |
| `STRIPE_PUBLISHABLE_KEY` | Yes | `pk_test_placeholder` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes | `whsec_test_placeholder` | Stripe webhook signing secret |
| `STRIPE_SUCCESS_URL` | No | `http://localhost:3000/payments/success` | Payment success redirect |
| `STRIPE_CANCEL_URL` | No | `http://localhost:3000/payments/cancel` | Payment cancel redirect |

### 1.4 PayPal Payments

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PAYPAL_CLIENT_ID` | Yes | `sb-test-placeholder` | PayPal client ID |
| `PAYPAL_CLIENT_SECRET` | Yes | `sb-test-secret-placeholder` | PayPal client secret |
| `PAYPAL_MODE` | No | `sandbox` | `sandbox` or `live` |
| `PAYPAL_SUCCESS_URL` | No | `http://localhost:3000/payments/success` | Payment success redirect |
| `PAYPAL_CANCEL_URL` | No | `http://localhost:3000/payments/cancel` | Payment cancel redirect |
| `PAYPAL_WEBHOOK_ID` | Yes | _(empty)_ | PayPal webhook ID for signature verification |

### 1.5 Google Maps

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_MAPS_API_KEY` | No | _(empty)_ | Google Maps API key |
| `GEOCODING_ENABLED` | No | `true` | Enable/disable geocoding |

### 1.6 Email

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `app.email.from` | No | `noreply@sichrplace.de` | Sender email address |
| `spring.mail.host` | Yes (prod) | _(none)_ | SMTP server hostname |
| `spring.mail.port` | Yes (prod) | _(none)_ | SMTP server port |
| `spring.mail.username` | Yes (prod) | _(none)_ | SMTP authentication username |
| `spring.mail.password` | Yes (prod) | _(none)_ | SMTP authentication password |

### 1.7 CORS

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `app.cors.allowed-origins` | No | `http://localhost:3000,http://localhost:8080` | Comma-separated allowed origins |

### 1.8 Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `app.ratelimit.capacity` | No | `10` | Token bucket capacity per IP |
| `app.ratelimit.refillTokens` | No | `10` | Tokens added per refill cycle |
| `app.ratelimit.refillSeconds` | No | `60` | Refill cycle duration (seconds) |

### 1.9 Feature Flags

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `features.smart-matching.enabled` | No | `true` | Tenant/landlord matching |
| `features.secure-payments.enabled` | No | `true` | Payment processing |
| `features.google-maps.enabled` | No | `false` | Maps integration |
| `features.chat.enabled` | No | `true` | Conversation system |
| `features.viewing-requests.enabled` | No | `true` | Viewing request flow |
| `features.booking-requests.enabled` | No | `true` | Booking request flow |
| `features.gdpr.enabled` | No | `true` | GDPR consent and data export |
| `features.email-automation.enabled` | No | `false` | Automated email notifications |

### 1.10 Login Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `app.login.maxFailedAttempts` | No | `5` | Account lockout threshold |
| `app.login.lockoutMinutes` | No | `30` | Lockout duration |

---

## 2. Security Architecture

### 2.1 Authentication

- **Mechanism:** Stateless JWT (Bearer token in `Authorization` header)
- **Session:** `SessionCreationPolicy.STATELESS` — no HttpSession created
- **Password hashing:** BCrypt via Spring Security `BCryptPasswordEncoder`
- **Key rotation:** Supports `app.jwtSecretPrevious` for zero-downtime secret rotation
- **Refresh tokens:** Stored in database with device info, pruned on expiry
- **Email verification:** Required before full account access
- **Account lockout:** Configurable max failed attempts + lockout duration

### 2.2 Authorization

- **Method-level:** `@PreAuthorize` with role checks (`ROLE_TENANT`, `ROLE_LANDLORD`, `ROLE_ADMIN`)
- **URL-level:** SecurityFilterChain with explicit `permitAll()` for public endpoints
- **Admin isolation:** `/api/admin/**` requires `ROLE_ADMIN`
- **CSRF:** Disabled (stateless API, no cookie-based auth)

### 2.3 Public Endpoints (No Auth Required)

| Endpoint | Method |
|----------|--------|
| `/api/auth/register` | POST |
| `/api/auth/login` | POST |
| `/api/auth/forgot-password` | POST |
| `/api/auth/reset-password` | POST |
| `/api/auth/verify-email` | GET, POST |
| `/api/auth/resend-verification` | GET, POST |
| `/api/auth/refresh` | POST |
| `/api/auth/users/**` | GET |
| `/api/apartments/**` | GET |
| `/api/maps/**` | GET |
| `/api/feature-flags` | GET |
| `/api/reviews/apartment/**` | GET |
| `/api/health`, `/api/health/db-readiness` | GET |
| `/api/content/**` | GET |
| `/api/gdpr/consent` | POST |
| `/api/payments/stripe/webhook` | POST |
| `/api/payments/paypal/webhook` | POST |
| `/ws/**` | WebSocket |

### 2.4 Rate Limiting

- IP-based token bucket algorithm via `RateLimitingFilter`
- Defaults: 10 requests/minute per IP
- Returns `429 Too Many Requests` when exhausted

### 2.5 Webhook Security

- **Stripe:** Signature verification via `stripe.webhook-secret`
- **PayPal:** Webhook ID verification via `PAYPAL_WEBHOOK_ID`
- **Idempotency:** LRU-based event deduplication (prevents replay attacks)

### 2.6 GDPR Compliance

- User consent tracking with timestamps
- Data export endpoint (user's own data)
- Data deletion endpoint (right to be forgotten)
- All PII access logged

---

## 3. Production Deployment Checklist

### Before Go-Live

- [ ] Set `JWT_SECRET` to a cryptographically random 64+ character string
- [ ] Replace all Stripe `sk_test_` / `pk_test_` keys with live keys
- [ ] Replace PayPal sandbox credentials with production credentials
- [ ] Set `PAYPAL_MODE=live`
- [ ] Configure production SMTP credentials
- [ ] Set `app.cors.allowed-origins` to production domain(s) only
- [ ] Set `spring.jpa.hibernate.ddl-auto=validate` (never `update` in prod)
- [ ] Enable HTTPS on all endpoints
- [ ] Set `features.email-automation.enabled=true` when email templates are ready
- [ ] Review rate limit thresholds for expected traffic

### After Go-Live

- [ ] Monitor `/api/health` and `/api/health/db-readiness` for uptime
- [ ] Set up webhook endpoint URLs in Stripe and PayPal dashboards
- [ ] Verify webhook signature verification is working (check logs)
- [ ] Monitor rate limiting (429 responses in access logs)
- [ ] Set up JWT secret rotation schedule (quarterly recommended)

---

## 4. Turkish Locale Security Fix (Sprint 9)

A locale-sensitive bug was discovered and fixed across 14 call sites where
`.toUpperCase()` was used for `Enum.valueOf()` parsing. On Turkish locale
systems, lowercase `'i'` converts to `'İ'` (dotted capital I) instead of `'I'`,
causing `IllegalArgumentException` on enum parsing.

**Fix:** All 14 instances changed to `.toUpperCase(java.util.Locale.ROOT)`.

**Affected files:** ViewingRequestServiceImpl, BookingRequestServiceImpl,
ConversationReportServiceImpl, ApartmentServiceImpl, AdminServiceImpl,
ViewingRequestController, UserController, PayPalPaymentProviderClient.

See `SECURITY_AND_SECRETS.md` for additional security documentation.

---

## FTL Security Verification

> **Verified:** 2026-02-23 — 807 tests, 0 failures

All security-critical endpoints are exercised by automated tests:
- Authentication (register, login, refresh, logout): full coverage
- Authorization (role-based access, admin-only routes): tested with 401/403 assertions
- Rate-limiting (`429 Too Many Requests`): tested with `Retry-After` header validation
- Account locking (`423 Locked`): tested with unlock-time assertions
- JWT validation (expired, malformed, missing tokens): full negative-path coverage
- CSRF protection: disabled by design (stateless JWT architecture) — documented above
- Stripe webhook signature verification: tested with valid/invalid signatures
- Turkish locale attack vector: hardened across 14 sites — see fix above
