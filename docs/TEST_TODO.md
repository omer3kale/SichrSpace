# Test TODO — SichrPlace Backend

> Checklist of missing test classes and specific edge cases.
> Each item maps to a Wave in [TEST_STRATEGY.md](TEST_STRATEGY.md) §8.

---

## Wave 1 — Service-layer unit tests

- [ ] `AdminServiceTest`
  - createAdmin / updateAdmin / deleteAdmin happy path
  - Duplicate email → exception
  - Delete non-existent admin → exception
- [ ] `SavedSearchServiceTest`
  - Create, retrieve, delete saved search per user
  - Search with filters (city, price range, property type)
  - Max saved searches per user (if limit exists)
- [ ] `ViewingRequestServiceTest`
  - Full lifecycle: PENDING → CONFIRMED → COMPLETED
  - PENDING → CANCELLED by requester
  - Transition to invalid state → exception
  - Double-confirm same request → idempotent or error
  - Viewing request for non-existent listing → exception
- [ ] `PropertyListingServiceTest`
  - CRUD happy path
  - Create listing with missing required fields → validation error
  - Price ≤ 0 → rejected
- [ ] `ReviewServiceTest`
  - Submit review, moderate (approve/reject), retrieve
  - Duplicate review by same user for same listing
  - Review for non-existent listing
- [ ] `UserServiceTest`
  - Register, login, profile update
  - Duplicate registration → exception
  - Login with wrong password → exception

## Wave 2 — Controller integration tests (`@WebMvcTest`)

- [ ] `AdminControllerTest`
  - GET /api/admins — 200 + JSON array
  - POST /api/admins — 201 + location header
  - 401 without JWT, 403 with wrong role
- [ ] `PropertyListingControllerTest`
  - GET /api/listings — 200 + pagination
  - POST /api/listings — 201, invalid body → 400
- [ ] `ViewingRequestControllerTest`
  - POST /api/viewing-requests — 201
  - PATCH /api/viewing-requests/{id}/confirm — 200
  - Invalid transition → 409 Conflict
- [ ] `ReviewControllerTest`
  - POST /api/reviews — 201
  - GET /api/reviews?listingId=X — 200
- [ ] `SavedSearchControllerTest`
  - CRUD endpoints, 401 without auth
- [ ] `UserControllerTest`
  - POST /api/auth/register — 201
  - POST /api/auth/login — 200 + JWT in body
  - Invalid credentials → 401

## Wave 3 — Security filter tests

- [ ] `JwtAuthenticationFilterTest`
  - Valid token → SecurityContext populated
  - Expired token → 401
  - Malformed token → 401
  - Missing `Authorization` header → anonymous
  - Token with wrong signing key → 401
- [ ] `SecurityConfigTest`
  - Public endpoints accessible without auth (`/api/auth/**`)
  - Protected endpoints return 401 without token
  - Role-based access: ADMIN-only endpoints reject USER role (403)
- [ ] `JwtServiceTest` (if separate)
  - Generate token → parseable
  - Extract username from token
  - Token expiry check
  - Null/empty secret → startup failure

## Wave 4 — DTO validation & edge cases

- [ ] `RegisterRequestDtoTest`
  - Null/blank email, password, name → constraint violations
  - Invalid email format → violation
  - Password shorter than minimum
- [ ] `LoginRequestDtoTest`
  - Null/blank fields
- [ ] `PropertyListingDtoTest`
  - Negative price, null title, empty address
- [ ] `ViewingRequestDtoTest`
  - Past date, null listing ID
- [ ] `ReviewDtoTest`
  - Rating out of range (0, 6 if 1–5 scale)
  - Empty review text (if required)

## Wave 5 — End-to-end lifecycle tests

- [ ] `ViewingRequestLifecycleTest`
  - Register user → create listing → request viewing → confirm → complete
  - Register user → create listing → request viewing → cancel
  - Concurrent viewing requests for same slot
- [ ] `ReviewModerationFlowTest`
  - Submit review → admin approves → visible on listing
  - Submit review → admin rejects → not visible
- [ ] `SavedSearchNotificationTest` (when notifications exist)
  - Save search → new matching listing → notification triggered

## Cross-cutting edge cases

- [ ] Pagination boundary: page=0, page=MAX_INT, size=0, size=−1
- [ ] SQL injection attempts in query parameters
- [ ] Unicode / emoji in text fields (listing title, review body)
- [ ] Very long strings (>10 000 chars) in text fields
- [ ] Concurrent writes: two users confirming same viewing request
- [ ] MSSQL-specific: `OFFSET-FETCH` with offset beyond total rows
- [ ] H2 vs MSSQL dialect differences in tests (DATEADD, STRING_AGG)

---

*Update this file as tests are written — check boxes off and ratchet
COCO targets accordingly.  See [COCO_RULES.md](COCO_RULES.md) §5.*
