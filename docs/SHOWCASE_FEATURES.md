# SichrPlace — Showcase Features (v1.2.0-thesis-showcase)

> **Selected features for the thesis defence and open-source showcase.**
> Each feature was chosen from
> [FEATURE_ROADMAP.md](FEATURE_ROADMAP.md) / [FEATURE_ROADMAP_SPRING_PORT.md](FEATURE_ROADMAP_SPRING_PORT.md)
> to cover one of three categories: *core product value*,
> *infrastructure professionalism*, and *teaching / demo value*.

---

## 1. Execute Saved Search — *Core Product Value*

| Attribute | Detail |
|-----------|--------|
| **Endpoint** | `POST /api/saved-searches/{id}/execute` |
| **Phase** | Phase 1 (Roadmap §1.5) |
| **Priority** | P0 — Critical Path |
| **Source** | Saved Searches gap (85 % → 100 % parity) |

### What it does

Takes a user's previously saved filter combination (city, price range,
bedrooms, furnished, etc.) stored as `filter_json` in the `saved_searches`
table, deserialises it into a JPA `Specification<Apartment>`, executes a
paginated query against the `apartments` table, and returns matching results.
Updates `last_matched_at` and `match_count` on the saved search.

### Why it matters

| Audience | Impact |
|----------|--------|
| **Users** | One-click access to pre-configured apartment searches — the most-requested feature in user feedback. |
| **Examiners** | Demonstrates JPA Specifications (dynamic query composition), JSON parsing at the service layer, and cross-table integration (saved_searches → apartments). |
| **Students** | A concrete example of the Specification pattern that students can extend with new filter fields (e.g. pet_friendly, has_parking) in Track C exercises. |

---

## 2. Password Reset Flow — *Infrastructure / Professionalism*

| Attribute | Detail |
|-----------|--------|
| **Endpoints** | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| **Phase** | Phase 1 (Roadmap §1.2) |
| **Priority** | P0 — Critical Path |
| **Source** | Auth gap (55 % → 77 % parity) |
| **New table** | `password_reset_tokens` |

### What it does

1. **Forgot password** — accepts an email, generates a cryptographic token
   with a 1-hour expiry, stores it in `password_reset_tokens`, and logs
   the token (console-based — no email service yet).
2. **Reset password** — accepts the token + new password, validates expiry
   and single-use, updates the user's password hash, and invalidates the
   token.

### Why it matters

| Audience | Impact |
|----------|--------|
| **Users** | Essential auth lifecycle feature — every production-ready app needs password recovery. |
| **Examiners** | Shows secure token management (SHA-256 hash storage, time-limited, single-use), BCrypt password hashing, and idempotent DDL migration for the new table. |
| **Students** | A model for adding time-limited token flows (email verification, invitation links) — directly reusable in Track A extensions. |

---

## 3. Viewing Request Statistics & Complete — *Teaching / Demo Value*

| Attribute | Detail |
|-----------|--------|
| **Endpoints** | `GET /api/viewing-requests/statistics`, `PUT /api/viewing-requests/{id}/complete` |
| **Phase** | Phase 1 (Roadmap §1.6, §1.7) |
| **Priority** | P0 — Critical Path |
| **Source** | Viewing Requests gap (70 % → 85 % parity) |

### What it does

1. **Statistics** — aggregates viewing request data per user:
   total requests, breakdown by status (pending, confirmed, declined,
   completed, cancelled), average response time.  Uses JPQL aggregate
   queries against `viewing_requests` and `viewing_request_transitions`.
2. **Mark completed** — transitions a CONFIRMED viewing request to
   COMPLETED after the physical viewing took place.  Records the
   transition in the audit log.

### Why it matters

| Audience | Impact |
|----------|--------|
| **Users** | Landlords see how responsive they are; tenants see their request success rate. Dashboard-ready data. |
| **Examiners** | Demonstrates JPQL aggregation (GROUP BY, COUNT, AVG), MSSQL DATEDIFF for response-time calculation, and the full state-machine lifecycle (PENDING → CONFIRMED → COMPLETED). |
| **Students** | Directly ties into Lab 2 exercises ("trace state transitions") and SQL Lab exercises on aggregate queries. Completing the lifecycle gives students a real end-to-end flow to study. |

---

## Implementation Checklist

| # | Task | Status |
|---|------|--------|
| 1 | SHOWCASE_FEATURES.md (this file) | ✅ |
| 2 | `password_reset_tokens` table (V006 migration) | ⬜ |
| 3 | PasswordResetToken entity + repository | ⬜ |
| 4 | UserService: forgotPassword, resetPassword | ⬜ |
| 5 | UserController: 2 new endpoints | ⬜ |
| 6 | SavedSearchService: executeSavedSearch | ⬜ |
| 7 | SavedSearchController: execute endpoint | ⬜ |
| 8 | ViewingRequestService: statistics + complete | ⬜ |
| 9 | ViewingRequestController: 2 new endpoints | ⬜ |
| 10 | ViewingRequestStatsDto | ⬜ |
| 11 | Tests for all 3 features | ⬜ |
| 12 | API docs, labs, demo script updates | ⬜ |
| 13 | Tag v1.2.0-thesis-showcase | ⬜ |
