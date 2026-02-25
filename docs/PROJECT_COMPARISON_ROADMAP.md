# SichrPlace — Project Comparison & Migration Roadmap

> **Date:** 2026-02-24
> **Purpose:** Side-by-side comparison of the legacy Node.js/Supabase project vs the current Spring Boot backend, with a complete migration roadmap for rebuilding every legacy feature + a modern frontend.

---

## Table of Contents

1. [Architecture Comparison](#1-architecture-comparison)
2. [Feature-by-Feature Comparison](#2-feature-by-feature-comparison)
3. [Frontend Comparison & Recommendation](#3-frontend-comparison--recommendation)
4. [Database Schema Comparison](#4-database-schema-comparison)
5. [External Service Comparison](#5-external-service-comparison)
6. [What We Have (Spring Boot — Complete)](#6-what-we-have-spring-boot--complete)
7. [What We Need to Build — Backend Gaps](#7-what-we-need-to-build--backend-gaps)
8. [What We Need to Build — Frontend (From Scratch)](#8-what-we-need-to-build--frontend-from-scratch)
9. [Migration Roadmap — Backend Remaining Work](#9-migration-roadmap--backend-remaining-work)
10. [Migration Roadmap — Frontend Build Plan](#10-migration-roadmap--frontend-build-plan)
11. [Priority Matrix](#11-priority-matrix)
12. [Frontend Framework Recommendation](#12-frontend-framework-recommendation)

---

## 1. Architecture Comparison

| Aspect | Legacy (Node.js) | Current (Spring Boot) |
|--------|-------------------|----------------------|
| **Runtime** | Node.js + Express 4.x | Java 21 + Spring Boot 3.2.2 |
| **Database** | Supabase (PostgreSQL) + PostGIS | MSSQL 2025 (Flyway migrations) |
| **ORM** | Raw SQL via Supabase client | JPA/Hibernate + Spring Data |
| **Auth** | JWT (jsonwebtoken) + bcrypt | JWT + bcrypt + refresh token rotation + account lockout |
| **Real-time** | Supabase Realtime channels | STOMP over WebSocket (SockJS) |
| **Payment** | PayPal SDK + Stripe (dual) | PayPal + Stripe (webhook-based, provider-agnostic) |
| **Email** | Gmail SMTP (Nodemailer) | JavaMailSender (SMTP) |
| **Caching** | Redis (ioredis) | ❌ Not implemented |
| **Push Notifications** | Web Push (VAPID / web-push) | ❌ Not implemented |
| **Maps** | Google Maps API (geocoding/places/directions) | Google Maps (geocoding + reverse-geocode + nearby) |
| **File Upload** | Multer (local filesystem) | ❌ Not implemented (URLs only) |
| **Search** | Full-text + PostGIS spatial | JPA Specification-based filters |
| **API Docs** | Swagger (swagger.json) | OpenAPI 3 (springdoc-openapi) |
| **Deployment** | Railway / Netlify / Docker | DigitalOcean droplet (Caddy reverse proxy) |
| **Frontend** | Vanilla JS MPA (22 HTML pages) | ❌ Not built yet |
| **PWA** | manifest.json + Service Worker | ❌ Not implemented |
| **Analytics** | Custom analytics + Google Analytics + Microsoft Clarity | ❌ Not implemented |
| **GDPR** | Advanced compliance (tracking logs, consent management, data breaches, DPIAs) | Basic compliance (consent, export, deletion) |
| **Tests** | Jest (minimal) | JUnit 5 — **862 tests, 0 failures, 88.9% coverage** |
| **CI/Build** | None (echo "no build step") | Gradle 8.5 + JaCoCo + custom COCO gates |

---

## 2. Feature-by-Feature Comparison

### Legend
- ✅ = Fully implemented & tested
- ⚠️ = Partially implemented (missing features noted)
- ❌ = Not implemented
- 🔄 = Improved/redesigned (Spring Boot version is better)

| # | Feature Domain | Legacy Node.js | Spring Boot | Gap Analysis |
|---|----------------|----------------|-------------|--------------|
| **AUTH & USERS** ||||
| 1 | User registration | ✅ | ✅ 🔄 | SB adds email verification flow, structured error codes |
| 2 | Login with JWT | ✅ (7d token) | ✅ 🔄 | SB adds refresh token rotation, configurable expiry |
| 3 | Email verification | ✅ (GET link) | ✅ 🔄 | SB uses POST with hashed tokens, resend support |
| 4 | Password reset | ✅ | ✅ | Feature parity |
| 5 | Refresh tokens | ❌ | ✅ | SB-only: rotation, revocation, multi-device |
| 6 | Account lockout | ⚠️ (suspend at 5) | ✅ 🔄 | SB: configurable attempts + timed lockout with unlock |
| 7 | Logout / Logout-all | ❌ | ✅ | SB-only: revoke single or all refresh tokens |
| 8 | Rate limiting | ✅ (express-rate-limit) | ✅ 🔄 | SB: per-IP token bucket, configurable via properties |
| 9 | Test login (hardcoded users) | ✅ | ❌ | Dev-only; not needed in SB (seed data via Flyway) |
| 10 | Client config endpoint | ✅ | ❌ | Was for Supabase keys; replaced by feature flags |
| **APARTMENTS** ||||
| 11 | Create apartment (JSON) | ✅ | ✅ 🔄 | SB: richer model (30+ fields, enums, warm price) |
| 12 | Create apartment (multipart upload) | ✅ (multer, 10 images) | ❌ | **GAP: No file upload — images stored as URL strings only** |
| 13 | List/search apartments (basic) | ✅ | ✅ | `GET /api/apartments` with 7 filters |
| 14 | Advanced search (22 filters) | ⚠️ (basic SQL filters) | ✅ 🔄 | SB: `GET /api/apartments/search` — 22 param spec-based search returning card DTOs |
| 15 | Full-text search | ✅ (SQL ILIKE) | ❌ | **GAP: No full-text search across title/description** |
| 16 | Search suggestions / autocomplete | ✅ | ❌ | **GAP** |
| 17 | Popular searches | ✅ | ❌ | **GAP** — requires analytics tables |
| 18 | Apartment detail | ✅ | ✅ 🔄 | SB: richer DTO with owner info, ratings, area description |
| 19 | Owner's listings | ✅ | ✅ | Feature parity |
| 20 | Update apartment | ✅ | ✅ | Feature parity |
| 21 | Delete apartment | ✅ | ✅ | Feature parity |
| 22 | Nearby apartments (spatial) | ✅ (PostGIS) | ✅ | SB: bounding-box query (no PostGIS, manual lat/lng math) |
| 23 | Auto-geocoding on create | ❌ | ✅ | SB-only: geocodes address if lat/lng missing |
| **VIEWING REQUESTS** ||||
| 24 | Create viewing request | ✅ | ✅ | Feature parity |
| 25 | Approve/confirm viewing | ✅ | ✅ | Feature parity |
| 26 | Decline/reject viewing | ✅ | ✅ | Feature parity |
| 27 | Cancel viewing | ❌ | ✅ | SB-only: tenant can cancel |
| 28 | Complete viewing | ❌ | ✅ 🔄 | SB-only: marks COMPLETED + sends review-prompt email |
| 29 | Viewing statistics | ✅ | ✅ 🔄 | SB: includes average response time |
| 30 | Transition history / audit trail | ❌ | ✅ | SB-only: full status change log |
| 31 | Alternative dates (date_1, date_2) | ✅ | ❌ | **GAP: No alternative date support** |
| 32 | 3-stage email flow | ✅ (confirmation + payment link + results) | ⚠️ | SB: sends status-change emails but no "results with video" |
| 33 | Booking fee (€25 default) | ✅ | ✅ | SB: via PaymentTransaction, configurable amount |
| **VIEWING CREDITS** ||||
| 34 | 3-pack credit system | ❌ | ✅ | SB-only: pay once, next 2 free |
| 35 | Credit summary + has-credit check | ❌ | ✅ | SB-only |
| **BOOKING REQUESTS** ||||
| 36 | Wunderflats-style booking form | ❌ | ✅ | SB-only: full move-in/out, adults/children/pets JSON, reason, payer |
| 37 | Accept/decline booking | ❌ | ✅ | SB-only |
| 38 | Compare/rank applicants | ❌ | ✅ | SB-only: smart matching with scores |
| **PAYMENTS** ||||
| 39 | PayPal create order | ✅ | ✅ | Feature parity (webhook-based in SB) |
| 40 | PayPal capture/execute | ✅ | ✅ | SB: via webhook event processing |
| 41 | PayPal webhook handler | ✅ | ✅ | Feature parity |
| 42 | Stripe Checkout session | ✅ (subscription mode) | ✅ (one-time payment mode) | Different model — SB uses Checkout for viewing fees |
| 43 | Stripe webhook handler | ✅ | ✅ | Feature parity |
| 44 | PayPal marketplace capture | ✅ | ❌ | **GAP: No marketplace payment flow** |
| 45 | Refund processing | ✅ (admin) | ⚠️ | SB: PaymentTransaction has REFUNDED status but no refund initiation endpoint |
| 46 | Payment status per user | ✅ | ✅ | SB: per viewing request |
| 47 | Payment health endpoint | ❌ | ✅ | SB-only: config readiness check |
| **MESSAGING & CONVERSATIONS** ||||
| 48 | Create/get conversation | ✅ | ✅ | Feature parity (find-or-create) |
| 49 | List conversations (paginated) | ✅ | ✅ | Feature parity |
| 50 | Send message | ✅ | ✅ | Feature parity + WebSocket push |
| 51 | File attachments on messages | ✅ (multer, 10MB) | ⚠️ | SB: metadata-only (filename, contentType, storageUrl) — **no actual file upload** |
| 52 | Edit message (24h window) | ❌ | ✅ | SB-only |
| 53 | Soft-delete message | ❌ | ✅ | SB-only |
| 54 | Mark conversation read | ✅ | ✅ | Feature parity |
| 55 | Unread count | ✅ | ✅ | Feature parity |
| 56 | Search messages | ❌ | ✅ | SB-only: cross-conversation search |
| 57 | Archive conversation | ❌ | ✅ | SB-only: per-user toggle |
| 58 | Report conversation | ❌ | ✅ | SB-only: with admin review flow |
| 59 | Emoji reactions | ❌ | ✅ | SB-only: with WebSocket push |
| 60 | Real-time chat (WebSocket) | ✅ (Supabase Realtime) | ✅ (STOMP/SockJS) | Both work; SB version has JWT auth on STOMP frames |
| 61 | Typing indicators | ✅ | ❌ | **GAP** |
| 62 | Presence (online/offline) | ✅ | ❌ | **GAP** |
| 63 | Read receipts (realtime) | ✅ | ❌ | **GAP** — SB has readAt field but no realtime push of read events |
| 64 | Contact form email | ✅ (via send-message) | ❌ | **GAP: No public contact form endpoint** |
| **USER EXPERIENCE** ||||
| 65 | Favorites toggle/list | ✅ | ✅ | Feature parity |
| 66 | Favorites check + count | ✅ | ✅ | Feature parity |
| 67 | Profile upload avatar | ✅ (multer, 5MB) | ❌ | **GAP: No file upload — profileImageUrl is a URL string** |
| 68 | Profile dashboard stats | ✅ (favorites, viewings, messages, saved searches) | ❌ | **GAP: No aggregated dashboard stats endpoint** |
| 69 | Saved searches CRUD | ✅ | ✅ | Feature parity |
| 70 | Saved search execute | ✅ | ✅ | Feature parity |
| 71 | Saved search alert (daily/weekly) | ✅ | ❌ | **GAP: Scheduled alert notifications not implemented** |
| 72 | Reviews CRUD | ✅ | ✅ 🔄 | SB: richer model (pros/cons, landlord/location/value ratings, moderation) |
| 73 | Review stats (distribution) | ✅ | ✅ 🔄 | SB: per-dimension breakdown |
| 74 | Review moderation | ⚠️ (auto-pending) | ✅ 🔄 | SB: full admin moderation flow with notes |
| 75 | Review eligibility check | ❌ | ✅ | SB-only: must have COMPLETED viewing or ACCEPTED booking |
| 76 | Recently viewed apartments | ✅ (upsert, keep last 50) | ❌ | **GAP** |
| 77 | Notifications CRUD | ✅ | ✅ | Feature parity |
| 78 | Mark all read | ✅ | ✅ | Feature parity |
| 79 | Delete notification | ✅ | ✅ | Feature parity |
| **PUSH NOTIFICATIONS** ||||
| 80 | VAPID public key | ✅ | ❌ | **GAP: No push notification system** |
| 81 | Push subscribe/unsubscribe | ✅ | ❌ | **GAP** |
| 82 | Send push to user | ✅ | ❌ | **GAP** |
| 83 | Batch push | ✅ | ❌ | **GAP** |
| **SECURE VIDEO** ||||
| 84 | Video upload + stream | ✅ (500MB, HMAC tokens) | ❌ | **GAP: Entire feature missing** |
| 85 | Video preview links | ✅ (24h secure links) | ❌ | **GAP** |
| 86 | Video email links | ✅ (7-day links) | ❌ | **GAP** |
| **SEARCH & ANALYTICS** ||||
| 87 | Advanced search (full-text) | ✅ | ❌ | **GAP** (SB has filter-based, not full-text) |
| 88 | Search suggestions | ✅ | ❌ | **GAP** |
| 89 | Popular searches | ✅ | ❌ | **GAP** |
| 90 | Search analytics | ✅ | ❌ | **GAP** |
| 91 | Analytics dashboard (stats/popular/activity/locations) | ✅ | ❌ | **GAP: Entire analytics subsystem** |
| **GOOGLE MAPS** ||||
| 92 | Geocode address | ✅ | ✅ | Feature parity |
| 93 | Reverse geocode | ✅ | ✅ | Feature parity |
| 94 | Nearby places | ✅ | ✅ | Feature parity (apartments/nearby) |
| 95 | Distance calculation | ✅ | ❌ | **GAP** |
| 96 | Place details | ✅ | ❌ | **GAP** |
| 97 | Directions | ✅ | ❌ | **GAP** |
| 98 | Address validation | ✅ | ❌ | **GAP** |
| **EMAIL SYSTEM** ||||
| 99 | General email send | ✅ | ✅ | Feature parity |
| 100 | Templated emails (7 types) | ✅ (request confirmation, viewing confirmation, results, verification, password reset, payment confirmation, didn't work out) | ⚠️ | SB: sends emails but no rich HTML templates — plain text |
| 101 | Email config test | ✅ | ❌ | **GAP** |
| **ADMIN** ||||
| 102 | Dashboard stats | ✅ | ✅ 🔄 | SB: AdminDashboardDto with 11 aggregated metrics |
| 103 | User management | ✅ (list, update, delete) | ✅ | SB: list, role change, status change (no hard delete) |
| 104 | Payment/refund management | ✅ | ❌ | **GAP: No admin payment/refund endpoints** |
| 105 | Trust & safety reports | ✅ | ✅ | SB: via conversation reports |
| 106 | Support tickets | ⚠️ (resolve via reports endpoint) | ✅ 🔄 | SB: dedicated SupportTicket entity + admin endpoints |
| 107 | Upload queue (mock) | ✅ | ❌ | Was mock data; not needed |
| 108 | Video links (mock) | ✅ | ❌ | Was mock data; not needed |
| 109 | Account reps (mock) | ✅ | ❌ | Was mock data; not needed |
| 110 | Analytics insights (mock) | ✅ | ❌ | Was mock data; future analytics feature |
| **GDPR** ||||
| 111 | Consent recording | ✅ | ✅ 🔄 | SB: hashed IP/UA, Art. 7 compliant |
| 112 | Consent history | ✅ | ✅ | Feature parity |
| 113 | Data export (portability) | ✅ | ✅ 🔄 | SB: async job queue with status polling |
| 114 | Account deletion | ✅ | ✅ | Feature parity |
| 115 | GDPR request tracking | ✅ (6 request types) | ❌ | **GAP: No dedicated GDPR request types (access/rectification/restriction/objection)** |
| 116 | Tracking logs / audit trail | ✅ (gdprLogger middleware) | ❌ | **GAP: No automatic request-level GDPR audit logging** |
| 117 | Data breach management | ✅ (admin endpoints) | ❌ | **GAP** |
| 118 | Consent purpose management | ✅ (admin CRUD) | ❌ | **GAP** |
| 119 | Advanced GDPR admin dashboard | ✅ | ❌ | **GAP** |
| **INFRASTRUCTURE** ||||
| 120 | Health check | ✅ | ✅ 🔄 | SB: liveness + DB readiness + payments health |
| 121 | Redis caching layer | ✅ (apartments, search, geocoding) | ❌ | **GAP** |
| 122 | Performance monitoring | ✅ (cache stats, DB stats, system overview) | ❌ | **GAP** |
| 123 | Slow query logging | ✅ | ❌ | **GAP** |
| 124 | CSRF protection | ✅ (lusca, optional) | N/A | Not needed — stateless JWT, no cookies |
| 125 | Security headers | ✅ (helmet) | ⚠️ | SB: basic Spring Security headers (no explicit CSP policy) |
| **MISC** ||||
| 126 | Google Forms webhook | ✅ | ❌ | Low priority; niche feature |
| 127 | Feedback system | ✅ | ❌ | **GAP: No public feedback/survey endpoint** |
| 128 | Feature flags | ❌ | ✅ | SB-only |
| 129 | Smart matching (tenants) | ❌ | ✅ | SB-only: apartments-for-me |
| 130 | Smart matching (landlords) | ❌ | ✅ | SB-only: compare applicants + success rate |

---

## 3. Frontend Comparison & Recommendation

### Legacy Frontend

| Aspect | Details |
|--------|---------|
| **Architecture** | MPA — 22 standalone HTML files, no routing |
| **Styling** | Hand-written CSS variables + 1 page with Tailwind CDN; inconsistent |
| **JavaScript** | 100% vanilla, inline `<script>` blocks, global scope |
| **Templating** | None — header/footer/sidebar duplicated across every page |
| **Build system** | None (`"build": "echo 'No build step required'"`) |
| **i18n** | Custom `language-switcher.js` + `translations.json` (EN/DE/TR) |
| **PWA** | manifest.json + service worker (caching + offline support) |
| **Total pages** | 22 HTML files |
| **Total JS modules** | ~12 standalone JS files |
| **Lines of code** | ~18,000 across all HTML files |

### Legacy Frontend Pages Inventory

| Page | Role | Purpose | API Calls |
|------|------|---------|-----------|
| `index.html` | Public | Landing page + CTA + PayPal modal + FAQ | PayPal SDK, feedback |
| `login.html` | Public | Login form | `/api/auth/login` |
| `create-account.html` | Public | Registration | `/api/auth/register` |
| `forgot-password.html` | Public | Password reset request | `/api/auth/forgot-password` |
| `reset-password.html` | Public | Set new password | `/api/auth/reset-password` |
| `verify-email.html` | Public | Email verification | `/api/auth/verify-email/:token` |
| `advanced-search.html` | Public | Search with filters | `/api/apartments`, `/api/search/advanced` |
| `apartments-listing.html` | Public | Browse listings | `/api/apartments` |
| `offer.html` | Public | Apartment detail | `/api/apartments/:id`, Google Maps |
| `property-map.html` | Public | Map-based browsing | Google Maps, `/api/apartments` |
| `marketplace.html` | Public | Community marketplace | PayPal SDK |
| `chat.html` | Auth | Real-time messaging | Supabase Realtime, `/api/conversations` |
| `chat-new.html` | Auth | Simplified chat (WIP) | `/api/conversations` |
| `viewing-request.html` | Auth | Request a viewing | `/api/viewing-requests`, PayPal |
| `viewing-requests-dashboard.html` | Auth | Manage viewings | `/api/viewing-requests/my-requests` |
| `applicant-dashboard.html` | Tenant | Dashboard | `/api/profile/stats`, `/api/favorites` |
| `landlord-dashboard.html` | Landlord | Dashboard + payments | Stripe, PayPal, `/api/apartments/user/:id` |
| `landlord-extended.html` | Landlord | Extended analytics | `/api/analytics/*` |
| `add-property.html` | Landlord | Create listing | `/api/apartments` (multipart) |
| `admin-dashboard.html` | Admin | Admin panel | `/api/admin/*` |
| `admin.html` | Admin | Alternative admin view | `/api/admin/*` |
| `advanced-gdpr-dashboard.html` | Admin | GDPR management | `/api/admin/advanced-gdpr/*` |
| `privacy-policy.html` | Public | Legal page | Static |
| `terms-of-service.html` | Public | Legal page | Static |
| `privacy-settings.html` | Auth | GDPR user settings | `/api/gdpr/*` |
| `email-management.html` | Auth | Email preferences | User settings |
| `secure-viewer.html` | Auth | Viewing video player | `/api/videos/*` |

---

## 4. Database Schema Comparison

### Tables in Legacy (Supabase/PostgreSQL) vs Spring Boot (MSSQL)

| Legacy Table | Spring Boot Entity | Status | Notes |
|---|---|---|---|
| `users` | `User` | ✅ Ported | SB has more fields (lifestyle, smoking, pets, company, locale) |
| `apartments` | `Apartment` | ✅ Ported | SB has more fields (30+ vs ~15). No PostGIS. |
| `apartment_images` | ❌ | **Missing** | SB stores images as comma-separated URL string |
| `viewing_requests` | `ViewingRequest` | ✅ Ported | SB adds transition history, payment transaction FK |
| `conversations` | `Conversation` | ✅ Ported | Feature parity |
| `messages` | `Message` | ✅ Ported | SB adds edit, soft-delete, attachments, reactions |
| `user_favorites` | `UserFavorite` | ✅ Ported | Feature parity |
| `saved_searches` | `SavedSearch` | ✅ Ported | Feature parity |
| `reviews` / `feedback` | `ApartmentReview` | ✅ Ported | SB: richer model with multi-dimension ratings |
| `notifications` | `Notification` | ✅ Ported | SB: 21 notification types vs 9 |
| `push_subscriptions` | ❌ | **Missing** | No push notification system |
| `recently_viewed` | ❌ | **Missing** | No recently-viewed tracking |
| `feedback` | ❌ | **Missing** | No public feedback/survey |
| `consent_logs` | `GdprConsentLog` | ✅ Ported | SB adds hashed IP/UA |
| `data_processing_logs` | ❌ | **Missing** | No automatic GDPR audit trail |
| `gdpr_requests` | `GdprExportJob` | ⚠️ Partial | SB: export + deletion only; legacy had 6 request types |
| `consent_purposes` | ❌ | **Missing** | No consent purpose CRUD |
| `data_breaches` | ❌ | **Missing** | No breach management |
| `popular_searches` | ❌ | **Missing** | No analytics |
| `search_analytics` | ❌ | **Missing** | No analytics |
| `search_locations` | ❌ | **Missing** | No analytics |
| `analytics_events` | ❌ | **Missing** | No analytics event tracking |
| `analytics_summary` | ❌ | **Missing** | No analytics summary |
| `apartment_analytics` | ❌ | **Missing** | No per-apartment analytics |
| `user_devices` | ❌ | **Missing** | No device registry |
| `user_locations` | ❌ | **Missing** | No geolocation tracking |
| N/A | `Listing` | SB-only | Legacy/simplified listing entity |
| N/A | `BookingRequest` | SB-only | Wunderflats-style booking |
| N/A | `ViewingRequestTransition` | SB-only | Status change audit trail |
| N/A | `ViewingCreditPack` | SB-only | 3-pack credit system |
| N/A | `PaymentTransaction` | SB-only | Provider-agnostic payment records |
| N/A | `MessageAttachment` | SB-only | Attachment metadata |
| N/A | `MessageReaction` | SB-only | Emoji reactions |
| N/A | `ConversationArchive` | SB-only | Per-user archive toggle |
| N/A | `ConversationReport` | SB-only | Report with admin review |
| N/A | `SupportTicket` | SB-only | Dedicated support system |
| N/A | `RefreshToken` | SB-only | Hashed refresh token rotation |
| N/A | `EmailVerificationToken` | SB-only | Hashed email verification |
| N/A | `PasswordResetToken` | SB-only | Hashed password reset |

---

## 5. External Service Comparison

| Service | Legacy | Spring Boot | Action Needed |
|---------|--------|-------------|---------------|
| **Database** | Supabase (PostgreSQL) | MSSQL 2025 | ✅ Migrated |
| **PayPal** | PayPal REST API (create + capture + webhook) | PayPal REST API (webhook-based) | ✅ Ported |
| **Stripe** | Stripe API (subscriptions) | Stripe API (one-time Checkout) | ✅ Ported (different model) |
| **Email (SMTP)** | Gmail SMTP (Nodemailer) | JavaMailSender | ✅ Ported |
| **Google Maps** | Full suite (geocode, places, directions, distance) | Geocode + reverse + nearby apartments | ⚠️ Partial — missing directions/distance/place-details |
| **Redis** | ioredis (caching) | ❌ Not present | Consider Spring Cache + Redis if needed |
| **Web Push** | web-push (VAPID) | ❌ Not present | Need webpush4j or similar |
| **Supabase Realtime** | Used for live chat | Replaced by STOMP WebSocket | ✅ Replaced |
| **Google Analytics** | GA4 client-side | ❌ | Frontend concern |
| **Microsoft Clarity** | Client-side tracking | ❌ | Frontend concern |
| **ConsentManager CMP** | consentmanager.net SDK | ❌ | Frontend concern |
| **Google Fonts** | Poppins + Roboto | ❌ | Frontend concern |
| **Font Awesome** | Icons via CDN | ❌ | Frontend concern |

---

## 6. What We Have (Spring Boot — Complete)

### Backend Metrics
- **862 tests**, 0 failures, 88.9% overall coverage
- **126 endpoints** across 23 controllers
- **24 entities**, 53 DTOs, 24 repositories, 30+ services
- All COCO gates GREEN (security 100%, controller 99.2%, service 99.1%)

### Fully Ported Features (with improvements)
1. Auth: register, verify-email, login, refresh-token rotation, logout, account lockout, rate limiting
2. Apartments: full CRUD, 22-filter advanced search, nearby (bounding-box), auto-geocoding
3. Viewing requests: full lifecycle (PENDING→CONFIRMED→COMPLETED), transition history, emails, statistics
4. Viewing credits: 3-pack system (pay once, next 2 free)
5. Booking requests: Wunderflats-style form (adults/children/pets/reason/payer), accept/decline
6. Messaging: conversations, messages, edit/delete, search, archive, report, attachments (metadata), reactions
7. WebSocket: STOMP over SockJS with JWT auth on CONNECT frames
8. Reviews: multi-dimension ratings, eligibility check, moderation, landlord aggregates
9. Notifications: 21 types, CRUD, mark-all-read, WebSocket push
10. Favorites: toggle, list, check, count
11. Saved searches: CRUD + execute
12. Payments: PayPal + Stripe webhooks, provider-agnostic PaymentTransaction
13. Admin: dashboard stats, user management, review moderation, support tickets, conversation reports
14. GDPR: consent logging, data export (async), account deletion, consent history
15. Smart matching: tenant↔apartment scoring, applicant ranking, success rate
16. Support tickets: create, list, admin response with email notification
17. Health: liveness, DB readiness, payments health
18. Feature flags, content stubs, profile service, maps (geocode + nearby)

---

## 7. What We Need to Build — Backend Gaps

### Priority 1 — Required for Frontend MVP

| # | Feature | Effort | Why |
|---|---------|--------|-----|
| B1 | **File upload service** (images for apartments + profile avatars) | Medium | Frontend needs image upload; currently URL-only. Options: local disk, S3/MinIO, Azure Blob |
| B2 | **Recently viewed apartments** (entity + service + controller) | Small | Tenant dashboard feature — CRUD + auto-cleanup |
| B3 | **Profile dashboard stats** (aggregated endpoint) | Small | Single endpoint returning favorites count, viewings count, messages count, saved searches count |
| B4 | **HTML email templates** (Thymeleaf or FreeMarker) | Medium | Currently plain-text emails; frontend-ready product needs branded HTML emails |
| B5 | **Public contact form endpoint** | Small | Landing page needs a way to send inquiries without login |

### Priority 2 — Important for Feature Parity

| # | Feature | Effort | Why |
|---|---------|--------|-----|
| B6 | **Full-text search** (title + description) | Medium | MSSQL full-text index or `LIKE`-based search across apartment fields |
| B7 | **Search suggestions / autocomplete** | Small | Returns city/district suggestions as user types |
| B8 | **Typing indicators + presence** (WebSocket) | Medium | Chat UX — show who's typing, who's online |
| B9 | **Read receipt push** (WebSocket) | Small | Push read-at events to conversation participants |
| B10 | **Saved search alerts** (scheduled job) | Medium | `@Scheduled` task runs daily/weekly, sends notifications for new matches |
| B11 | **Alternative viewing dates** | Small | Add `alternativeDate1`/`alternativeDate2` fields to ViewingRequest |
| B12 | **Admin refund endpoint** | Small | POST endpoint to initiate PayPal/Stripe refund |
| B13 | **Feedback/survey endpoint** | Small | Public feedback submission |

### Priority 3 — Nice to Have / Future

| # | Feature | Effort | Why |
|---|---------|--------|-----|
| B14 | Redis/Spring Cache layer | Medium | Performance for heavy-traffic search |
| B15 | Push notifications (VAPID/web-push) | Large | Browser push — requires device registry, subscription management |
| B16 | Secure video management | Large | Upload, streaming, HMAC-signed links — big feature |
| B17 | Analytics event tracking | Large | Track page views, search events, apartment performance |
| B18 | Advanced GDPR (breach management, request types, consent purposes) | Medium | EU compliance extras |
| B19 | Distance / directions API | Small | Google Maps directions/distance proxy |
| B20 | Security headers (CSP policy) | Small | Content-Security-Policy header configuration |

---

## 8. What We Need to Build — Frontend (From Scratch)

### Pages / Route Map

| # | Route | Page | Role | Priority |
|---|-------|------|------|----------|
| F1 | `/` | Landing / Home | Public | P1 |
| F2 | `/login` | Login | Public | P1 |
| F3 | `/register` | Registration | Public | P1 |
| F4 | `/forgot-password` | Password reset request | Public | P1 |
| F5 | `/reset-password/:token` | Set new password | Public | P1 |
| F6 | `/verify-email/:token` | Email verification | Public | P1 |
| F7 | `/search` | Apartment search + results | Public | P1 |
| F8 | `/apartments/:id` | Apartment detail | Public | P1 |
| F9 | `/dashboard` | User dashboard (role-based) | Auth | P1 |
| F10 | `/messages` | Conversations list | Auth | P1 |
| F11 | `/messages/:id` | Chat thread | Auth | P1 |
| F12 | `/favorites` | Saved apartments | Auth | P1 |
| F13 | `/viewings` | Viewing requests list | Auth | P2 |
| F14 | `/viewings/:id` | Viewing detail | Auth | P2 |
| F15 | `/bookings` | Booking requests | Auth | P2 |
| F16 | `/bookings/new/:apartmentId` | Booking form | Tenant | P2 |
| F17 | `/apartments/new` | Create listing | Landlord | P2 |
| F18 | `/apartments/:id/edit` | Edit listing | Landlord | P2 |
| F19 | `/my-listings` | My apartments | Landlord | P2 |
| F20 | `/profile` | My profile | Auth | P2 |
| F21 | `/profile/:id` | Public profile | Auth | P2 |
| F22 | `/reviews/:apartmentId` or embedded | Reviews section | Public | P2 |
| F23 | `/notifications` | Notification center | Auth | P2 |
| F24 | `/saved-searches` | Saved searches | Auth | P3 |
| F25 | `/support` | Support tickets | Auth | P3 |
| F26 | `/privacy-settings` | GDPR settings | Auth | P3 |
| F27 | `/admin` | Admin dashboard | Admin | P3 |
| F28 | `/admin/users` | User management | Admin | P3 |
| F29 | `/admin/reviews` | Review moderation | Admin | P3 |
| F30 | `/admin/tickets` | Support ticket management | Admin | P3 |
| F31 | `/admin/reports` | Conversation reports | Admin | P3 |
| F32 | `/map` | Map-based search | Public | P3 |
| F33 | `/about` | About page | Public | P3 |
| F34 | `/faq` | FAQ page | Public | P3 |
| F35 | `/privacy-policy` | Privacy policy | Public | P3 |
| F36 | `/terms` | Terms of service | Public | P3 |

### Shared Components

| Component | Description | Used By |
|-----------|-------------|---------|
| `AppLayout` | Header + sidebar + footer shell | All auth pages |
| `PublicLayout` | Header + footer (no sidebar) | Public pages |
| `Navbar` | Top navigation with auth state, language switcher, notification bell | All pages |
| `Footer` | Site footer with links | All pages |
| `AuthGuard` | Route protection wrapper | All auth pages |
| `RoleGuard` | Role-based route protection | Admin, Landlord-only pages |
| `ApartmentCard` | Search result card tile | F7, F12, F9, F24 |
| `ApartmentDetail` | Full detail view | F8 |
| `ChatThread` | Message list + input | F11 |
| `ConversationList` | Sidebar list of conversations | F10, F11 |
| `ReviewCard` | Single review display | F8, F22 |
| `ReviewForm` | Submit/edit review | F8 |
| `BookingForm` | Wunderflats-style booking | F16 |
| `ViewingRequestCard` | Viewing request tile | F13, F9 |
| `NotificationDropdown` | Bell icon + dropdown | Navbar |
| `LanguageSwitcher` | EN/DE/TR toggle | Navbar |
| `SearchFilters` | Filter sidebar/panel | F7, F32 |
| `MapView` | Google Maps embed | F8, F32 |
| `ImageGallery` | Apartment photo carousel | F8 |
| `FileUpload` | Drag-and-drop image uploader | F17, F18, F20 |
| `PaymentModal` | PayPal/Stripe checkout | F14, F16 |
| `StatsCard` | Dashboard metric card | F9, F27 |
| `DataTable` | Paginated data table | F27-F31 |
| `Toast` | Success/error notifications | Global |
| `Modal` | Reusable dialog | Global |
| `LoadingSpinner` | Loading state | Global |
| `EmptyState` | No-data illustration | Multiple |
| `Pagination` | Page navigation | Search, lists |
| `Avatar` | User avatar with fallback | Multiple |

### Cross-Cutting Concerns

| Concern | Implementation |
|---------|---------------|
| **Auth state** | JWT in memory/localStorage, auto-refresh on 401 |
| **API client** | Axios/fetch wrapper with auth header injection |
| **WebSocket** | STOMP.js + SockJS for real-time updates |
| **i18n** | EN/DE/TR translations (port from legacy `translations.json`) |
| **Theming** | CSS variables + dark/light mode toggle |
| **Responsive** | Mobile-first, breakpoints for tablet/desktop |
| **Forms** | Validation with error messages matching backend `errorCode`s |
| **Error handling** | Global error boundary + toast notifications |
| **PWA** | manifest.json, service worker, offline fallback |
| **SEO** | SSR/SSG for public pages, meta tags, sitemap |
| **Analytics** | Google Analytics 4 + Microsoft Clarity |
| **Consent** | Cookie consent banner (GDPR) |

---

## 9. Migration Roadmap — Backend Remaining Work

### Sprint B1: MVP Backend Gaps (1–2 days)

| Task | Effort | Details |
|------|--------|---------|
| File upload service (S3/MinIO) | 4h | `FileStorageService` interface, `S3FileStorageServiceImpl`, controller for upload/download. Config: `app.storage.provider`, bucket name |
| Recently viewed entity + service + controller | 2h | `RecentlyViewed` entity, upsert logic, keep-last-50 cleanup, `GET/POST/DELETE /api/recently-viewed` |
| Profile dashboard stats endpoint | 1h | `GET /api/profiles/me/stats` → aggregates from favorites, viewings, messages, saved searches repos |
| Public contact form | 1h | `POST /api/contact` (permitAll) → sends email via EmailService |
| Full-text apartment search | 2h | Add `@Query` with `LIKE` on title + description + city in `ApartmentRepository`, wire into search |

### Sprint B2: Feature Parity (2–3 days)

| Task | Effort | Details |
|------|--------|---------|
| HTML email templates (Thymeleaf) | 4h | `src/main/resources/templates/email/` — verification, password-reset, viewing-status, review-prompt |
| Typing indicators + presence | 3h | STOMP `/app/typing` + `/user/queue/typing-indicators`, presence tracking via STOMP heartbeat |
| Search suggestions | 2h | `GET /api/apartments/suggest?q=` → distinct cities/districts matching prefix |
| Saved search alerts (scheduled) | 3h | `@Scheduled(cron)` → check active saved searches, run filters, create notifications for new matches |
| Alternative viewing dates | 1h | Add fields to ViewingRequest + DTO + migration |
| Admin refund endpoint | 2h | `POST /api/admin/payments/{id}/refund` → calls PayPal/Stripe refund API |
| Feedback endpoint | 1h | `POST /api/feedback` (permitAll) — simple rating + comment |

### Sprint B3: Nice-to-Have (deferred)

| Task | Effort | Details |
|------|--------|---------|
| Spring Cache + Redis | 4h | Cache apartment search results, profile lookups |
| Push notifications (web-push) | 8h | PushSubscription entity, VAPID keys, `web-push` Java lib |
| Secure video system | 16h | Video entity, streaming controller, HMAC token generation |
| Analytics event tracking | 8h | Event entity, tracking endpoints, dashboard aggregation |
| Advanced GDPR suite | 6h | Request types, tracking logs, breach management |

---

## 10. Migration Roadmap — Frontend Build Plan

### Recommended Framework: **Next.js 14+ (App Router) with TypeScript**

See [Section 12](#12-frontend-framework-recommendation) for detailed rationale.

### Phase F1: Foundation + Auth (3–4 days)

| Task | Details |
|------|---------|
| Project scaffolding | `create-next-app`, TypeScript, Tailwind CSS, ESLint, Prettier |
| Design system | CSS variables from legacy + Tailwind config (colors, fonts, spacing) |
| Shared layouts | `PublicLayout`, `AppLayout` (sidebar + header) |
| Auth module | Login, Register, Forgot Password, Reset Password, Verify Email pages |
| JWT management | Auth context, token storage, auto-refresh interceptor |
| API client | Axios wrapper with auth header, error handling, retry-on-401 |
| i18n setup | next-intl with EN/DE/TR from legacy `translations.json` |
| Navbar + Footer | Responsive nav with auth state, language switcher |

### Phase F2: Core Tenant Flow (4–5 days)

| Task | Details |
|------|---------|
| Landing page | Hero, CTA, apartment slider, FAQ section, contact form |
| Search page | Filter sidebar (22 filters), results grid with `ApartmentCard`, pagination, sort |
| Apartment detail | Image gallery, info sections, amenities grid, map embed, reviews, booking CTA |
| Favorites | List view with `ApartmentCard`, toggle button |
| Tenant dashboard | Stats cards, recent activity, quick links |

### Phase F3: Messaging + WebSocket (3–4 days)

| Task | Details |
|------|---------|
| Conversations list | Sidebar with avatar, last message preview, unread badge |
| Chat thread | Message bubbles, timestamps, file attachment UI, emoji reactions |
| STOMP integration | Connect on login, subscribe to user queue + conversation topics |
| Real-time updates | New message push, notification bell updates |
| Notification center | Dropdown + full-page list, mark-as-read |

### Phase F4: Viewing + Booking + Payments (3–4 days)

| Task | Details |
|------|---------|
| Viewing request form | Date picker, message, attention points |
| Viewing request list | Status badges, action buttons (confirm/decline/cancel/complete) |
| Booking form | Wunderflats-style multi-step (dates → occupants → reason → payer) |
| Payment integration | PayPal Smart Buttons + Stripe Checkout redirect |
| Viewing credits display | Credit counter, "next viewing free" indicator |

### Phase F5: Landlord Features (2–3 days)

| Task | Details |
|------|---------|
| Create/edit listing | Multi-step form with image upload, amenities checkboxes, map pin |
| My listings | Grid/list view with status badges, edit/delete |
| Landlord dashboard | Stats cards, incoming viewings, booking requests, applicant comparison |
| Smart matching | Applicant ranking cards with scores + reasons |

### Phase F6: Reviews + Profile + Support (2–3 days)

| Task | Details |
|------|---------|
| Review form | Star ratings (overall + landlord + location + value), pros/cons, text |
| Review display | Rating breakdown chart, review cards with moderation status |
| Profile page | Edit form with lifestyle fields, avatar upload |
| Public profile | Limited view (firstName, avatar, lifestyle tags, hobbies) |
| Support tickets | Create ticket form, ticket list, admin response view |
| Saved searches | List, create from current search filters, delete |

### Phase F7: Admin Panel (2–3 days)

| Task | Details |
|------|---------|
| Admin dashboard | Stats grid (users, apartments, viewings, reviews, tickets) |
| User management | DataTable with role/status change |
| Review moderation | Pending queue with approve/reject + notes |
| Support tickets | Ticket queue with response form |
| Conversation reports | Report queue with review/dismiss |

### Phase F8: Polish + PWA (2–3 days)

| Task | Details |
|------|---------|
| Map-based search | Google Maps with apartment markers, cluster view |
| Static pages | About, FAQ, Privacy Policy, Terms of Service |
| GDPR settings | Consent toggles, data export request, account deletion |
| PWA setup | manifest.json, service worker, offline fallback |
| Dark mode | Toggle + CSS variable swap |
| SEO | Meta tags, OpenGraph, structured data |
| Performance | Image optimization (next/image), lazy loading, code splitting |
| Cookie consent | GDPR banner with granular consent |
| Analytics | GA4 + Clarity integration |

---

## 11. Priority Matrix

### Combined Backend + Frontend Priority

| Priority | What | Estimated Effort | Depends On |
|----------|------|-----------------|------------|
| **P1 — MVP** | Auth + Search + Detail + Dashboard (F1+F2) + file upload backend (B1) | **8–10 days** | Nothing |
| **P2 — Core** | Chat + Viewings + Bookings + Payments (F3+F4) | **6–8 days** | P1 |
| **P3 — Features** | Landlord + Reviews + Profile + Support (F5+F6) | **4–6 days** | P1 |
| **P4 — Admin** | Admin panel (F7) | **2–3 days** | P1 |
| **P5 — Polish** | PWA + Maps + Static + Analytics (F8) | **2–3 days** | P1 |
| **P6 — Extras** | Backend B2+B3 (feature parity) | **2–3 days** | P1 |
| **P7 — Future** | Push notifications, video, analytics, advanced GDPR | **Deferred** | P1–P4 |

**Total estimated: ~25–33 working days for full feature parity** (backend gaps + complete frontend)

---

## 12. Frontend Framework Recommendation

### Recommendation: **Next.js 14+ (App Router) + TypeScript + Tailwind CSS**

| Factor | Why Next.js |
|--------|-------------|
| **SSR for SEO** | `/search` and `/apartments/:id` pages need to be indexable by Google — Next.js SSR/SSG handles this out of the box |
| **SPA navigation** | After initial load, navigation is instant (client-side routing) — critical for chat and dashboard UX |
| **TypeScript** | Type-safe API contracts matching Spring Boot DTOs — catches integration bugs at compile time |
| **Tailwind CSS** | Utility-first, consistent design system, no CSS duplication — solves legacy's biggest problem |
| **i18n** | `next-intl` or `next-i18next` for EN/DE/TR — built for the routing model |
| **Image optimization** | `next/image` auto-optimizes apartment photos — important for listing performance |
| **PWA support** | `next-pwa` plugin for manifest + service worker |
| **Ecosystem** | shadcn/ui for component primitives, React Hook Form for forms, TanStack Query for API caching |
| **Deployment** | Vercel (zero-config) or self-hosted (Docker), or static export for Netlify/Caddy |

### Recommended Stack

| Layer | Library |
|-------|---------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 3.x |
| Components | shadcn/ui (Radix primitives + Tailwind) |
| State | Zustand (auth/app state) + TanStack Query (server state) |
| Forms | React Hook Form + Zod validation |
| API client | Axios with interceptors |
| WebSocket | STOMP.js + SockJS |
| Maps | `@react-google-maps/api` |
| Charts | Recharts (admin dashboard) |
| i18n | next-intl |
| Icons | Lucide React |
| Testing | Vitest + React Testing Library + Playwright (E2E) |

### Alternative Considered: Nuxt 3 (Vue)

| Pro | Con |
|-----|-----|
| Vue's simpler mental model | Smaller ecosystem for real-time chat components |
| Good SSR support | Less mature App Router equivalent |
| Would work fine | React/Next.js has more production examples for marketplace-style apps |

**Verdict:** Next.js is the stronger choice for a marketplace platform with SEO-critical listing pages, real-time chat, complex forms, and admin dashboards.

---

## Summary Counts

| Category | Legacy Node.js | Spring Boot (Current) | Gap |
|----------|---------------|-----------------------|-----|
| Backend endpoints | ~100+ (many duplicated) | 126 (deduplicated) | +26 net new in SB |
| Database tables | ~20 (with analytics) | 24 entities | SB missing ~8 legacy tables |
| Frontend pages | 22 HTML files | 0 | **Full frontend build needed** |
| Frontend components | ~30 inline sections | 0 | **~30 components to build** |
| Unit tests | Minimal (Jest) | 862 (JUnit 5) | SB far ahead |
| Coverage | Unknown | 88.9% | SB production-grade |
| External services | 7 integrations | 5 integrations | Redis + Push missing |
| i18n strings | ~200 (EN/DE/TR) | 3 locales validated | Frontend needs translations |

**Bottom line:** The Spring Boot backend already exceeds legacy feature coverage in most areas. The main work is:
1. **5 small backend gaps** (file upload, recently viewed, dashboard stats, contact form, full-text search)
2. **A complete frontend build** (~36 pages, ~30 components, 8 phases)
