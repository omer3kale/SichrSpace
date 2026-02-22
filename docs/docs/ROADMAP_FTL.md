# SichrPlace FTL Roadmap

Status baseline: Spring Boot backend is functionally strong with high controller/service/security coverage and COCO gates passing; MSSQL migrations and smoke tests are in place; frontend is partially wired to the Spring API with uneven responsiveness and some legacy Node.js/Supabase integrations remaining.

---

## FTL‑0 Principles & Constraints

**Goals**

- Backend must be effectively "100% complete" (features, reliability, coverage, compliance) before major frontend redesign.
- Preserve current visual design; only small responsive/layout refinements allowed.
- Use production-ready managed services (Firebase, Google Maps, Stripe, PayPal) with clear test vs live separation.

**Constraints**

- No large-scale frontend re-theming or layout rewrites.
- All new functionality must expose clear REST APIs and be covered by integration tests.
- All externally hosted services (Firebase, Maps, payments, forms) must have:
  - Configuration via env/secret management.
  - Staging vs production credentials and toggles.
  - Automated smoke tests.

---

## FTL‑1 Backend Completion & Reliability

**Outcome**

Backend feature set and infra are "production complete": no major gaps (email, payments, maps, GDPR) and DB layer is fully versioned with Flyway and MSSQL.

**Key Tasks**

1. **Email delivery**
   - Replace console stub with real provider (Mailgun/SendGrid/SES).
   - Wire password reset and email verification flows to send real emails.
   - Add integration tests using a test provider or local fake SMTP.

2. **DB migrations completeness**
   - Add Flyway migrations for: Favorites, Notifications, Conversations, Messages (currently JPA-only).
   - Set `ddl-auto: validate` in all non-dev profiles.
   - Ensure `mssql-verify` CI job runs all migrations on a clean DB, then `smoke_seed.sql` + `smoke_test.sql`.

3. **Staging environment**
   - Create a staging MSSQL DB and staging backend profile mirroring prod config.
   - Deploy the backend to staging; run full smoke + API health checks as a pre-prod gate.

**Definition of Done**

- All domain tables have explicit Flyway migrations.
- Email flows work end-to-end in staging (verified by test inbox).
- Staging pipeline is passing and required before any prod deploy.

---

## FTL‑2 Realtime Chat via Firebase

**Outcome**

Live chat uses Firebase Messaging for realtime push while persisting all messages in MSSQL and preserving the existing chat UI layout.

**Key Tasks**

1. **Firebase project & config**
   - Create Firebase project (staging + prod).
   - Enable Cloud Messaging; generate web configuration and server key.
   - Store keys in DO secrets; create `application-*-firebase.yml`.

2. **Backend integration**
   - Add a `FirebaseMessagingService` that:
     - Registers device tokens (per user).
     - Sends push notifications when a new message is created (conversation id, snippet).
   - Extend message creation service to:
     - Save message to `messages` table.
     - Publish a push event via Firebase to participants.

3. **Frontend integration**
   - Add Firebase JS SDK on chat pages without altering existing layout.
   - On login, request notification permission and register FCM token with backend.
   - When a push arrives, if chat is open:
     - Update message list via REST fetch.
   - If chat is closed:
     - Show notification badge or browser notification.

4. **Testing**
   - Backend integration tests for `FirebaseMessagingService` using a test double.
   - Manual and scripted tests for:
     - New message → push received on other browser.
     - Token refresh flow.

**Definition of Done**

- Chat works in realtime via Firebase push in staging.
- Messages are never lost if Firebase is down (REST fallbacks still work).
- No visual redesign of chat; only small UI hints for unread messages.

---

## FTL‑3 Maps & Location (Google Maps)

**Outcome**

Apartments and dashboards can show maps, routes or approximate locations using Google Maps; logic lives in Spring Boot, not legacy Node.

**Key Tasks**

1. **API key and config**
   - Set up Google Maps API (Geocoding, Maps JavaScript) with separate staging/prod keys.
   - Add key to backend config; lock domains in Google Cloud console.

2. **Backend services**
   - Port necessary logic from old Node.js `GoogleMapsService` into `MapsService` in Spring:
     - Geocode addresses to lat/lng.
     - Optional: distance/time estimation between apartment and target location (university, workplace).
   - Expose endpoints: `/api/maps/geocode`, `/api/maps/distance`.

3. **Frontend wiring**
   - On apartment creation/edit, call `/api/maps/geocode` to store lat/lng.
   - On listing/detail pages, show a Google Maps embed using stored coordinates; keep card/layout unchanged.

4. **Tests**
   - Integration tests using mocked Google Maps HTTP responses.
   - UI smoke tests to verify map loads with valid key (manual + simple Cypress/Playwright later).

**Definition of Done**

- Apartments saved with lat/lng and map visible on apartment-related pages.
- No blocking behavior if Google Maps API fails; graceful fallback text shown.

---

## FTL‑4 Traits, Google Forms & Smart Matching Feed

**Outcome**

Traits from Google Forms are ingested automatically, stored in MSSQL, and drive a matching algorithm that powers personalized dashboards.

**Key Tasks**

1. **Google Forms pipeline**
   - Decide ingestion strategy:
     - Option A: Use Google Forms → Google Sheets; backend pulls from Sheets API.
     - Option B: Use Forms API with webhook (App Script) posting to backend.
   - Define canonical trait model (e.g. budget range, room preferences, quiet level, distance preference).

2. **Backend ingestion service**
   - Create `TraitsIngestionService`:
     - Verifies origin (shared secret/API key).
     - Maps form fields to internal trait fields.
     - Stores traits per user in `user_traits` table.

3. **Matching algorithm**
   - Implement `MatchingService` with:
     - Scoring function using traits + apartment attributes.
     - Top-N recommendations per user.
   - Expose endpoints:
     - `/api/dashboard/matches` for tenants.
     - `/api/dashboard/matches/landlord` for owner-focused stats.

4. **Dashboard integration**
   - Tenant dashboard: "Recommended apartments for you" widget using `/api/dashboard/matches`.
   - Landlord dashboard: "Recommended tenants / interest score" for own apartments.
   - Keep existing dashboard layout; add widgets into existing boxes.

5. **Testing**
   - Unit tests for scoring function.
   - Integration tests:
     - Sample traits + apartments → deterministic recommendations.
     - Google Forms payload → stored traits.

**Definition of Done**

- Traits from Forms appear in the DB linked to correct users.
- Both dashboards show meaningful recommendations in staging with test data.

---

## FTL‑5 Payments (PayPal + Stripe)

**Outcome**

Support both PayPal and Stripe for key payment flows (e.g. booking fees), with backend orchestration and no direct keys in the frontend.

**Key Tasks**

1. **Design payment flows**
   - Decide what is paid for (booking fee, premium listing, etc.).
   - Define entities: `payments`, `payment_intents`, `webhook_events`.

2. **Stripe integration**
   - Configure Stripe accounts (test + prod).
   - Backend:
     - Create PaymentIntent: `/api/payments/stripe/create-intent`.
     - Webhook endpoint: `/api/payments/stripe/webhook`.
   - Frontend:
     - Use Stripe.js on specific pages (no layout changes).
     - Show Stripe checkout components in modal.

3. **PayPal integration**
   - Replace exposed client ID in HTML with backend-provided config.
   - Backend:
     - `/api/payments/paypal/create-order`, `/capture-order`.
     - Webhook endpoint for PayPal events.
   - Frontend:
     - Use PayPal JS SDK with backend endpoints for order creation/capture.

4. **Security & compliance**
   - Store minimal payment data (no card numbers).
   - Implement signature verification for webhooks.

5. **Testing**
   - Integration tests mocking Stripe/PayPal APIs.
   - End-to-end sandbox flows for both providers.

**Definition of Done**

- Both PayPal and Stripe flows work in staging.
- No payment provider keys appear in frontend source.

---

## FTL‑6 GDPR, CORS & Compliance

**Outcome**

GDPR and CORS are implemented to a level suitable for production in the EU and cross-origin usage.

**Key Tasks**

1. **GDPR endpoints**
   - Implement:
     - Data export: `/api/gdpr/me/export`.
     - Account deletion: `/api/gdpr/me/delete`.
     - Consent log retrieval for admin.
   - Use existing consent data from frontend (cookie banner) and store decisions.

2. **GDPR flows**
   - Integrate deletion and export requests into account settings UI (no major redesign).
   - Update privacy policy page with backend-driven info (API integration optional).

3. **CORS**
   - Lock down Spring Security CORS to:
     - Known frontend origins (dev/staging/prod).
     - Correct methods and headers.
   - Add integration tests that simulate preflight and regular requests.

4. **Documentation & tests**
   - Extend GDPR_TEST_FIX_PLAN.md with:
     - Concrete test cases.
     - Links to implemented endpoints.
   - Add tests for consent-required scripts (analytics, ads) gating.

**Definition of Done**

- All GDPR endpoints are implemented, tested, and reachable from UI.
- CORS configuration passes automated tests and manual checks from allowed and disallowed origins.

---

## FTL‑7 Auth Flow & Security Hardening

**Outcome**

Auth flow is hardened to "production-grade" with strong guarantees; optionally supported by WebSocket signals for session events.

**Key Tasks**

1. **Session integrity**
   - Enforce short-lived access tokens + refresh tokens.
   - Implement refresh endpoint with rotation and revocation.
   - Add device/session table for audit.

2. **Optional WebSocket for auth events**
   - Use WebSocket channel to push events:
     - "Session revoked" (logout all devices).
     - "Password changed" (invalidate outstanding refresh tokens).
   - Frontend listens and logs out user if required.

3. **Security controls**
   - Rate limiting for login, register, password reset.
   - IP/device fingerprint logging for risky behavior.
   - Additional DB failure paths already covered; extend to auth-specific cases.

4. **Testing**
   - Integration tests for refresh, revocation and multi-device scenarios.
   - Pen-test style cases: token reuse, expired tokens, manipulated tokens.

**Definition of Done**

- Auth flows are covered by integration tests including negative scenarios.
- Refresh and revocation behave as expected across multiple browser sessions.

---

## FTL‑8 Testing & Coverage to 100%

**Outcome**

Overall coverage metric and critical behavior coverage both at 100%, including integration tests for every major feature.

**Key Tasks**

1. **Define "overall 100%" scope**
   - Decide which packages count toward 100%:
     - Controllers, services, security, repositories, core utils.
   - Optionally exclude boilerplate (pure configs) via COCO rules.

2. **Integration test suite**
   - For each domain (auth, apartments, viewing, chat, payments, maps, forms, matching):
     - At least one full-stack integration test:
       - Start Spring context with test DB.
       - Hit REST endpoints via MockMvc/WebTestClient.
       - Assert DB state and responses.

3. **Gap analysis**
   - Use coverage reports to identify remaining uncovered lines.
   - Add targeted tests or refactor dead code.

4. **Automation**
   - Ensure `testWithCoverage` + `checkCoco` require 100% overall in CI.

**Definition of Done**

- COCO "overall" threshold set to 100% and passing.
- Every major feature has at least one integration test.

---

## FTL‑9 PWA & Frontend Integrity

**Outcome**

SichrPlace is a solid PWA without breaking existing visual design.

**Key Tasks**

1. **Manifest & service worker**
   - Validate and refine:
     - Icons, theme color, start URL.
   - Service worker:
     - Cache shell assets and key API responses for offline viewing.
     - Manage versioning and update strategy.

2. **Offline states**
   - Add small UI hints (non-disruptive) for:
     - Offline mode.
     - Cached data vs live data.

3. **Push notifications**
   - Tie Firebase (FTL‑2) into service worker for push notifications:
     - New messages.
     - Important notifications.

4. **Testing**
   - Lighthouse PWA audit to green.
   - Manual install on Android/iOS; verify offline capabilities and push.

**Definition of Done**

- Lighthouse PWA category score in "good" range.
- App installable and usable offline for key screens.

---

## FTL‑10 Smart Matching in Dashboards

**Outcome**

Matching algorithm is visible and explorable inside dashboards, powered by traits (FTL‑4) and apartment data.

**Key Tasks**

1. **Dashboard widgets**
   - Tenant side:
     - "Top X Matches" card with reason labels (e.g. "within budget", "close to campus").
   - Landlord side:
     - "Top interested tenants" per listing.

2. **Explainability**
   - Include simple explanations (weights, main factors) without cluttering UI.

3. **Controls**
   - Allow basic user adjustments:
     - Emphasize price vs location vs roommate count.

4. **Testing**
   - Algorithm regression tests (scores stable given same data).
   - Integration tests verifying that dashboard endpoints respect traits.

**Definition of Done**

- Dashboards show matches in staging with realistic sample data.
- Algorithm is deterministic and versioned (so tweaks can be tracked).

---

## FTL‑11 Apple / MontiCore Repository Production Readiness

**Outcome**

The MontiCore/apple-related artifacts are proven to work as part of the production pipeline.

**Key Tasks**

1. **Clarify role**
   - Document exactly what the MontiCore/Apple repository provides:
     - Code generation?
     - DSL for configuration?
     - Analysis tooling?

2. **Build & runtime validation**
   - Ensure the MontiCore CLI and generated artifacts:
     - Build reproducibly in CI.
     - Run on the same Java/JVM version as production.
   - Add a dedicated CI job: `monticore-verify`:
     - Downloads or builds required jars.
     - Runs sample generation/analysis.
     - Fails on any warnings or errors.

3. **Integration**
   - If MontiCore models drive backend behavior:
     - Add integration tests where updated models produce expected Spring code/configuration.

4. **Licensing & operational notes**
   - Verify licenses allow server-side use in SaaS.
   - Document operational steps: upgrades, version pinning, fallback strategies.

**Definition of Done**

- `monticore-verify` job is green and required in CI.
- Any generated code is also covered by tests and passes COCO.

---

## FTL‑12 Documentation: Developer Now, Student Later

**Outcome**

Docs are developer-focused for the buildout phase, but structured so they can later be rephrased for students.

**Key Tasks**

1. **Developer track**
   - Consolidate:
     - Environment setup.
     - MSSQL and Firebase/Maps/Payments configuration.
     - API references.
     - CI/CD and testing strategy.
   - Ensure every new feature (Firebase chat, Maps, Forms, Payments, Matching) has:
     - "How it works" section.
     - "How to run locally" section.

2. **Student track planning**
   - Design a future structure for student docs:
     - "How we built SichrPlace" narrative.
     - Step-by-step mini-service guides derived from current infra (e.g. "Building a Matching Service", "Creating a MSSQL-backed auth system").

3. **Living roadmap**
   - Keep this FTL roadmap in the repo and update as tracks complete.

**Definition of Done**

- Developer docs reflect the system as implemented (no stale references).
- Clear plan exists for transforming docs into an educational, student-friendly series later.

---

## Track Cross-Reference

| FTL Track | Corresponds to ROADMAP.md Phase | Sprint Order |
|-----------|--------------------------------|-------------|
| FTL‑0 | Principles (all phases) | Ongoing |
| FTL‑1 | Phase 0 (Foundation) | Sprint 1 |
| FTL‑2 | Phase 5 (Firebase Chat) | Sprint 4 |
| FTL‑3 | Phase 3 (Google Maps) | Sprint 3 |
| FTL‑4 | Phase 4 (Smart Matching) | Sprint 3–4 |
| FTL‑5 | Phase 2 (Payments) | Sprint 2 |
| FTL‑6 | Phase 6 (GDPR + CORS) | Sprint 5 |
| FTL‑7 | Phase 1 (Auth Hardening) | Sprint 1 |
| FTL‑8 | Phase 8 (Integration Tests) | Sprint 6 |
| FTL‑9 | Phase 7 (PWA) + Phase 10 (Design) | Sprint 5–6 |
| FTL‑10 | Phase 4 (Smart Matching — Dashboards) | Sprint 4 |
| FTL‑11 | Phase 9 (AppleMontiCore Verification) | Sprint 5 |
| FTL‑12 | Phase 12 (Documentation) | Sprint 6–7 |

> **The immediate next sprint is the Backend Lock-In Sprint — see `ROADMAP.md` §"Backend Lock-In Sprint".**

---
---

# FTL ROADMAP – SICHRSPACE BACKEND & PLATFORM HARDENING

> **Added:** 2026-02-23 (Post-Phase 3, pre-Phase 4)  
> **Baseline:** 643 tests · 85 endpoints · 14 controllers · 86.3 % COCO

## Mission

Turn the current SichrSpace/SichrPlace platform into a **resilient, edge-case safe**
apartment search + booking + viewing system where:

- Booking requests (tenant ↔ landlord) and viewing requests (tenant ↔ company) can
  **never** conflict or confuse each other.
- Known UX/logic bugs from the previous implementation are explicitly closed.
- Backend APIs, auth, and ops are solid enough that frontend work cannot "break" core flows.

---

## Phase A – Account & Auth Reliability

### A1. Fix login/registration reliability (renters + landlords)

> *Goal: No more "Network error" / "check your credentials" when flow is correct.*

**Backend:**
- Add **explicit** error codes for:
  - Email-verification-missing.
  - Code-expired/invalid.
  - Password wrong vs account not found.
- Ensure landlord vs renter registration hits distinct, well-documented endpoints.
- Add rate limiting + logging for login and registration attempts.

**Tests:**
- Integration tests: "Happy" paths for renter + landlord registration + login.
- Invalid code, reused code, expired code.
- Regression tests for "cannot register new account" and "login failed after verification" bugs.

### A2. Fix password reset + language toggle edge cases

**Backend:**
- Implement working "forgot password" endpoints with token expiry.
- Make language selection **stateless or explicitly stored** (no disappearing UI because of missing locale).

**Tests:**
- Password reset flow tests (request, token, reset).
- Locale handling test: language parameter does not affect auth/cookie logic.

**Status vs current backend:** ⚠️ Mostly done — email verification, password reset, rate limiting,
failed-login tracking, and DB error codes are all implemented in Phases 1–3.
Remaining gap: landlord vs renter distinct registration endpoints; locale-statelessness.

---

## Phase B – Booking vs Viewing Request Separation

### B1. Define canonical models

> *Goal: Never mix them again.*

**Backend models:**
- **BookingRequest:** tenant → landlord, attached to an apartment listing.
  - Fields: stay duration (move-in/out dates, "extend later" flag), tenant details
    (adults, children, pets), reason for stay, payer (self/family/scholarship/company).
- **ViewingRequest:** tenant → company, independent function.
  - Fields: apartmentId (internal ID), date, time, questions, "what to pay attention to".

**Rules:**
- BookingRequest lives in landlord dashboard; ViewingRequest lives in a separate "Viewing" section (top row button).
- Landlords **never** see viewing requests directly; company does.

**Tests:**
- Ensure you cannot accidentally create a BookingRequest through the viewing endpoints, and vice versa.

### B2. BookingRequest flow (Wunderflats-style form)

**Backend endpoints:**
- `POST /api/apartments/{id}/booking-requests`
- `GET /api/landlord/booking-requests` (filtered by status)

**Status machine:** `DRAFT → SUBMITTED → ACCEPTED / DECLINED`

**Stored fields:**
- Stay duration (move-in/out, extend).
- Tenant composition (adults, kids, pets).
- Reason + payer.

**Tests:**
- Full API tests matching the Wunderflats-style spec.
- Ensure applicant personality/habits fields are **visible to landlord only through limited profile view**, not raw private data.

### B3. ViewingRequest flow (uni-view style, but separate)

**Backend endpoints:**
- `POST /api/viewing-requests` (public, requires registration).
- `GET /api/admin/viewing-requests` (company staff).

**Status machine:** `CREATED → CONFIRMED (slot agreed) → PAID → COMPLETED → CLOSED`

**Integrations:**
- Payment flows already implemented (Stripe/PayPal) map to ViewingRequest, **not** BookingRequest.

**Tests:**
- Ensure viewing form never includes monthly budget or "additional guests" (old bug).
- Ensure instructions (agree time with landlord first, fee visibility) are consistent in API responses/metadata.

**Status vs current backend:** 🆕 BookingRequest is entirely new. ViewingRequest already exists
with a 5-state lifecycle (PENDING → CONFIRMED → COMPLETED, ↘ DECLINED, ↘ CANCELLED) and
payment integration. Phase B adds the BookingRequest domain + cleanly separates the two.

---

## Phase C – Filters, Listings & Profile Consistency

### C1. Apartment filters ↔ listing schema alignment

> *Goal: Filter UI cannot request fields backend does not support.*

**Backend:**
- Standardize filter + listing schema:
  - Basic: city/area, move-in/move-out, earliest move-in, flexible/fixed slot, price (kalt/warm),
    property type (shared room, private room, studio, loft, apartment, house), rooms,
    singleBeds, doubleBeds, furnished (furnished/semi/unfurnished).
  - Advanced: amenities list (washingMachine, dryer, dishwasher, TV, lift, kitchen, AC, wifi,
    heating, privateBathroom, wheelchairAccessible, balconyTerrace), petsAllowed, excludeExchangeOffers.
- Ensure apartment creation/edit endpoints **require** exactly this set (or a clearly documented subset).

**Tests:**
- Search API tests covering: time filters, property type, single/double bed counts, furnished states.
- Regression test: advanced filters not duplicated; filter button works and applies server-side logic.

### C2. Applicant profile vs landlord view

**Backend:**
- Profile model: "Safe public" subset — habits, lifestyle tags, gender (if required),
  but **no** raw sensitive documents in landlord view.
- Endpoint: `GET /api/profiles/{id}/public` (for landlords and other tenants).

**Tests:**
- Ensure Applicant dashboard does **not** expose landlord-only actions like tenant screening or contract generation.
- Regression tests for the "missing personality/habits" profile fields.

---

## Phase D – Content & Communication Robustness

### D1. Static content / navigation bugs

**Backend + Infra:**
- Replace dead "About / FAQ / Customer Service / Scam Stories" links with:
  - Either live content endpoints, or
  - Feature-flagged stubs that return an explicit "coming soon" JSON with 501/204.

**Tests:**
- Endpoint tests for all footer/header links to ensure none 404.
- Regression test for "scam stories" being wired only to the apartments section.

### D2. Instructional flows & email automation

**Backend:**
- Encode the instruction sequence as a canonical flow in docs + metadata:
  - Register → Create profile → Search/post offer → Chat → Request to book →
    Booking accepted → Apply for viewing → Confirm → Pay → Receive video →
    Contract creation → Sign → Move-in.
- Email automation: ensure Email #1–#3 (#3B) templates exist as transactional email events
  tied to ViewingRequest status.

**Tests:**
- Unit tests for email trigger conditions.
- End-to-end test stubs that simulate a full viewing cycle.

---

## Phase E – Admin & Trust-and-Safety Backbone

### E1. Admin dashboards: enforceable backend contracts

**Backend:**
- Admin APIs for:
  - Active/expired listings.
  - Users (renters/landlords) with verification statuses.
  - Apartment checks (requested, scheduled, completed; with assigned account rep).
  - Payments & refunds logs for viewings.
  - "Slots within apartment" representation for landlords (rooms with tenants + payment status).

**Tests:**
- Admin API tests: verify/suspend/deactivate account; activate/deactivate listing.
- Regression tests for "Booking requests element missing" in landlord dashboard.

### E2. Trust & Safety / reporting

**Backend:**
- Expand existing conversation report + moderation APIs:
  - Reported users/listings queue.
  - Scam suspicion tagging.
  - GDPR access/deletion request endpoints.

**Tests:**
- Reported entities appear in admin queue.
- Flagged users/listings cannot continue normal operations until reviewed.

---

## Phase F – Ops, Monitoring, and Unbreakability

### F1. Incident-proof payments and webhooks

**Backend:**
- Idempotency keys for payment session creation and webhooks.
- Logging + metrics: dashboard of successful vs failed payments (Stripe/PayPal);
  alerts if webhooks fail repeatedly.

**Tests:**
- Simulated duplicate webhooks → PaymentTransaction state remains correct.
- Simulated provider downtime → clear error propagation.

### F2. Health checks, feature flags, and dark launches

**Backend:**
- Health endpoints for: DB, message broker, payment providers.
- Feature flags: smart matching, secure payments labels shown only if backing features are actually enabled.

**Tests:**
- Health endpoint tests (existing: `GET /api/health`, `GET /api/health/db-readiness`).
- Regression tests: "Is smart matching and secure payments real?" → now answerable via flags.

### F3. End-to-end test harness

**Backend/test:**
- Small E2E suite: sign-up → search → book → viewing → payment → webhook → auto-confirm → contract stub.
- Run in CI: nightly, plus before releases.

---

## Phase Selection Status

| Phase | Description | Readiness |
|-------|-------------|-----------|
| A — Auth Reliability | ⚠️ Mostly done (Phases 1–3 covered email verif, password reset, rate limiting, error codes) | ~80 % complete |
| **B — Booking vs Viewing Separation** | 🆕 BookingRequest is entirely new domain | **SELECTED FOR NEXT** |
| C — Filters & Profiles | Depends on B for clean listing/booking alignment | After B |
| D — Content & Communication | Email automation partially exists | After B |
| E — Admin & Trust-Safety | Admin APIs partially exist; depends on B for booking admin | After B |
| F — Ops & Monitoring | Post-Phase 3 backlog items (B-5 through B-8) | After B |
