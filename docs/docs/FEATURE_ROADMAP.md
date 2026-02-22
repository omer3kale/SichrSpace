# SichrPlace — Feature Gap Analysis & Implementation Roadmap

> **Generated:** February 2026
> **Old backend:** Node.js / Express / Supabase (~175 endpoints, 24 feature categories)
> **Current backend:** Spring Boot 3.2.2 / Java 21 / MSSQL 2025 (61 endpoints, 11 controllers)

---

## Overall Rating: 4 / 10

We cover **9 of 24 feature categories** from the old backend, and within those 9 we average ~85 % parity.
The remaining 15 categories (payments, maps, GDPR, analytics, email, caching, search,
media, feedback, recently-viewed, push notifications, profile extras, Google Forms,
infrastructure extras) are entirely absent.

> **Quality note:** Many old-backend features were stubs, broken (MongoDB disconnected),
> or stored data in-memory. Our Spring Boot code is architecturally superior (JPA +
> Hibernate, @Transactional, Lombok, DTO pattern, OpenAPI/Swagger, integration tests).
> If scored only against the old backend's *working* features, we sit closer to **6 / 10**.

---

## Feature-by-Feature Comparison

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented in Spring Boot |
| ⚠️ | Partially implemented / missing sub-features |
| ❌ | Not implemented in Spring Boot |
| 🔘 | Old backend had a stub / broken implementation |

---

### 1. Authentication & User Management

| Feature | Old Backend | Spring Boot | Gap |
|---------|-------------|-------------|-----|
| Register | ✅ | ✅ | — |
| Login (JWT) | ✅ | ✅ | — |
| Get profile | ✅ | ✅ | — |
| Update profile | ✅ | ✅ | — |
| Public user info | — | ✅ | Spring Boot has more |
| Email verification | ✅ | ❌ | **MISSING** |
| Forgot password | ✅ | ❌ | **MISSING** |
| Reset password | ✅ | ❌ | **MISSING** |
| Failed-login tracking | ✅ | ❌ | **MISSING** |

**Spring Boot parity: 55 %**

---

### 2. Apartments / Listings

| Feature | Old Backend | Spring Boot | Gap |
|---------|-------------|-------------|-----|
| CRUD (create, read, update, delete) | ✅ | ✅ | — |
| List/search with filters | ✅ | ✅ | — |
| Owner's listings | ✅ | ✅ | — |
| User's apartments (by userId) | ✅ | ❌ | **MISSING** (we have owner/listings instead) |
| Image upload (multer, 10 files) | ✅ | ❌ | **MISSING** |
| Separate Listing controller | — | ✅ | Spring Boot extra |

**Spring Boot parity: 75 %**

---

### 3. Viewing Requests

| Feature | Old Backend | Spring Boot | Gap |
|---------|-------------|-------------|-----|
| Create viewing request | ✅ | ✅ | — |
| Get by ID | ✅ | ✅ | — |
| My requests (tenant) | ✅ | ✅ | — |
| My requests (paged) | — | ✅ | Spring Boot extra |
| Requests per apartment | ✅ | ✅ | — |
| Approve / Confirm | ✅ | ✅ | — |
| Reject / Decline | ✅ | ✅ | — |
| Cancel | ✅ | ✅ | — |
| Transition history | — | ✅ | **Spring Boot extra** |
| Mark completed | ✅ | ✅ | — |
| Statistics endpoint | ✅ | ✅ | — |
| Payment status tracking | ✅ | ✅ (Stripe webhooks + booking-aware) | Phase 3 P3-5/P3-6: Stripe webhooks update PaymentTransaction status; PaymentDomainListener auto-confirms PENDING→CONFIRMED on payment completion, auto-cancels CONFIRMED→CANCELLED on refund |
| Email triggers on status change | ✅ | ✅ | — (Phase 2 A-3: `ViewingRequestServiceImpl.sendStatusEmail()`) |

**Spring Boot parity: 85 % (has transition history the old backend lacked; email triggers restored)**

---

### 4. Favorites

| Feature | Old Backend | Spring Boot | Gap |
|---------|-------------|-------------|-----|
| Toggle / Add | ✅ | ✅ | — |
| Remove | ✅ | ✅ | — |
| List | ✅ | ✅ | — |
| Check if favorited | — | ✅ | Spring Boot extra |
| Count | — | ✅ | Spring Boot extra |

**Spring Boot parity: 100 % (exceeds old backend)**

---

### 5. Reviews & Ratings

| Feature | Old Backend | Spring Boot | Gap |
|---------|-------------|-------------|-----|
| CRUD | ✅ | ✅ | — |
| Statistics | ✅ | ✅ | — |
| Moderation | ✅ | ✅ | — |
| My reviews | — | ✅ | Spring Boot extra |

**Spring Boot parity: 100 % (exceeds old backend)**

---

### 6. Notifications

| Feature | Old Backend | Spring Boot | Gap |
|---------|-------------|-------------|-----|
| List notifications | ✅ | ✅ | — |
| Unread notifications | — | ✅ | Spring Boot extra |
| Unread count | ✅ | ✅ | — |
| Mark one read | ✅ | ✅ | — |
| Mark all read | ✅ | ✅ | — |
| Create (internal) | ✅ | ⚠️ | Service-level only |
| Delete notification | ✅ | ❌ | **MISSING** |
| Helper generators | ✅ | ❌ | **MISSING** |

**Spring Boot parity: 80 %**

---

### 7. Saved Searches

| Feature | Old Backend | Spring Boot | Gap |
|---------|-------------|-------------|-----|
| Create | ✅ | ✅ | — |
| List | ✅ | ✅ | — |
| Get by ID | — | ✅ | Spring Boot extra |
| Update / Toggle | ✅ | ✅ | — |
| Delete | ✅ | ✅ | — |
| Execute saved search | ✅ | ❌ | **MISSING** |

**Spring Boot parity: 85 %**

---

### 8. Messaging / Conversations

| Feature | Old Backend | Spring Boot | Gap |
|---------|-------------|-------------|-----|
| Create conversation | ✅ | ✅ | — |
| List conversations (paged) | ✅ | ✅ | — |
| Conversation details | ✅ (partial MongoDB) | ✅ | — |
| Messages in conversation | ✅ (partial MongoDB) | ✅ | — |
| Send message | ✅ | ✅ | — |
| Edit message | ✅ (partial MongoDB) | ✅ (24 h window) | — |
| Delete message (soft) | ✅ (partial MongoDB) | ✅ | — |
| Mark conversation read | — | ✅ | Spring Boot extra |
| Unread message count | — | ✅ | Spring Boot extra |
| Emoji reactions | ✅ (MongoDB) | ✅ | — (Phase 2 B-4: `MessageReaction` entity, add/remove/list endpoints, WebSocket push) |
| Archive conversation | ✅ (MongoDB) | ✅ | — (Phase 2 B-1: `ConversationArchive` entity, toggle endpoint) |
| Report conversation | ✅ (MongoDB) | ✅ | — (Phase 2 B-5: `ConversationReport` entity, user report + admin list/moderate endpoints) |
| Search messages | ✅ (MongoDB) | ✅ | — (Phase 2 B-2: `MessageRepository.searchByUserAndContent()`) |
| File attachments | ✅ (MongoDB) | ✅ | — (Phase 2 B-3: `MessageAttachment` entity, register/list endpoints, metadata-only) |
| Real-time (Supabase Realtime) | ✅ | ✅ | — (Phase 1.4: STOMP over WebSocket, `/ws` endpoint, `JwtChannelInterceptor`) |

**Spring Boot parity: 100 %** (all conversation features implemented)

---

### 9. Admin Panel

| Feature | Old Backend | Spring Boot | Gap |
|---------|-------------|-------------|-----|
| Dashboard stats | ✅ | ✅ | — |
| List users | ✅ | ✅ | — |
| Change user role | — | ✅ | Spring Boot extra |
| Change user status | — | ✅ | Spring Boot extra |
| Pending reviews | ✅ | ✅ | — |
| Moderate review | ✅ | ✅ | — |
| GDPR compliance report | ✅ | ❌ | **MISSING** |
| Verify / suspend / deactivate user | 🔘 (MongoDB) | ❌ | Stub in old |
| Upload queue / video links | 🔘 (stub) | ❌ | Stub in old |
| Payments / reports / analytics | 🔘 (stub) | ❌ | Stub in old |
| Announcements | 🔘 (stub) | ❌ | Stub in old |

**Spring Boot parity: 65 % (ignoring old stubs → 90 %)**

---

### 10–24. Entirely Missing Categories

| # | Category | Old Backend Endpoints | Status in Spring Boot |
|---|----------|----------------------|----------------------|
| 10 | **PayPal Payments** | 6 endpoints (create, capture, webhook) | ✅ Phase 3 P3-7: PayPal order creation + webhook via PayPalPaymentProviderClient + PayPalWebhookController |
| 11 | **Stripe Payments** | 3 endpoints (checkout, webhook, status) | ✅ Phase 3 P3-4/P3-5/P3-6: checkout session + webhook + booking-aware transitions |
| 12 | **Google Maps / Geo** | 10–15 endpoints (geocode, nearby, distance, commute) | ❌ Not implemented |
| 13 | **GDPR / Privacy** | 15+ endpoints (consent, requests, export, deletion, tracking) | ❌ Not implemented |
| 14 | **Analytics Dashboard** | 4 endpoints (stats, popular, activity, locations) | ❌ Not implemented |
| 15 | **Email Service** | 8 endpoints (send, templates, stage emails, test config) | ❌ Not implemented |
| 16 | **Caching / Performance** | 10 endpoints (cache stats, flush, leaderboard) | ❌ Not implemented |
| 17 | **Advanced Search** | 7 endpoints (advanced, suggestions, popular, alerts, analytics) | ❌ Not implemented |
| 18 | **Media / Secure Video** | 6 endpoints (upload, list, stream, preview) | ❌ Not implemented |
| 19 | **Feedback** | 4 endpoints (submit, list, download, clear) | ❌ Not implemented |
| 20 | **Recently Viewed** | 4 endpoints (track, list, remove, clear) | ❌ Not implemented |
| 21 | **Push Notifications** | 5 endpoints (VAPID, subscribe, unsubscribe, send, bulk) | ❌ Not implemented |
| 22 | **Profile Features** | 3 endpoints (avatar upload, stats, notification prefs) | ❌ Not implemented |
| 23 | **Google Forms** | 4 endpoints (webhook, list, get, status) | ❌ Not implemented |
| 24 | **Infrastructure Extras** | Health check, CSRF token, client config, rate limiting | ⚠️ Partial (Swagger exists) |

---

## Implementation Roadmap

### Priority Tiers

| Tier | Label | Criteria |
|------|-------|----------|
| **P0** | Critical Path | Must-have for thesis demo + frontend integration |
| **P1** | High Value | Important for real-world functionality |
| **P2** | Medium Value | Nice-to-have, demonstrates advanced features |
| **P3** | Low Priority | Stubs in old backend / not core to thesis |

---

### Phase 1 — Core Gaps (P0) → Rating: 4 → 6

> **Goal:** Close authentication gaps + basic infrastructure so frontend can integrate.
> **Estimated effort:** 2–3 days

| # | Feature | New Files | Modified Files | Endpoints |
|---|---------|-----------|----------------|-----------|
| 1.1 | **Email verification flow** | `EmailService.java`, `EmailServiceImpl.java`, email templates (Thymeleaf) | `UserServiceImpl.java`, `UserController.java`, `User.java` (add emailVerified, verificationToken fields) | `GET /api/auth/verify-email/{token}` |
| 1.2 | **Forgot / reset password** | `PasswordResetToken.java`, `PasswordResetTokenRepository.java` | `UserController.java`, `UserServiceImpl.java` | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| 1.3 | **Health check endpoint** | — | `AdminController.java` or new `HealthController.java` | `GET /api/health` |
| 1.4 | **Delete notification** | — | `NotificationController.java`, `NotificationService.java` | `DELETE /api/notifications/{id}` |
| 1.5 | **Execute saved search** | — | `SavedSearchController.java`, `SavedSearchServiceImpl.java`, `ApartmentRepository.java` | `POST /api/saved-searches/{id}/execute` |
| 1.6 | **Viewing request statistics** | `ViewingRequestStatsDto.java` | `ViewingRequestController.java`, `ViewingRequestServiceImpl.java` | `GET /api/viewing-requests/statistics` |
| 1.7 | **Mark viewing completed** | — | `ViewingRequestController.java`, `ViewingRequestServiceImpl.java` | `PUT /api/viewing-requests/{id}/complete` |

**Migration scripts:** V006 (password_reset_tokens table), V007 (add email_verified + verification_token to users)

---

### Phase 2 — Search, Recently Viewed, Profile (P0/P1) → Rating: 6 → 7

> **Goal:** Features the frontend pages actively call.
> **Estimated effort:** 2–3 days

| # | Feature | New Files | Modified Files | Endpoints |
|---|---------|-----------|----------------|-----------|
| 2.1 | **Advanced search** | `SearchController.java`, `SearchService.java`, `SearchServiceImpl.java`, `SearchResultDto.java`, `SearchFilterDto.java` | `ApartmentRepository.java` (add Specification-based queries) | `GET /api/search/advanced`, `GET /api/search/suggestions`, `GET /api/search/filters` |
| 2.2 | **Recently viewed** | `RecentlyViewed.java`, `RecentlyViewedRepository.java`, `RecentlyViewedController.java`, `RecentlyViewedService.java`, `RecentlyViewedServiceImpl.java`, `RecentlyViewedDto.java` | `DataSeeder.java` | `GET`, `POST`, `DELETE /api/recently-viewed`, `DELETE /api/recently-viewed/{id}` |
| 2.3 | **Profile stats** | `ProfileController.java`, `ProfileService.java`, `ProfileServiceImpl.java`, `ProfileStatsDto.java` | — | `GET /api/profile/stats` |
| 2.4 | **Notification preferences** | `NotificationPreference.java` (or field on User) | `User.java`, `UserController.java` | `PUT /api/profile/notifications` |

**Migration scripts:** V008 (recently_viewed table), V009 (add notification_preferences to users)

---

### Phase 3 — Analytics & Feedback (P1) → Rating: 7 → 7.5

> **Goal:** Analytics dashboard + feedback system for thesis depth.
> **Estimated effort:** 1–2 days

| # | Feature | New Files | Modified Files | Endpoints |
|---|---------|-----------|----------------|-----------|
| 3.1 | **Analytics dashboard** | `AnalyticsController.java`, `AnalyticsService.java`, `AnalyticsServiceImpl.java`, `SearchAnalyticsDto.java`, `SearchLog.java`, `SearchLogRepository.java` | `SearchServiceImpl.java` (log searches) | `GET /api/analytics/stats`, `GET /api/analytics/popular`, `GET /api/analytics/activity`, `GET /api/analytics/locations` |
| 3.2 | **Feedback** | `Feedback.java`, `FeedbackRepository.java`, `FeedbackController.java`, `FeedbackService.java`, `FeedbackServiceImpl.java`, `FeedbackDto.java`, `CreateFeedbackRequest.java` | `DataSeeder.java` | `POST /api/feedback`, `GET /api/feedback` (admin), `DELETE /api/feedback` (admin) |

**Migration scripts:** V010 (search_logs table), V011 (feedback table)

---

### Phase 4 — Email Service & GDPR Basics (P1) → Rating: 7.5 → 8

> **Goal:** Email sending + GDPR consent — critical for EU compliance narrative in thesis.
> **Estimated effort:** 2–3 days

| # | Feature | New Files | Modified Files | Endpoints |
|---|---------|-----------|----------------|-----------|
| 4.1 | **Email service** | `EmailService.java`, `EmailServiceImpl.java`, `EmailController.java`, `SendEmailRequest.java`, Thymeleaf templates (viewing-confirmation.html, etc.) | `application.yml` (spring.mail config) | `POST /api/emails/send`, `GET /api/emails/templates`, `POST /api/emails/test-email-config` |
| 4.2 | **GDPR consent** | `GdprConsent.java`, `GdprConsentRepository.java`, `GdprController.java`, `GdprService.java`, `GdprServiceImpl.java`, `GdprConsentDto.java` | `DataSeeder.java` | `POST /api/gdpr/consent`, `GET /api/gdpr/consent`, `POST /api/gdpr/withdraw-consent` |
| 4.3 | **GDPR data export** | `GdprExportDto.java` | `GdprServiceImpl.java` | `GET /api/gdpr/export` |
| 4.4 | **GDPR account deletion** | — | `GdprServiceImpl.java`, `UserServiceImpl.java` | `DELETE /api/gdpr/account` |

**Migration scripts:** V012 (gdpr_consents table), V013 (gdpr_requests table)

---

### Phase 5 — File Upload & Media (P1) → Rating: 8 → 8.5

> **Goal:** Image upload for apartments + avatar — visible in every frontend page.
> **Estimated effort:** 2 days

| # | Feature | New Files | Modified Files | Endpoints |
|---|---------|-----------|----------------|-----------|
| 5.1 | **Apartment image upload** | `FileStorageService.java`, `FileStorageServiceImpl.java`, `UploadController.java`, `ApartmentImage.java`, `ApartmentImageRepository.java` | `Apartment.java` (add @OneToMany images), `ApartmentController.java`, `application.yml` (file.upload-dir) | `POST /api/apartments/{id}/images`, `DELETE /api/apartments/{id}/images/{imageId}`, `GET /api/apartments/{id}/images` |
| 5.2 | **Profile avatar upload** | — | `ProfileController.java`, `User.java` (add avatarUrl field) | `POST /api/profile/upload-avatar` |

**Migration scripts:** V014 (apartment_images table), V015 (add avatar_url to users)

---

### Phase 6 — Messaging Extras & Push (P2) → Rating: 8.5 → 9

> **Goal:** Real-time features + push notifications for thesis "advanced features" section.
> **Estimated effort:** 3–4 days

| # | Feature | New Files | Modified Files | Endpoints |
|---|---------|-----------|----------------|-----------|
| 6.1 | **WebSocket real-time messaging** | `WebSocketConfig.java`, `ChatWebSocketHandler.java`, `WebSocketSecurityConfig.java` | `ConversationServiceImpl.java` (broadcast on send) | `ws://host/ws/chat` |
| 6.2 | **Message search** | — | `ConversationController.java`, `MessageRepository.java` | `GET /api/conversations/messages/search?q=` |
| 6.3 | **Push notifications** | `PushSubscription.java`, `PushSubscriptionRepository.java`, `PushNotificationService.java`, `PushNotificationController.java` | `application.yml` (VAPID keys), `pom.xml`/`build.gradle` (web-push lib) | `GET /api/push/vapid-public-key`, `POST /api/push/subscribe`, `POST /api/push/send` |
| 6.4 | **Archive conversation** | — | `Conversation.java` (add archived flag), `ConversationController.java` | `PUT /api/conversations/{id}/archive` |

**Migration scripts:** V016 (push_subscriptions table), V017 (add archived to conversations)

---

### Phase 7 — Payments (P2) → Rating: 9 → 9.5

> **Goal:** PayPal integration for viewing request fees — impressive thesis demo.
> **Estimated effort:** 3 days

| # | Feature | New Files | Modified Files | Endpoints |
|---|---------|-----------|----------------|-----------|
| 7.1 | **PayPal order creation** | `PayPalConfig.java`, `PayPalService.java`, `PayPalServiceImpl.java`, `PayPalController.java`, `PaymentOrder.java`, `PaymentOrderRepository.java`, `CreateOrderRequest.java`, `PayPalOrderDto.java` | `build.gradle` (PayPal SDK), `application.yml` (PayPal config) | `GET /api/paypal/config`, `POST /api/paypal/create`, `POST /api/paypal/capture` |
| 7.2 | **PayPal webhooks** | `PayPalWebhookController.java` | `PayPalServiceImpl.java` | `POST /api/paypal/webhook` |
| 7.3 | **Payment status on viewing request** | — | `ViewingRequest.java` (add paymentStatus), `ViewingRequestController.java` | `PATCH /api/viewing-requests/{id}/payment` |

**Migration scripts:** V018 (payment_orders table), V019 (add payment_status to viewing_requests)

---

### Phase 8 — Google Maps & Geo (P2) → Rating: 9.5 → 10

> **Goal:** Location-based features — geocoding, nearby places, commute analysis.
> **Estimated effort:** 2–3 days

| # | Feature | New Files | Modified Files | Endpoints |
|---|---------|-----------|----------------|-----------|
| 8.1 | **Geocoding** | `MapsConfig.java`, `MapsService.java`, `MapsServiceImpl.java`, `MapsController.java`, `GeocodeResultDto.java` | `build.gradle` (Google Maps SDK), `application.yml` (maps API key) | `POST /api/maps/geocode`, `POST /api/maps/reverse-geocode` |
| 8.2 | **Nearby places** | `NearbyPlaceDto.java` | `MapsController.java` | `POST /api/maps/nearby-places`, `GET /api/maps/place/{placeId}` |
| 8.3 | **Distance & commute** | `DistanceResultDto.java`, `CommuteAnalysisDto.java` | `MapsController.java` | `POST /api/maps/distance`, `POST /api/maps/commute-analysis` |
| 8.4 | **Nearby apartments** | — | `MapsServiceImpl.java`, `ApartmentRepository.java` | `POST /api/maps/nearby-apartments` |
| 8.5 | **Address validation** | — | `MapsController.java` | `POST /api/maps/validate-address` |

---

### Skipped (P3) — Not Worth Implementing

These features were stubs, broken, or not useful for the thesis:

| Feature | Reason to Skip |
|---------|---------------|
| Google Forms integration | MongoDB-dependent, niche use case |
| Stripe payments | PayPal sufficient; Stripe was barely implemented |
| Advanced GDPR (DPIA, data breaches, compliance scanning) | MongoDB stubs, overkill for thesis |
| Redis caching / leaderboards | Performance optimization, not functional requirement |
| Secure video upload/streaming | In-memory metadata, not production-ready |
| Admin stubs (upload queue, video links, account reps) | Mock data in old backend, no real logic |
| CSRF token endpoint | Spring Security handles CSRF differently |
| Login-test endpoint | Security risk, test-only |
| Deprecated booking-request endpoints | Already removed in old backend |

---

## Migration Script Summary

| Script | Table / Change | Phase |
|--------|---------------|-------|
| V006 | `password_reset_tokens` | 1 |
| V007 | `users` add email_verified, verification_token | 1 |
| V008 | `recently_viewed` | 2 |
| V009 | `users` add notification_preferences | 2 |
| V010 | `search_logs` | 3 |
| V011 | `feedback` | 3 |
| V012 | `gdpr_consents` | 4 |
| V013 | `gdpr_requests` | 4 |
| V014 | `apartment_images` | 5 |
| V015 | `users` add avatar_url | 5 |
| V016 | `push_subscriptions` | 6 |
| V017 | `conversations` add archived | 6 |
| V018 | `payment_orders` | 7 |
| V019 | `viewing_requests` add payment_status | 7 |

**Total new tables by Phase 8:** 11 (current) + 8 new = **19 tables**
**Total new endpoints by Phase 8:** 61 (current) + ~55 new ≈ **116 endpoints**

---

## Rating Progression

```
Phase 0 (now)  ████░░░░░░  4/10   61 endpoints, 11 tables
Phase 1        ██████░░░░  6/10   +7 endpoints  → 68
Phase 2        ███████░░░  7/10   +11 endpoints → 79
Phase 3        ███████▌░░  7.5/10 +7 endpoints  → 86
Phase 4        ████████░░  8/10   +7 endpoints  → 93
Phase 5        ████████▌░  8.5/10 +4 endpoints  → 97
Phase 6        █████████░  9/10   +6 endpoints  → 103
Phase 7        █████████▌  9.5/10 +5 endpoints  → 108
Phase 8        ██████████  10/10  +8 endpoints  → 116
```

---

## Recommended Thesis Strategy

For the thesis defense, **Phases 1–4 are essential** (rating 4 → 8). They demonstrate:

1. **Complete auth lifecycle** (email verification, password reset)
2. **Search & discovery** (advanced search, recently viewed, analytics)
3. **EU compliance** (GDPR consent, data export, account deletion)
4. **Professional infrastructure** (email service, health checks)

Phases 5–8 are "impressive extras" — implement as time allows. Even reaching Phase 4
gives you a defensible, production-grade backend that surpasses the old JS prototype
in architecture, security, and reliability.

---

## Quick-Start: Phase 1 Command

```bash
# After this roadmap is committed, start Phase 1:
# 1. Create email service (Spring Mail + Thymeleaf)
# 2. Add email verification to registration flow
# 3. Add forgot/reset password
# 4. Add health check
# 5. Add missing small endpoints
# 6. Run: .\gradlew.bat clean test
# 7. Commit: git commit -m "feat: Phase 1 — auth lifecycle + infra (68 endpoints)"
```
