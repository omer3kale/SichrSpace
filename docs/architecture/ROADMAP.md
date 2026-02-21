# SichrPlace — Full Timeline Roadmap (FTL)

> **Version:** 1.0.0-ftl  
> **Authored:** 2026-02-21  
> **Constraint:** No implementation in this document — planning and sequencing only.  
> **Project:** SichrPlace — Spring Boot 3.2.2 / Java 21 · MSSQL 2025 / PostgreSQL  
> **Current baseline:** 430 tests · controller 99.8% · service 99.4% · security 100% · overall 82.1% COCO  
> **Backend Lock-In Sprint:** ✅ Complete (Phase 0 + Phase 1 hardening shipped 2026-02-21)

---

## Table of Contents

1. [Current State Snapshot](#1-current-state-snapshot)
2. [Roadmap Philosophy & Sequencing Rules](#2-roadmap-philosophy--sequencing-rules)
3. [Phase 0 — Foundation Hardening](#phase-0--foundation-hardening)
4. [Phase 1 — Auth Hardening](#phase-1--auth-hardening)
5. [Phase 2 — Dual Payments (PayPal + Stripe)](#phase-2--dual-payments-paypal--stripe)
6. [Phase 3 — Google Maps Service (Spring Boot Port)](#phase-3--google-maps-service-spring-boot-port)
7. [Phase 4 — Google Forms + Smart Matching Algorithm](#phase-4--google-forms--smart-matching-algorithm)
8. [Phase 5 — Firebase Live Chat (FCM + Realtime)](#phase-5--firebase-live-chat-fcm--realtime)
9. [Phase 6 — GDPR 100% + CORS 100%](#phase-6--gdpr-100--cors-100)
10. [Phase 7 — PWA Full Setup](#phase-7--pwa-full-setup)
11. [Phase 8 — Integration Tests 100%](#phase-8--integration-tests-100)
12. [Phase 9 — AppleMontiCore Production Verification](#phase-9--applemonticore-production-verification)
13. [Phase 10 — Frontend Design Integrity & Responsiveness](#phase-10--frontend-design-integrity--responsiveness)
14. [Phase 11 — Frontend API Wiring (16 Stale Pages)](#phase-11--frontend-api-wiring-16-stale-pages)
15. [Phase 12 — Documentation Strategy](#phase-12--documentation-strategy)
16. [Master Timeline](#master-timeline)
17. [Dependency Graph](#dependency-graph)
18. [Risk Register](#risk-register)

---

## 1. Current State Snapshot

### Backend Completeness

| Layer | Status | Notes |
|-------|--------|-------|
| Spring Boot 3.2.2 / Java 21 | ✅ Running | JAR built, docker-ready |
| 11 Controllers / 66 endpoints | ✅ Complete | All endpoints under JWT |
| Flyway migrations V001–V007 | ✅ Applied | MSSQL-compatible idempotent scripts |
| GlobalExceptionHandler (DB errors) | ✅ Complete | 5 DB handlers + errorCode field |
| Email delivery | ✅ Complete | JavaMailSender SMTP; `spring.mail.*` via env vars |
| Rate limiting | ✅ Complete | Bucket4j per-IP token-bucket; configurable via `app.ratelimit.*` |
| CORS configuration | ✅ Complete | `app.cors.allowed-origins` from `${CORS_ALLOWED_ORIGINS}` env var |
| Refresh token rotation | ✅ Complete | SHA-256 hashed opaque tokens; single-use rotation; 14-day TTL |
| WebSocket support | ❌ Missing | chat.html uses Supabase realtime directly |
| PayPal endpoint | ❌ Missing (Node.js only) | `paypal-integration.js` → old Node.js `/api/paypal` |
| Stripe endpoint | ❌ Missing | `stripe.js` loaded in HTML with zero backend |
| Google Maps endpoint | ❌ Missing (Node.js only) | 4 Node.js services (581+421+386+212 lines) |
| Google Forms webhook | ❌ Missing | No endpoint exists |
| Firebase integration | ❌ Missing | Not referenced anywhere in Spring Boot code |
| GDPR service | ✅ Complete | Art. 7/17/20 endpoints; export, deletion, consent logging |
| Smart matching algorithm | ❌ Missing | No schema, no scoring logic |
| Integration tests (live DB) | ❌ Missing | All tests use H2 / test profile |

### Frontend Completeness

| Area | Status | Count |
|------|--------|-------|
| Total HTML pages | Exists | 43 pages |
| Pages wired to Spring Boot | ⚠️ Partial | 17/43 |
| Pages with stale non-Spring-Boot API calls | ❌ Stale | 16/43 |
| Pages with `@media` breakpoints | ⚠️ Partial | 23/43 |
| Pages with mobile hamburger nav | ❌ Missing | 0/43 |
| Supabase realtime (chat) | ❌ Replace | `chat.html` + `realtime-chat.js` |
| PWA manifest | ⚠️ Partial | `manifest.json` exists, not fully wired |
| Service Worker | ⚠️ Partial | `service-worker.js` exists, incomplete |

### Test Coverage

| Module | Coverage | Target |
|--------|----------|--------|
| controller | 99.8% | ✅ ≥ 99% |
| service | 99.4% | ✅ ≥ 99% |
| security | 100.0% | ✅ ≥ 95% |
| config | 55%+ | ✅ ≥ 20% |
| overall | 82.1% | ✅ ≥ 60% |

---

## 2. Roadmap Philosophy & Sequencing Rules

### Core Principles

1. **No breaking changes to existing 17 wired frontend pages.** The `/api/*` path contract is frozen within minor versions.
2. **Single terminal constraint.** All scripts and commands are designed for sequential single-terminal execution — no parallel shell juggling.
3. **Design integrity is non-negotiable.** CSS variables, Poppins/Roboto fonts, blue/teal palette, and the AppleMontiCore responsive layout must survive every phase.
4. **Test before ship.** Every new endpoint must reach 100% controller coverage before the phase closes.
5. **One database migration per schema change.** Flyway V008 onward for every new table or column.
6. **Documentation keeps pace with code.** Each phase closes with a `docs/` update.

### Sequencing Logic

```
Foundation (Phase 0) → Auth (Phase 1) → Money (Phase 2)
  → External APIs (Phases 3–5) → Compliance (Phase 6)
    → PWA (Phase 7) → Tests (Phase 8) → Design (Phases 9–11)
      → Docs (Phase 12)
```

Phases 0–1 are **blockers**: no payment, external API, or Firebase work begins until auth is hardened. Phases 3–5 can run **in parallel** once Phase 2 is deployed. Phase 8 integration tests are the final gate before Phase 9–12 frontend work begins at scale.

---

## Phase 0 — Foundation Hardening

**Goal:** Close the gaps that would compromise every later phase if left open.  
**Duration estimate:** 3–5 days  
**Blocker for:** All phases

### 0.1 Email Delivery — Real SMTP

| Item | Detail |
|------|--------|
| Current state | `EmailServiceImpl` logs to console only |
| Target | JavaMailSender → Gmail SMTP or SMTP relay (Mailgun/SendGrid) |
| Config | `spring.mail.*` in `application.yml` + environment variable injection via `${SMTP_HOST}` etc. |
| New Flyway | None required |
| Test requirement | `EmailServiceImplSmtpTest` — mock `JavaMailSender.send()` and assert correct MimeMessage construction |
| Pages affected | `forgot-password.html`, `register.html` → password reset and verification emails start working |

### 0.2 Rate Limiting

| Item | Detail |
|------|--------|
| Current state | No rate limiting on any endpoint |
| Target | Bucket4j in-memory rate limiting on `POST /api/auth/*`, `POST /api/users/*/forgot-password`, `POST /api/apartments/search` |
| Library | `com.github.vladimir-bukhtoyarov:bucket4j-core` (already in Spring Boot ecosystem) |
| Config | `@RateLimiter` aspect or `HandlerInterceptor` with configurable limits in `application.yml` |
| New Flyway | None |
| Test requirement | `RateLimitingIntegrationTest` — exceed threshold, assert `429 Too Many Requests` with `Retry-After` header |

### 0.3 CORS — Externalize Origins

| Item | Detail |
|------|--------|
| Current state | Origins hardcoded in `application-local.yml` |
| Target | `${CORS_ALLOWED_ORIGINS}` environment variable; Spring `WebMvcConfigurer` reads from `@Value` list |
| Environments | `local` = `http://localhost:3000,http://localhost:5500`; `prod` = `https://sichrplace.netlify.app,https://sichrplace.de` |
| New Flyway | None |
| Test requirement | `CorsConfigTest` — verify preflight `OPTIONS` response headers for each configured origin |

### 0.4 Flyway `ddl-auto: validate`

| Item | Detail |
|------|--------|
| Current state | `spring.jpa.hibernate.ddl-auto: update` — dangerous in production (auto-alters schema) |
| Target | `ddl-auto: validate` on all profiles except `local` |
| Risk | Schema drift between entities and migration scripts will throw on startup (intentionally) |
| Action required | Run `ddl-auto: update` once locally, capture schema, write Flyway migration to match, then flip to `validate` |
| New Flyway | V008__schema_validate_baseline.sql |

### Phase 0 Exit Criteria

- [x] Real emails sent on password reset and email verification
- [x] `429` returned after threshold on auth endpoints (7 tests in `RateLimitingFilterTest`)
- [x] CORS origins read from environment variable, not hardcoded
- [x] `ddl-auto: validate` on `beta-mssql` and `prod` profiles
- [x] All Phase 0 tests green, COCO gates green (controller 99.8%, service 99.4%, overall 82.1%)

---

## Phase 1 — Auth Hardening

**Goal:** JWT lifecycle is production-grade; every channel (HTTP + WebSocket) is authenticated.  
**Duration estimate:** 4–7 days  
**Blocker for:** Phase 5 (Firebase/WebSocket), Phase 2 (payments require authenticated sessions)

### 1.1 Refresh Token Rotation

| Item | Detail |
|------|--------|
| Current state | JWT is stateless; no refresh — tokens expire and users must re-login |
| Target | `POST /api/auth/refresh` endpoint; opaque refresh token stored as SHA-256 hash in `refresh_tokens` table |
| Schema | `refresh_tokens(id, user_id FK, token_hash VARCHAR(64), expires_at DATETIME2, used BOOLEAN, created_at)` |
| Security properties | Single-use rotation (token invalidated on use, new token issued); 14-day refresh TTL; 15-minute access TTL |
| New Flyway | V009__refresh_tokens.sql |
| Test requirement | `RefreshTokenServiceTest` (6 tests): valid refresh, expired, used, not found, rotation produces new token, old token rejected after rotation |

### 1.2 CSRF Protection

| Item | Detail |
|------|--------|
| Current state | CSRF disabled in `SecurityConfig` (common for stateless JWT APIs) |
| Target | CSRF token endpoint `GET /api/auth/csrf-token` for any form-based pages (landlord dashboard, admin panel) |
| Scope | API endpoints remain CSRF-exempt (Bearer JWT); only HTML form submissions need CSRF token |
| Test requirement | `CsrfIntegrationTest` — POST to form endpoint without token → `403`; with token → `200` |

### 1.3 JWT Secret Rotation Support

| Item | Detail |
|------|--------|
| Current state | `jwt.secret` is a static environment variable set once |
| Target | Support `jwt.secret.previous` (grace period for tokens signed with old secret); log warning if secret is default/insecure |
| Test requirement | `JwtTokenProviderRotationTest` — token signed with old secret validates during grace period; rejected after grace TTL |

### 1.4 WebSocket Authentication (Spring Boot Side)

| Item | Detail |
|------|--------|
| Current state | No WebSocket in Spring Boot |
| Target | `@EnableWebSocketMessageBroker` config; STOMP `CONNECT` frame validated against JWT before subscription is allowed |
| Scope | This is the Spring Boot side only — the Firebase migration (Phase 5) will use Firebase's own auth; this covers the option of a Spring Boot STOMP fallback if Firebase is not yet live |
| New Flyway | None |
| Test requirement | `WebSocketAuthTest` — connect without JWT → disconnect; connect with valid JWT → accept subscription |

### 1.5 Account Lockout

| Item | Detail |
|------|--------|
| Current state | No brute-force protection on `POST /api/auth/login` |
| Target | 5 failed logins within 10 minutes → account locked for 30 minutes; `423 Locked` response with unlock time |
| Schema | Add `failed_login_count INT, locked_until DATETIME2` columns to `users` table |
| New Flyway | V010__user_lockout.sql |
| Test requirement | `AccountLockoutTest` — 5 failures → `423`; 6th attempt still `423`; after TTL → `200` |

### Phase 1 Exit Criteria

- [x] Refresh token rotation working end-to-end (9 tests in `RefreshTokenServiceTest`)
- [ ] CSRF tokens available for form-based flows
- [x] JWT secret rotation grace period implemented (`jwtSecretPrevious` fallback in `JwtTokenProvider`)
- [ ] WebSocket auth config in place (even if Firebase route is preferred)
- [x] Account lockout after 5 failures (4 tests in `AccountLockoutTest`)
- [x] All Phase 1 tests green, COCO gates green (430 tests, 0 failures)

---

## Phase 2 — Dual Payments (PayPal + Stripe)

**Goal:** Both PayPal and Stripe are fully proxied through Spring Boot — no payment logic in frontend JS.  
**Duration estimate:** 5–8 days  
**Depends on:** Phase 1 (auth required for payment session creation)

### 2.1 Payment Architecture Decision

Both payment providers follow the same server-side flow:

```
Frontend → POST /api/payments/{provider}/create-order
        ← Spring Boot returns { orderId, approvalUrl }
Frontend redirects user to approvalUrl (PayPal) or renders Stripe Elements
        ← User completes payment on provider side
Provider webhook → POST /api/webhooks/{provider}
        ← Spring Boot verifies signature, updates DB, emits notification
```

**Why server-side?** The current `paypal-integration.js` embeds the client secret directly in HTML — this is insecure. Moving to server-side ensures:
- No secrets in HTML/JS
- Webhook signature verification (Stripe requires HMAC-SHA256; PayPal uses IPN verification)
- Idempotent payment records in DB

### 2.2 New Schema (Flyway V011)

```
payments(
  id BIGINT PK,
  user_id BIGINT FK → users,
  apartment_id BIGINT FK → apartments,
  provider VARCHAR(20),         -- 'PAYPAL' | 'STRIPE'
  provider_order_id VARCHAR(100),
  status VARCHAR(20),           -- PENDING | COMPLETED | FAILED | REFUNDED
  amount DECIMAL(10,2),
  currency CHAR(3),
  created_at DATETIME2,
  completed_at DATETIME2
)
```

### 2.3 PayPal Integration

| Item | Detail |
|------|--------|
| Existing asset | `paypal-integration.js` (469 lines) in frontend — reference for flow logic |
| Live client ID | `AcPYlXozR8VS9kJSk7rv5MW36lMV66ZMyqZKjM0YVuvt0dJ1cIyHRvDmGeux0qu3gBOh6XswI5gin2WO` — **move to `${PAYPAL_CLIENT_ID}` env var** |
| Spring Boot lib | `com.paypal.sdk:rest-api-sdk` or direct REST calls via `RestTemplate`/`WebClient` |
| Endpoints | `POST /api/payments/paypal/create-order`, `POST /api/payments/paypal/capture/{orderId}`, `POST /api/webhooks/paypal` |
| Config | `${PAYPAL_CLIENT_ID}`, `${PAYPAL_CLIENT_SECRET}`, `${PAYPAL_MODE}` (`sandbox`/`live`) |
| Test requirement | `PayPalServiceTest` (5 tests): create order, capture success, capture failure, webhook valid, webhook invalid signature |

### 2.4 Stripe Integration

| Item | Detail |
|------|--------|
| Existing asset | `stripe.js` loaded in `landlord-dashboard.html` — no backend endpoint |
| Spring Boot lib | `com.stripe:stripe-java:latest` |
| Endpoints | `POST /api/payments/stripe/create-payment-intent`, `POST /api/webhooks/stripe` |
| Config | `${STRIPE_SECRET_KEY}`, `${STRIPE_PUBLISHABLE_KEY}`, `${STRIPE_WEBHOOK_SECRET}` |
| Frontend change | Replace inline `stripe.js` hardcoded key with key fetched from `GET /api/payments/stripe/publishable-key` |
| Test requirement | `StripeServiceTest` (4 tests): create intent, webhook `payment_intent.succeeded`, webhook `payment_intent.failed`, invalid webhook signature |

### 2.5 Frontend Changes (Minimal)

| Page | Change |
|------|--------|
| `landlord-dashboard.html` | Remove hardcoded Stripe publishable key; fetch from API; remove `paypal-integration.js` direct calls |
| Any page with PayPal button | Replace JS SDK order creation with `POST /api/payments/paypal/create-order` |
| New: `payment-success.html` | Confirm page after redirect from PayPal; poll `GET /api/payments/{id}` for status |

### Phase 2 Exit Criteria

- [ ] PayPal live client ID removed from HTML, stored in environment variable
- [ ] `POST /api/payments/paypal/create-order` + capture endpoint working
- [ ] `POST /api/payments/stripe/create-payment-intent` working
- [ ] Webhook signature verification for both providers
- [ ] `payments` table with Flyway V011
- [ ] All Phase 2 tests green, COCO controller still 100%

---

## Phase 3 — Google Maps Service (Spring Boot Port)

**Goal:** Port all 4 Node.js geospatial services to Spring Boot; remove Node.js dependency for maps.  
**Duration estimate:** 5–7 days  
**Depends on:** Phase 0 (CORS config must handle maps API key securely)

### 3.1 Node.js Services to Port

| Node.js File | Lines | Spring Boot Target |
|--------------|-------|--------------------|
| `GoogleMapsService.js` | 581 | `GoogleMapsService.java` + `GoogleMapsController.java` |
| `DirectionsService.js` | 421 | `DirectionsService.java` → merged into `GoogleMapsController` |
| `GeocodingService.js` | 212 | `GeocodingService.java` → `GET /api/maps/geocode` |
| `PlacesService.js` | 386 | `PlacesService.java` → `GET /api/maps/places/nearby` |

### 3.2 New Spring Boot Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/maps/geocode` | GET | Address string → `{lat, lng}` via Google Geocoding API |
| `/api/maps/reverse-geocode` | GET | `{lat, lng}` → address string |
| `/api/maps/directions` | GET | `origin`, `destination`, `mode` → route polyline + duration |
| `/api/maps/places/nearby` | GET | `lat`, `lng`, `radius`, `type` → nearby places list |
| `/api/maps/distance-matrix` | POST | Multiple origins/destinations → distance matrix |

### 3.3 Configuration

| Item | Detail |
|------|--------|
| Config key | `${GOOGLE_MAPS_API_KEY}` — **never in HTML or JS** |
| Spring config | `GoogleMapsConfig.java` with `RestTemplate` bean + API key injection |
| Rate handling | Google Maps API returns `OVER_QUERY_LIMIT` — Spring Boot must return `429` to frontend |
| Caching | `@Cacheable("geocode")` with Caffeine cache (TTL 24h) to reduce API costs |

### 3.4 Frontend Impact

| Page | Change |
|------|--------|
| `apartment-detail.html` | Replace direct Google Maps JS embed with API call to `/api/maps/geocode` + Leaflet.js render |
| `search.html` | Location search uses `/api/maps/geocode` for coordinates |
| `landlord-dashboard.html` | Distance to transport stops via `/api/maps/places/nearby` |

### 3.5 New Schema

| Item | Detail |
|------|--------|
| `apartments` table | Add `latitude DECIMAL(10,7)`, `longitude DECIMAL(10,7)` columns if not already present |
| Flyway | V012__apartments_geo_columns.sql |

### Phase 3 Exit Criteria

- [ ] All 4 Node.js map services ported to Spring Boot
- [ ] Google Maps API key removed from all HTML/JS files
- [ ] `@Cacheable` geocoding reducing redundant API calls
- [ ] Flyway V012 applied
- [ ] `GoogleMapsServiceTest` (6 tests): geocode hit, geocode cache, reverse geocode, directions, places, distance matrix
- [ ] COCO controller still 100%

---

## Phase 4 — Google Forms + Smart Matching Algorithm

**Goal:** Google Forms responses feed a traits DB; a scoring engine drives dashboard matching widgets.  
**Duration estimate:** 6–10 days  
**Depends on:** Phase 3 (geocoding used in distance-weighted matching score), Phase 0 (auth for dashboard endpoints)

### 4.1 Data Collection via Google Forms

| Item | Detail |
|------|--------|
| Approach | Google Apps Script `onFormSubmit` trigger → `POST /api/matching/form-response` |
| Security | HMAC-SHA256 request signature header (`X-Apps-Script-Signature`) validated in Spring Boot |
| Form fields (suggested) | Budget range, preferred districts, move-in date, pet policy, floor preference, transport mode, room count, WG vs single flat, furnished preference |
| New table | `matching_traits` (see below) |

### 4.2 New Schema (Flyway V013)

```
matching_traits(
  id BIGINT PK,
  user_id BIGINT FK → users,
  source VARCHAR(20),           -- 'GOOGLE_FORMS' | 'MANUAL' | 'INFERRED'
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  preferred_districts VARCHAR(500),  -- JSON array of district names
  move_in_from DATE,
  move_in_to DATE,
  pet_allowed BOOLEAN,
  min_floor INT,
  max_floor INT,
  transport_mode VARCHAR(20),   -- 'WALK' | 'BIKE' | 'PUBLIC' | 'CAR'
  max_commute_minutes INT,
  room_count_min INT,
  room_count_max INT,
  wg_acceptable BOOLEAN,
  furnished BOOLEAN,
  created_at DATETIME2,
  updated_at DATETIME2
)
```

### 4.3 Smart Matching Algorithm

**Scoring model (weighted sum, score ∈ [0, 100]):**

| Factor | Weight | Computation |
|--------|--------|-------------|
| Budget fit | 30% | Apartment rent vs `budget_min`/`budget_max` range |
| Distance to preferred districts | 25% | Haversine distance from apartment to preferred district centroid |
| Room count fit | 15% | Exact or within ±1 room |
| Move-in date overlap | 15% | Listing available date vs tenant `move_in_from`/`move_in_to` |
| Amenity match | 10% | Pet policy, furnished, floor range |
| Transport score | 5% | Commute time via Google Maps Directions API ≤ `max_commute_minutes` |

**Algorithm home:** `MatchingEngineService.java` — pure Java, no ML framework required for v1. Score is cached per (user, apartment) pair with a 6h TTL.

### 4.4 New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/matching/form-response` | POST | Receive Google Forms webhook (Apps Script) |
| `/api/matching/traits` | GET | Current user's matching traits |
| `/api/matching/traits` | PUT | Manual override of traits |
| `/api/matching/score/{apartmentId}` | GET | Matching score for current user vs one apartment |
| `/api/matching/recommendations` | GET | Top-N apartments ranked by matching score |
| `/api/matching/dashboard-summary` | GET | Aggregate stats for tenant dashboard widget |

### 4.5 Dashboard Integration

| Dashboard | Widget |
|-----------|--------|
| `tenant-dashboard.html` | "Your Top Matches" — top 5 apartments with scores and match reasons |
| `search.html` | Sort-by-match toggle — re-ranks results by matching score |
| `apartment-detail.html` | Match percentage badge for logged-in tenant |

### Phase 4 Exit Criteria

- [ ] Google Forms webhook receiving and storing traits
- [ ] Scoring engine returning deterministic scores
- [ ] `GET /api/matching/recommendations` returning top-N ranked list
- [ ] Tenant dashboard widget wired to `dashboard-summary` endpoint
- [ ] Flyway V013 applied
- [ ] `MatchingEngineServiceTest` (8 tests): full match, budget miss, date miss, zero traits, all factors, cached score, score invalidated on apartment update, webhook signature security
- [ ] COCO controller still 100%

---

## Phase 5 — Firebase Live Chat (FCM + Realtime)

**Goal:** Replace Supabase realtime with Firebase for live chat; add FCM push notifications.  
**Duration estimate:** 8–12 days (highest complexity phase)  
**Depends on:** Phase 1 (WebSocket auth infrastructure)

### 5.1 Architecture Decision: Firebase vs Spring Boot STOMP

| Option | Pros | Cons |
|--------|------|------|
| **Firebase Firestore + FCM** (recommended) | Zero backend latency for realtime; FCM handles iOS/Android/web push; Google-managed infra | Firebase Admin SDK in Spring Boot required; slight architectural split |
| Spring Boot STOMP + SockJS | Pure Java, no external dependency | Must manage WebSocket scaling, push notifications separate |

**Decision: Firebase Firestore for chat storage + FCM for push.** Spring Boot retains REST API for message history and sends FCM triggers (`AdminMessaging.send()`).

### 5.2 Firebase Admin SDK in Spring Boot

| Item | Detail |
|------|--------|
| Library | `com.google.firebase:firebase-admin:9.x` |
| Config | `FirebaseConfig.java` — `FirebaseApp.initializeApp()` with `ServiceAccount` from `${FIREBASE_SERVICE_ACCOUNT_JSON}` env var |
| New Spring Boot role | Not a chat broker — it issues Firebase custom auth tokens for frontend clients + sends FCM triggers |

### 5.3 New Spring Boot Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/firebase/auth-token` | GET | Issue Firebase custom auth token for authenticated user (JWT required) |
| `/api/firebase/fcm/subscribe` | POST | Register device FCM token for a user |
| `/api/firebase/fcm/unsubscribe` | DELETE | Remove device FCM token |
| `/api/messages/notify` | POST | Internal — triggers FCM push when message stored via REST |

### 5.4 Frontend Migration Plan

| File | Current (Supabase) | Target (Firebase) |
|------|--------------------|-------------------|
| `chat.html` | `supabase.channel()` subscriptions | `onSnapshot()` on Firestore conversation doc |
| `realtime-chat.js` (373 lines) | Supabase realtime client | Firebase JS SDK v9 modular `getFirestore()`, `onSnapshot()` |
| `notifications.html` | Polling `GET /api/notifications` | FCM browser push via Service Worker `firebase-messaging-sw.js` |

### 5.5 Migration Steps (No Breaking Change)

1. Firebase project created; service account JSON secured in env var.
2. `FirebaseConfig.java` initializes Admin SDK on Spring Boot startup.
3. `GET /api/firebase/auth-token` endpoint built and tested.
4. Frontend fetches Firebase custom token on login; signs into Firebase with `signInWithCustomToken()`.
5. New `conversations/{id}/messages` Firestore collection mirrors messages.
6. `realtime-chat.js` rewritten to use `onSnapshot()` — old Supabase code removed.
7. FCM registration on login; `firebase-messaging-sw.js` added.
8. Supabase realtime dependencies removed from all HTML pages.

### 5.6 New Schema

| Item | Detail |
|------|--------|
| Spring Boot DB | No new tables — messages still stored in `messages` table via REST; Firestore is a realtime mirror |
| Firestore structure | `conversations/{conversationId}/messages/{messageId}` document = `{ senderId, text, sentAt, readAt }` |
| FCM tokens table | `user_fcm_tokens(id, user_id FK, fcm_token VARCHAR(200), device_type VARCHAR(20), created_at)` |
| Flyway | V014__user_fcm_tokens.sql |

### Phase 5 Exit Criteria

- [ ] Firebase Admin SDK initialized and tested at Spring Boot startup
- [ ] `GET /api/firebase/auth-token` returns valid custom token
- [ ] FCM push delivered to browser on new message
- [ ] `chat.html` using Firestore `onSnapshot()` — Supabase realtime removed
- [ ] `firebase-messaging-sw.js` registered as service worker
- [ ] Flyway V014 applied
- [ ] `FirebaseServiceTest` (4 tests): custom token issue, FCM subscribe, FCM unsubscribe, push trigger
- [ ] COCO controller still 100%

---

## Phase 6 — GDPR 100% + CORS 100%

**Goal:** Full GDPR compliance ported from Node.js; CORS locked to production origins.  
**Duration estimate:** 4–6 days  
**Depends on:** Phase 0 (CORS externalized), Phase 1 (auth for data export/delete)

### 6.1 GDPR Service Port

Node.js `GdprService.js` (445 lines) + `advancedGdpr.js` routes provide:
- Full data export (all user data as JSON/ZIP)
- Right to erasure (anonymise or hard-delete user data)
- Consent log (timestamped record of user consent actions)
- Data retention enforcement (auto-delete inactive accounts after configurable TTL)

### 6.2 New Spring Boot Endpoints

| Endpoint | Method | GDPR Article | Description |
|----------|--------|-------------|-------------|
| `/api/gdpr/export` | POST | Art. 15 (Access) | Queue data export; email download link |
| `/api/gdpr/export/{jobId}/status` | GET | Art. 15 | Poll export status |
| `/api/gdpr/delete-account` | DELETE | Art. 17 (Erasure) | Anonymise or hard-delete account data |
| `/api/gdpr/consent` | POST | Art. 7 (Consent) | Record consent action (type, timestamp, IP hash) |
| `/api/gdpr/consent-history` | GET | Art. 7 | Return consent audit trail for current user |
| `/api/gdpr/portability` | GET | Art. 20 (Portability) | Return machine-readable JSON of all user data |

### 6.3 New Schema (Flyway V015)

```
consent_log(
  id BIGINT PK,
  user_id BIGINT FK → users,
  consent_type VARCHAR(50),     -- 'COOKIES_ANALYTICS' | 'MARKETING' | 'DATA_SHARING'
  granted BOOLEAN,
  ip_hash VARCHAR(64),          -- SHA-256 of IP — stored, not reversible
  user_agent_hash VARCHAR(64),
  created_at DATETIME2
)

data_export_jobs(
  id BIGINT PK,
  user_id BIGINT FK → users,
  status VARCHAR(20),           -- QUEUED | PROCESSING | READY | EXPIRED
  download_token VARCHAR(100),
  expires_at DATETIME2,
  created_at DATETIME2
)
```

### 6.4 Erasure Logic

| Entity | Erasure strategy |
|--------|-----------------|
| `users` | Anonymise: set `email = 'deleted_{id}@deleted.sichrplace.de'`, null name/phone |
| `messages` | Replace `content` with `[deleted]` |
| `apartment_reviews` | Replace `comment` with `[deleted]` |
| `apartments` | Soft-delete via `deleted_at` timestamp |
| `refresh_tokens` | Hard-delete all tokens for user |
| `user_fcm_tokens` | Hard-delete all tokens |

### 6.5 CORS Final Lockdown

| Environment | Allowed Origins |
|-------------|----------------|
| `local` | `http://localhost:3000`, `http://localhost:5500`, `http://127.0.0.1:5500` |
| `beta-mssql` | `https://sichrplace-beta.netlify.app` |
| `prod` | `https://sichrplace.netlify.app`, `https://www.sichrplace.de` |

All origins from `${CORS_ALLOWED_ORIGINS}` env var — value set per deployment environment.

### 6.6 Cookie Consent Frontend

`cookie-consent.js` (562 lines) currently exists in frontend. It must call `POST /api/gdpr/consent` on accept/reject to store consent in DB (replacing in-memory/localStorage only approach).

### Phase 6 Exit Criteria

- [ ] All 6 GDPR endpoints implemented
- [ ] Consent stored in DB (not only localStorage)
- [ ] Erasure anonymises all PII per table-specific strategy
- [ ] CORS locked to env-var origins on all profiles
- [ ] Flyway V015 applied
- [ ] `GdprServiceTest` (7 tests): export, export status, delete (anonymise), delete (hard), consent store, consent history, portability export
- [ ] COCO controller still 100%

---

## Phase 7 — PWA Full Setup

**Goal:** SichrPlace installable as a Progressive Web App with offline support and app-like experience.  
**Duration estimate:** 3–5 days  
**Depends on:** Phase 5 (Firebase Messaging SW must coexist with app SW)

### 7.1 Current PWA State

| Asset | Status | Gap |
|-------|--------|-----|
| `manifest.json` | Exists | Missing `screenshots` array; `start_url` not optimal |
| `service-worker.js` | Exists | Cache strategy incomplete; no offline fallback page |
| Icons | Exist | Need 192×192 and 512×512 maskable variants |
| Install prompt | Missing | No `beforeinstallprompt` handler |

### 7.2 Service Worker Strategy

| Route type | Cache strategy |
|------------|----------------|
| HTML pages | Network-first (always fresh) → fallback to cache |
| Static assets (CSS, JS, fonts) | Cache-first (long TTL) |
| `/api/*` calls | Network-only (never cached — live data) |
| Offline fallback | `offline.html` served when network fails on HTML request |

### 7.3 Manifest Completion

| Field | Target value |
|-------|-------------|
| `name` | `"SichrPlace — Sichere Wohnungen"` |
| `short_name` | `"SichrPlace"` |
| `start_url` | `"/index.html?pwa=1"` (analytics segmentation) |
| `display` | `"standalone"` |
| `background_color` | `"#1a1a2e"` (matches CSS `--bg-primary`) |
| `theme_color` | `"#00d4ff"` (matches CSS `--accent-primary` teal) |
| `icons` | 72, 96, 128, 144, 152, 192, 384, 512 (with `purpose: "maskable"` on 192+512) |
| `screenshots` | 2 screenshots (desktop + mobile) for install dialog |
| `categories` | `["real-estate", "housing"]` |

### 7.4 Install Prompt

| Page | UI element |
|------|-----------|
| `index.html` | Sticky bottom banner: "Install SichrPlace for quick access" → trigger `prompt()` |
| `tenant-dashboard.html` | One-time banner after first login → prompt to install |

### 7.5 Offline Page

`offline.html` — minimal styled page (matches design system) with:
- SichrPlace logo
- Message: "You're offline. Your saved searches and favorites are available below."
- Offline-available data: render data from Cache API (`user_favorites`, `saved_searches` from last successful fetch)

### Phase 7 Exit Criteria

- [ ] `manifest.json` fully compliant (Lighthouse PWA audit: 100)
- [ ] Service worker caches static assets, serves offline fallback
- [ ] `firebase-messaging-sw.js` and app service worker coexist without conflicts
- [ ] Install prompt shown once per session on index + dashboard
- [ ] `offline.html` styled and served from cache
- [ ] Lighthouse PWA score ≥ 90

---

## Phase 8 — Integration Tests 100%

**Goal:** Every Spring Boot service has ≥1 test against a live MSSQL database profile; COCO overall ≥ 80%.  
**Duration estimate:** 6–10 days  
**Depends on:** Phases 0–6 complete (all new services must exist before integration coverage)

### 8.1 Current Integration Test Gap

All 381 existing tests use `@SpringBootTest` with H2 in-memory or pure unit mocks. Zero tests run against real MSSQL. This means:

- Flyway migrations are never executed in tests (risk of prod migration failures)
- MSSQL-specific SQL (`DATETIME2`, `NEWID()`, top-N syntax) is not validated
- Real connection pool behavior (HikariCP pool exhaustion, DB failover) is untested

### 8.2 New Test Profile (`test-mssql`)

| Config | Value |
|--------|-------|
| Profile name | `test-mssql` |
| Database | MSSQL Docker container spun up by Testcontainers |
| Library | `org.testcontainers:mssqlserver` |
| Flyway | All V001–Vxxx migrations run before test class |
| Seed | `DataSeeder.java` runs on startup (same as `local-mssql`) |

### 8.3 Integration Test Classes (New)

| Test Class | Scope | Tests |
|------------|-------|-------|
| `UserRepositoryIntegrationTest` | User CRUD + password reset token lifecycle against real MSSQL | 8 |
| `ApartmentRepositoryIntegrationTest` | Full-text search, geo queries, specification builder | 6 |
| `ConversationRepositoryIntegrationTest` | Message threading, unread counts | 5 |
| `ViewingRequestLifecycleIntegrationTest` | Full state machine from PENDING → COMPLETED against DB | 7 |
| `PaymentRepositoryIntegrationTest` | Payment status transitions (Phase 2 tables) | 5 |
| `GdprErasureIntegrationTest` | Full erasure path — verify anonymisation in MSSQL | 6 |
| `MatchingEngineIntegrationTest` | Scoring against seeded apartment data | 5 |
| `FlywayMigrationSmokeTest` | All migrations apply without error on fresh schema | 1 |

Total new tests: **43** integration tests.

### 8.4 E2E Contract Tests

For each major API contract, a contract test asserts that the response shape has not changed:

| Contract | Endpoint | Assertion |
|----------|----------|-----------|
| Login response | `POST /api/auth/login` | `{ token, refreshToken, user: { id, email, role } }` |
| Apartment search | `GET /api/apartments/search` | `Page<ApartmentResponseDto>` with all required fields |
| Conversation list | `GET /api/conversations` | `List<ConversationDto>` with `lastMessage`, `unreadCount` |
| Matching recommendations | `GET /api/matching/recommendations` | `List<MatchResult>` with `score`, `apartment`, `matchReasons` |

### 8.5 CI Pipeline Integration

| Step | Detail |
|------|--------|
| Test split | Unit tests run first (fast); integration tests run in separate Gradle task `integrationTest` |
| Docker requirement | CI pipeline must have Docker host — Testcontainers requires it |
| GitHub Actions | `docker: true` in workflow yaml; MSSQL container pulled from `mcr.microsoft.com/mssql/server:2025-latest` |

### Phase 8 Exit Criteria

- [ ] Testcontainers MSSQL profile configured
- [ ] 43 integration tests passing against live MSSQL container
- [ ] 4 contract tests passing
- [ ] `FlywayMigrationSmokeTest` green (all migrations apply on fresh schema)
- [ ] COCO overall ≥ 80%
- [ ] CI pipeline runs integration tests in separate task

---

## Phase 9 — AppleMontiCore Production Verification

**Goal:** Formally verify that the AppleMontiCore design system repository is production-ready for SichrPlace's frontend.  
**Duration estimate:** 2–4 days  
**Depends on:** Phase 10 (responsiveness work uses AppleMontiCore components)

> **Repository:** [https://github.com/omer3kale/AppleMontiCore](https://github.com/omer3kale/AppleMontiCore)

### 9.1 What is AppleMontiCore?

AppleMontiCore is the author's proprietary responsive frontend design system/integration approach used in SichrPlace. From `FRONTEND_INTEGRATION_OVERVIEW.md`:

> *"The author's own design system uses custom responsive components built with HTML, CSS, and vanilla JavaScript. The integration specs map cleanly to this approach."*

It is NOT a third-party library — it is the custom HTML/CSS/JS component approach used across the 43 SichrPlace pages.

### 9.2 Production Verification Checklist

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Repository accessibility | `git clone` in single terminal | Repository clones successfully with no errors |
| Last commit date | `git log --oneline -5` | Active maintenance — last commit within 6 months |
| CSS variable alignment | Compare `--bg-primary`, `--accent-primary`, `--text-primary` etc. with SichrPlace `style.css` | ≥ 90% variable names match between repos |
| Responsive breakpoints | Count `@media` rules in AppleMontiCore vs SichrPlace pages | Same breakpoint set: 480px, 768px, 1024px, 1200px |
| Font stack | Inspect `font-family` declarations | Same Poppins/Roboto fallback chain |
| Component inventory | List all components in AppleMontiCore | Identify which components are used in SichrPlace's 43 pages |
| Component gaps | Compare identified components with 43-page audit | List any SichrPlace UI patterns not covered by AppleMontiCore components |
| Build/bundle step | Check `package.json` or build instructions | AppleMontiCore is plain HTML/CSS/JS — no build step required for prod |
| License compatibility | Check repo license | MIT or proprietary — appropriate for use |
| Production test | Serve a SichrPlace test page with AppleMontiCore assets from a CDN or bundled | Page renders identically on Chrome, Safari, Firefox, Edge |

### 9.3 Outcome Documentation

After verification, create `docs/APPLEMONTICORE_AUDIT.md` with:
- Component inventory table
- Gap analysis (SichrPlace patterns not in AppleMontiCore)
- CSS variable alignment report
- Recommendation: adopt as-is / adopt with patches / diverge

### 9.4 Risk Scenarios

| Risk | Probability | Mitigation |
|------|------------|------------|
| Repository has no `@media` queries | Low | Extract responsive patterns from SichrPlace itself as source of truth |
| CSS variable names diverge significantly | Medium | Create `sichrplace-overrides.css` bridge file |
| Repository has not been updated in >1 year | Medium | Fork to `omer3kale/SichrPlace-DesignSystem`, maintain from there |
| AppleMontiCore requires a build step | Low | Use pre-built outputs from `dist/` |

### Phase 9 Exit Criteria

- [ ] All 10 verification checks documented
- [ ] `docs/APPLEMONTICORE_AUDIT.md` written
- [ ] No CSS variable conflicts with existing 43 pages
- [ ] Production browser compatibility confirmed (4 browsers)
- [ ] Decision recorded: adopt / fork / diverge

---

## Phase 10 — Frontend Design Integrity & Responsiveness

**Goal:** All 43 pages fully responsive; mobile nav implemented; design system integrity maintained.  
**Duration estimate:** 7–10 days  
**Depends on:** Phase 9 (AppleMontiCore verification complete)

### 10.1 Non-Negotiable Design Rules

These rules apply to every page, every sprint, forever:

| Rule | Detail |
|------|--------|
| Color palette | `--bg-primary: #1a1a2e`, `--accent-primary: #00d4ff` (teal), no ad-hoc hex values |
| Typography | Poppins (headings) + Roboto (body) — both via Google Fonts CDN |
| Spacing | 8px grid system — all margins/paddings multiples of 8 |
| No large-scale redesigns | UI refinements (spacing, readability, fix broken layouts) only — no visual overhauls |
| Performance | No image without `loading="lazy"`; no script without `defer` or `async` |

### 10.2 Mobile Navigation (0/43 → 43/43)

All 43 pages need a consistent mobile hamburger navigation:

| Component | Spec |
|-----------|------|
| Breakpoint | `≤ 768px` — hamburger appears, desktop nav hides |
| HTML | `<nav class="mobile-nav">` + `<button class="hamburger" aria-label="Menu">` |
| Behavior | Click opens slide-in `<aside class="nav-drawer">` |
| Close | Click outside drawer OR click ✕ button |
| Accessibility | `aria-expanded`, `aria-controls`, `role="dialog"` on drawer |
| Style | Matches design system — dark `#1a1a2e` background, teal `#00d4ff` active state |

### 10.3 Pages Requiring New Breakpoints (20 pages)

20/43 pages currently have no `@media` rules. Priority order:

| Priority | Pages | Reason |
|----------|-------|--------|
| P1 — Critical | `index.html`, `search.html`, `apartment-detail.html` | Highest traffic |
| P2 — High | `tenant-dashboard.html`, `landlord-dashboard.html`, `login.html`, `register.html` | User-facing core flows |
| P3 — Medium | `chat.html`, `profile.html`, `favorites.html`, `notifications.html` | Feature pages |
| P4 — Low | Remaining 9 pages | Admin, static info pages |

### 10.4 Animation & Micro-Interaction Refinements (Allowed)

| Allowed | Not Allowed |
|---------|------------|
| CSS `transition: all 0.2s ease` on buttons/links | JS animation libraries |
| `transform: translateY(-2px)` on card hover | Changing card layouts |
| Fade-in on page load via `@keyframes fadeIn` | New color schemes |
| Loading skeleton placeholder divs | New font families |

### Phase 10 Exit Criteria

- [ ] All 43 pages have `@media` breakpoints at 480px, 768px, 1024px
- [ ] All 43 pages have mobile hamburger nav
- [ ] Design system CSS variables unchanged
- [ ] Poppins + Roboto on all pages
- [ ] Lighthouse Mobile Performance ≥ 80 on `index.html`, `search.html`, `apartment-detail.html`

---

## Phase 11 — Frontend API Wiring (16 Stale Pages)

**Goal:** 16 pages with stale non-Spring-Boot API calls are fully migrated to Spring Boot endpoints.  
**Duration estimate:** 4–6 days  
**Depends on:** Phase 2 (payments), Phase 5 (Firebase chat), Phase 3 (maps) — those new endpoints must exist first

### 11.1 The 16 Stale Pages

These pages still call old Node.js routes (`/api/paypal`, `/api/admin`, direct Supabase client, etc.):

| Category | Pages | Target Spring Boot Endpoint |
|----------|-------|-----------------------------|
| PayPal | pages calling `paypal-integration.js` old flow | `/api/payments/paypal/*` (Phase 2) |
| Supabase realtime | `chat.html`, `realtime-chat.js` | Firebase Firestore (Phase 5) |
| Google Maps direct | pages with raw Maps JS API calls | `/api/maps/*` (Phase 3) |
| Admin legacy | pages calling old Node.js admin routes | `/api/admin/*` (already exists in Spring Boot) |
| Auth legacy | pages calling old Node.js `/auth/*` | `/api/auth/*` (already exists in Spring Boot) |

### 11.2 Migration Pattern (consistent across all 16 pages)

```javascript
// BEFORE (stale pattern)
const response = await fetch('http://localhost:3001/api/old-endpoint', { ... });

// AFTER (Spring Boot pattern)
const BASE_URL = window.__CONFIG__.apiBaseUrl; // from config.js
const response = await fetch(`${BASE_URL}/api/new-endpoint`, {
  headers: { 'Authorization': `Bearer ${getStoredJwt()}` },
  ...
});
```

### 11.3 `config.js` Centralization

All 43 pages must use `config.js` for base URL — no hardcoded `localhost:3001` anywhere:

```javascript
// config.js
window.__CONFIG__ = {
  apiBaseUrl: 'https://api.sichrplace.de',  // overridden per environment
  firebaseConfig: { ... },                  // populated from backend /api/firebase/config
};
```

### Phase 11 Exit Criteria

- [ ] 0 references to `localhost:3001` or old Node.js routes in frontend HTML/JS
- [ ] 0 direct Supabase client calls outside `chat.html` migration
- [ ] `config.js` is the single source of API base URL
- [ ] All 43 pages wire exclusively to Spring Boot or Firebase

---

## Phase 12 — Documentation Strategy

**Goal:** Comprehensive documentation serving two audiences: developers now, student SaaS builders later.  
**Duration estimate:** 3–5 days (rolling — each phase should update docs)  
**Depends on:** All phases complete

### 12.1 Audience 1: Developer Documentation (Now)

| Document | Content | Location |
|----------|---------|----------|
| API Reference | All 66+ endpoints with request/response examples | `docs/API_ENDPOINTS_BACKEND.md` (extend existing) |
| Architecture Guide | System diagram: Spring Boot → MSSQL + Firebase + Google Maps + Stripe/PayPal | `docs/ARCHITECTURE.md` |
| Environment Setup | Step-by-step: clone → Docker → env vars → `bootRun` | `docs/ENVIRONMENT_SETUP.md` |
| Payment Integration Guide | PayPal + Stripe webhook setup, sandbox testing | `docs/PAYMENTS_GUIDE.md` |
| Firebase Setup Guide | Service account, Firestore rules, FCM config | `docs/FIREBASE_GUIDE.md` |
| GDPR Compliance Guide | Erasure flows, consent logging, data export | `docs/GDPR_GUIDE.md` |
| Smart Matching Algorithm | Scoring formula, weights, Google Forms config | `docs/MATCHING_ALGORITHM.md` |
| Deployment Checklist | Prod: env vars, Flyway, CORS, rate limits, email | `docs/DEPLOYMENT_CHECKLIST.md` |
| QA Handover | Updated after every sprint (existing) | `docs/QA-HANDOVER.md` |

### 12.2 Audience 2: Student SaaS Guide (Later — v2.0 docs)

The teaching labs (`docs/TUTORIUM_LAB_WORKPLACE.md`) will be extended into a full SaaS construction guide:

| Chapter | Content |
|---------|---------|
| Chapter 1: The SaaS Idea | Problem → Solution → Market fit for SichrPlace |
| Chapter 2: Architecture Decisions | Why Spring Boot, why MSSQL + PostgreSQL, why Firebase |
| Chapter 3: Auth from Scratch | JWT, refresh tokens, account lockout — building it step by step |
| Chapter 4: Taking Payments | PayPal + Stripe — webhook security, idempotency |
| Chapter 5: Real-time Features | Firebase Firestore vs STOMP: when to use each |
| Chapter 6: GDPR as a Feature | Consent, erasure, portability — not a checkbox, a differentiator |
| Chapter 7: Smart Matching | From Google Forms to algorithm to dashboard widget |
| Chapter 8: PWA — The Free App | Service workers, offline first, install prompt |
| Chapter 9: Ops for Students | Docker, Testcontainers, CI/CD on GitHub Actions, DigitalOcean |
| Chapter 10: Thesis-Ready Showcase | How to present SichrPlace as a thesis submission |

### 12.3 Documentation Maintenance Rule

Every PR that adds a new endpoint must include a `docs/` update. Enforced by PR template checklist item:
> `[ ] docs/API_ENDPOINTS_BACKEND.md updated for new/changed endpoints`

### Phase 12 Exit Criteria

- [ ] All 9 developer documentation files complete
- [ ] Student SaaS guide outline published as `docs/STUDENT_SAAS_GUIDE_OUTLINE.md`
- [ ] All generated integration specs (`docs/generated/frontend_integration/`) updated for new endpoints
- [ ] `README.md` updated to reference roadmap and new features

---

## Master Timeline

```
Week  1–2  │ Phase 0 — Foundation Hardening (SMTP, rate limiting, CORS, ddl-auto)
Week  3–4  │ Phase 1 — Auth Hardening (refresh tokens, lockout, CSRF, WebSocket auth)
Week  5–7  │ Phase 2 — Dual Payments (PayPal + Stripe Spring Boot endpoints)
Week  8–10 │ Phase 3 — Google Maps (port 4 Node.js services)
Week  8–12 │ Phase 4 — Smart Matching (Google Forms webhook, scoring engine, dashboard)
           │           ── runs in parallel with Phase 3 from Week 8 ──
Week 11–14 │ Phase 5 — Firebase Chat (FCM, custom auth token, frontend migration)
Week 14–16 │ Phase 6 — GDPR 100% + CORS 100% (port Node.js GdprService)
Week 17–18 │ Phase 7 — PWA Full Setup (manifest, SW, offline, install prompt)
Week 19–22 │ Phase 8 — Integration Tests 100% (Testcontainers MSSQL, 43 new tests)
Week 23–24 │ Phase 9 — AppleMontiCore Verification (audit, gap analysis, decision)
Week 24–27 │ Phase 10 — Frontend Responsiveness (all 43 pages mobile-ready)
Week 27–29 │ Phase 11 — Frontend API Wiring (16 stale pages → Spring Boot)
Week 29–31 │ Phase 12 — Documentation (developer guide + student SaaS guide outline)
────────────┤
  Week 31   │ 🎯 PRODUCTION READY — all phases green, COCO ≥ 80%, Lighthouse ≥ 90
```

---

## Dependency Graph

```
Phase 0 (Foundation)
  └─► Phase 1 (Auth)
        ├─► Phase 2 (Payments)         ─── independent of Phases 3–5
        ├─► Phase 5 (Firebase Chat)
        └─► Phase 6 (GDPR)
Phase 3 (Maps)  ─────────────────────► Phase 4 (Smart Matching) [geo scoring]
Phase 4 (Smart Matching) ────────────► Phase 8 (Integration Tests)
Phase 5 (Firebase Chat) ────────────► Phase 7 (PWA) [FCM SW + App SW coexist]
Phases 2+3+5 ───────────────────────► Phase 11 (API Wiring) [new endpoints exist]
Phase 0–8 all complete ─────────────► Phase 8 (Integration Tests) [all services exist]
Phase 9 (AppleMontiCore) ───────────► Phase 10 (Responsiveness) [design system verified]
Phase 10+11 ────────────────────────► Phase 12 (Documentation) [final state to document]
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Google Maps API key billing exceeds budget | Medium | High | Caching (`@Cacheable` 24h TTL); request quota alerts; Leaflet.js as fallback for display |
| Firebase free tier limits hit (Spark plan) | Medium | Medium | Use Blaze plan (pay-as-you-go); monitor Firestore reads/writes; cache on Spring Boot side |
| AppleMontiCore repo incompatible with prod | Low | Medium | Fork to own repo; maintain SichrPlace-specific branch |
| Stripe/PayPal regulatory approval delays | High | High | Start sandbox testing Week 5; submit business verification documents early |
| MSSQL → PostgreSQL dialect drift in prod | Medium | High | Integration tests (Phase 8) run against MSSQL; contract tests (Phase 8) run against PostgreSQL in CI |
| Testcontainers too slow for CI (CI timeout) | Medium | Low | Split integration tests into own Gradle task; run overnight or on push to `main` only |
| 16 stale pages have complex Supabase logic | Medium | Medium | Audit each page individually in Phase 11; prioritise by user traffic |
| GDPR erasure breaks referential integrity | High | High | Use anonymisation over hard-delete for FK-referenced rows; test with integration tests |
| Firebase Auth + JWT dual auth complexity | Medium | High | Firebase custom tokens issued by JWT-authenticated Spring Boot endpoint — single auth chain |
| Design regression in mobile nav | Low | High | Visual regression snapshots before/after each Phase 10 PR |

---

## Flyway Migration Index

| Version | Phase | Description |
|---------|-------|-------------|
| V001–V007 | ✅ Existing | Baseline schema + seed |
| V008 | Phase 0 | Schema validate baseline (ddl-auto flip) |
| V009 | Phase 1 | `refresh_tokens` table |
| V010 | Phase 1 | User lockout columns |
| V011 | Phase 2 | `payments` table |
| V012 | Phase 3 | `apartments` geo columns (lat/lng) |
| V013 | Phase 4 | `matching_traits` table |
| V014 | Phase 5 | `user_fcm_tokens` table |
| V015 | Phase 6 | `consent_log` + `data_export_jobs` tables |
| V016+ | Phase 8 | Any additional schema discovered during integration testing |

**Total new migrations:** 8 (V008–V015)  
**Total tables added:** 6 (`refresh_tokens`, `payments`, `matching_traits`, `user_fcm_tokens`, `consent_log`, `data_export_jobs`)

---

## New Endpoint Summary (All Phases)

| Phase | New Endpoints | Count |
|-------|--------------|-------|
| Phase 1 | `/api/auth/refresh`, `/api/auth/csrf-token` | 2 |
| Phase 2 | `/api/payments/paypal/*` (3), `/api/payments/stripe/*` (2), `/api/webhooks/*` (2) | 7 |
| Phase 3 | `/api/maps/*` | 5 |
| Phase 4 | `/api/matching/*` | 6 |
| Phase 5 | `/api/firebase/*` (3), `/api/messages/notify` (1) | 4 |
| Phase 6 | `/api/gdpr/*` | 6 |
| **Total new** | | **30** |

**New total endpoints: 66 (existing) + 30 (new) = 96 endpoints**

---

## Backend Lock-In Sprint

> **Duration:** 2–3 weeks (current sprint, starting 2026-02-21)  
> **Goal:** Make the backend 100% trustworthy before any significant frontend work begins.  
> **Sources:** Phase 0 (Foundation), Phase 1 (Auth Hardening), Phase 6 (GDPR — backend endpoints only).  
> **COCO target for this sprint:** Raise overall threshold from **40.5% → 60%** as the baseline for integration tests.

---

### Backlog Stories

#### Story P0-1 — Replace `EmailService` stub with real SMTP provider

**Description:** `EmailServiceImpl` currently logs to console only. Replace with `JavaMailSender` wired to Mailgun/SendGrid/SES via SMTP.

| # | Acceptance Criterion |
|---|---------------------|
| 1 | Password reset email is delivered to a real inbox in staging (verified via test inbox) |
| 2 | Email verification flow sends a real link in staging |
| 3 | `EmailServiceImplSmtpTest` mocks `JavaMailSender.send()` and asserts correct `MimeMessage` fields (to, subject, body) |

**Dependencies:** None.  
**External:** SMTP credentials stored as `${SMTP_HOST}`, `${SMTP_PORT}`, `${SMTP_USER}`, `${SMTP_PASS}` env vars.

---

#### Story P0-2 — Flyway migrations for all remaining JPA-only tables

**Description:** `favorites`, `notifications`, `conversations`, and `messages` tables exist via `ddl-auto: update` only. Write Flyway V008 (or the next available version) to capture their exact schema.

| # | Acceptance Criterion |
|---|---------------------|
| 1 | All 4 tables have explicit Flyway scripts that apply cleanly on a fresh MSSQL container |
| 2 | `FlywayMigrationSmokeTest` asserts zero errors on clean schema with all migrations applied |
| 3 | `ddl-auto: validate` is active on `beta-mssql` and `prod` profiles (no schema drift allowed) |

**Dependencies:** None. Must be done before Story P0-3.  
**Note:** Run `ddl-auto: update` once locally, generate DDL diff, then write migration scripts manually.

---

#### Story P0-3 — Externalise CORS origins to environment variables + tests

**Description:** CORS allowed origins are currently hardcoded in `application-local.yml`. Move to `${CORS_ALLOWED_ORIGINS}` environment variable consumed by `WebMvcConfigurer`.

| # | Acceptance Criterion |
|---|---------------------|
| 1 | `OPTIONS` preflight from an allowed origin returns `Access-Control-Allow-Origin` header |
| 2 | `OPTIONS` preflight from a disallowed origin returns no CORS header (browser blocks) |
| 3 | `CorsConfigTest` covers both cases with `MockMvc` |

**Dependencies:** Story P0-2 (ddl-auto:validate must pass before CORS tests run in integration context).  
**Environments:** `local` = `localhost:3000,localhost:5500`; `prod` = `sichrplace.netlify.app,sichrplace.de`.

---

#### Story P0-4 — Rate limiting on auth endpoints

**Description:** No brute-force protection exists on `POST /api/auth/login`, `POST /api/auth/forgot-password`, or `POST /api/users/register`. Add Bucket4j in-memory rate limiting.

| # | Acceptance Criterion |
|---|---------------------|
| 1 | After 10 requests within 1 minute, endpoint returns `429 Too Many Requests` with `Retry-After` header |
| 2 | Limit resets after the window expires |
| 3 | `RateLimitingTest` asserts `429` on the 11th request and `200` after reset |

**Dependencies:** None.  
**Library:** `com.github.vladimir-bukhtoyarov:bucket4j-core` (in-memory; no Redis required for v1).

---

#### Story P0-5 — Staging environment + CI mssql-verify job

**Description:** Create a stable staging Spring profile and a `mssql-verify` CI job that runs all Flyway migrations on a clean MSSQL container, seeds data, and runs smoke tests.

| # | Acceptance Criterion |
|---|---------------------|
| 1 | `application-staging.yml` exists with staging DB URL, CORS origins, and staging Firebase/Maps keys |
| 2 | CI job `mssql-verify` applies all migrations on a fresh schema without errors |
| 3 | CI job runs `smoke_seed.sql` and `smoke_test.sql` and passes |

**Dependencies:** Story P0-2 (all migrations exist).  
**Note:** DigitalOcean droplet already exists at `206.189.53.163`; reuse for staging.

---

#### Story P1-1 — Refresh token rotation + revocation endpoint

**Description:** Implement short-lived access tokens (15 min) + long-lived refresh tokens (14 days) with rotation. Store refresh tokens as SHA-256 hashes in `refresh_tokens` table.

| # | Acceptance Criterion |
|---|---------------------|
| 1 | `POST /api/auth/refresh` returns a new access token and rotates the refresh token (old token rejected immediately) |
| 2 | `POST /api/auth/logout` revokes the refresh token; subsequent refresh attempts return `401` |
| 3 | `RefreshTokenServiceTest` covers: valid refresh, expired, used (rotation), revoked, not-found (6 tests minimum) |

**Dependencies:** Story P0-2 (Flyway migration V009 for `refresh_tokens` table).  
**Flyway:** V009__refresh_tokens.sql

---

#### Story P1-2 — Account lockout after failed login attempts

**Description:** After 5 failed `POST /api/auth/login` attempts within 10 minutes, lock the account for 30 minutes. Return `423 Locked` with `X-Unlock-At` header.

| # | Acceptance Criterion |
|---|---------------------|
| 1 | 5th failed attempt triggers lock; 6th attempt returns `423` even with correct credentials |
| 2 | Account auto-unlocks after 30-minute TTL |
| 3 | `AccountLockoutTest` covers lock trigger, locked state, and auto-unlock |

**Dependencies:** Story P0-2 (Flyway migration V010 for `failed_login_count`, `locked_until` columns on `users`).  
**Flyway:** V010__user_lockout.sql

---

#### Story P1-3 — JWT secret rotation grace period

**Description:** Support `${JWT_SECRET_PREVIOUS}` fallback so tokens signed with the old secret remain valid for a configurable grace period (default: 1 hour) after a key rotation.

| # | Acceptance Criterion |
|---|---------------------|
| 1 | Token signed with current secret validates normally |
| 2 | Token signed with previous secret validates during grace period |
| 3 | Token signed with previous secret is rejected after grace TTL |

**Dependencies:** Story P1-1 (refresh token infrastructure).  
**Note:** Warn at startup via log if `jwt.secret` is default/insecure value.

---

#### Story P6-1 — GDPR data export endpoint (backend only)

**Description:** Implement `POST /api/gdpr/me/export` that queues a data export job. The job collects all user data (profile, apartments, messages, viewing requests, reviews, favorites, saved searches) and emails a download link.

| # | Acceptance Criterion |
|---|---------------------|
| 1 | Authenticated call to `POST /api/gdpr/me/export` returns `202 Accepted` with a `jobId` |
| 2 | `GET /api/gdpr/me/export/{jobId}/status` returns `QUEUED → PROCESSING → READY` as job progresses |
| 3 | `GdprExportServiceTest` verifies all 12 entity types are included in the export payload |

**Dependencies:** Story P0-1 (email delivery needed for download link).  
**Flyway:** V015__gdpr_tables.sql (data_export_jobs table)

---

#### Story P6-2 — GDPR account deletion (anonymisation) endpoint (backend only)

**Description:** Implement `DELETE /api/gdpr/me` that anonymises or hard-deletes the current user's PII. Uses the anonymisation strategy (not hard-delete) for FK-referenced rows.

| # | Acceptance Criterion |
|---|---------------------|
| 1 | `DELETE /api/gdpr/me` anonymises user email, name, phone; replaces message content with `[deleted]`; soft-deletes apartments |
| 2 | Account is inaccessible after deletion (login returns `401`) |
| 3 | `GdprDeletionServiceTest` verifies all PII columns are anonymised and all refresh tokens / FCM tokens are hard-deleted |

**Dependencies:** Story P1-1 (refresh tokens must be revoked on deletion).  

---

#### Story P6-3 — Consent logging endpoint (backend only)

**Description:** Implement `POST /api/gdpr/consent` that stores a timestamped consent decision (type, granted boolean, IP hash) from the cookie banner.

| # | Acceptance Criterion |
|---|---------------------|
| 1 | `POST /api/gdpr/consent` with `{ type: "COOKIES_ANALYTICS", granted: true }` stores record in `consent_log` table |
| 2 | IP is stored as SHA-256 hash (never plaintext) |
| 3 | `GET /api/gdpr/consent-history` returns paginated audit trail for the authenticated user |

**Dependencies:** Story P0-2 (Flyway V015 for consent_log table).  

---

### Coverage Target: Backend Lock-In Sprint

| Package | Pre-Sprint | Sprint Target | Method |
|---------|-----------|---------------|--------|
| `controller` | 100.0% | 100.0% | Hold — every new controller endpoint gets a test |
| `service` | 99.3% | 99.3% | Hold — new services get unit tests immediately |
| `security` | 100.0% | 100.0% | Hold |
| **overall** | **40.5%** | **≥ 60%** | New integration tests bring overall up |

> **Rationale:** The overall coverage is low because 0 integration tests run against a real DB. The new `RefreshTokenServiceTest`, `GdprExportServiceTest`, `GdprDeletionServiceTest`, `AccountLockoutTest`, `RateLimitingTest`, `CorsConfigTest`, `EmailServiceImplSmtpTest`, and `FlywayMigrationSmokeTest` will collectively raise the overall metric past 60% without requiring any mock-only tests.

---

### Sprint Micro-Timeline

| Week | Day | Story | Owner | Status |
|------|-----|-------|-------|--------|
| **Week 1** | Day 1–2 | P0-1: Email SMTP integration + `EmailServiceImplSmtpTest` | Omer | ⬜ Not started |
| | Day 3–4 | P0-2: Flyway migrations for favorites/notifications/conversations/messages (V008); `ddl-auto: validate`; `FlywayMigrationSmokeTest` | Omer | ⬜ Not started |
| | Day 5 | P0-3: CORS env-var config + `CorsConfigTest` | Omer | ⬜ Not started |
| **Week 2** | Day 1–2 | P1-1: Refresh token rotation + revocation (V009) + `RefreshTokenServiceTest` (6 tests) | Omer | ⬜ Not started |
| | Day 3 | P1-2: Account lockout (V010) + `AccountLockoutTest` | Omer | ⬜ Not started |
| | Day 3 | P0-4: Rate limiting on auth endpoints + `RateLimitingTest` | Omer | ⬜ Not started |
| | Day 4–5 | P6-1: GDPR export endpoint (V015) + `GdprExportServiceTest` | Omer | ⬜ Not started |
| | Day 5 | P6-2: GDPR deletion endpoint + `GdprDeletionServiceTest` | Omer | ⬜ Not started |
| **Week 3** | Day 1 | P6-3: Consent logging endpoint + `ConsentLogServiceTest` | Omer | ⬜ Not started |
| (buffer) | Day 2 | P1-3: JWT secret rotation grace period + `JwtRotationTest` | Omer | ⬜ Not started |
| | Day 3–4 | P0-5: Staging profile + `mssql-verify` CI job | Omer | ⬜ Not started |
| | Day 5 | COCO threshold raise (40.5% → 60%) + doc updates | Omer | ⬜ Not started |

---

### Backend Lock-In Complete When

This checklist is the gate before switching primary focus to frontend sprints (Phases 9, 10, 11):

- [ ] **Email** — password reset and email verification send real emails in staging; `EmailServiceImplSmtpTest` green
- [ ] **Flyway** — all tables have explicit migrations (V008+); `ddl-auto: validate` active on `beta-mssql` and `prod` profiles; `FlywayMigrationSmokeTest` green
- [ ] **CORS** — allowed and blocked origins tested via `CorsConfigTest`; no hardcoded origins in yml files
- [ ] **Rate Limiting** — `POST /api/auth/*` returns `429` after threshold; `RateLimitingTest` green
- [ ] **Refresh Tokens** — rotation + revocation tested via `RefreshTokenServiceTest` (6 tests minimum); `POST /api/auth/refresh` and `POST /api/auth/logout` green
- [ ] **Account Lockout** — 5-failure lockout tested via `AccountLockoutTest`; `423` returned correctly
- [ ] **GDPR Export** — `POST /api/gdpr/me/export` returns `202`; job lifecycle tested; `GdprExportServiceTest` green
- [ ] **GDPR Deletion** — `DELETE /api/gdpr/me` anonymises PII; all tokens revoked; `GdprDeletionServiceTest` green
- [ ] **Consent Logging** — `POST /api/gdpr/consent` stores consent with IP hash; `ConsentLogServiceTest` green
- [ ] **Staging CI** — `mssql-verify` job green; staging deploy gate active
- [ ] **COCO overall ≥ 60%** — new integration tests raise overall coverage past sprint target
- [ ] **All 381 existing tests still green** — no regressions

> ✅ When all 12 boxes are checked: **Frontend sprints (Phases 9, 10, 11) may begin.**

---

*End of ROADMAP.md — SichrPlace FTL v1.0.0*  
*Next review: after Backend Lock-In Sprint exit criteria confirmed.*
