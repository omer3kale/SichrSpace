# SichrPlace — COCO Rules (Code Coverage Objectives)

> **Last updated:** February 2026
> **Enforcement:** `./gradlew checkCoco`
> **Machine-readable thresholds:** [`coco_rules.yml`](coco_rules.yml)

---

## 1. What Are COCO Rules?

COCO = **Co**de **Co**verage Objectives.  Each package has a target coverage
percentage that must be met for the build to pass.  This ensures:

- New features ship with tests.
- Regressions are caught before merge.
- Students learn to treat testing as a first-class engineering concern.

---

## 2. Per-Package Targets

| Package | Target | Min Tests | Critical Scenarios |
|---------|--------|-----------|-------------------|
| `service` | **95 %** | 30+ | Happy paths for all CRUD, auth failures, not-found, duplicate checks, ownership validation |
| `dto` | **95 %** | 15+ | `fromEntity()` mapping for every DTO, null handling, edge values |
| `security` | **90 %** | 10+ | JWT generation, JWT validation, expired token, malformed token, role extraction, filter chain |
| `controller` | **80 %** | 20+ | Each endpoint: success, 400 (validation), 401 (no token), 403 (wrong role), 404 (not found) |
| `repository` | **80 %** | 10+ | Custom query methods (findByEmail, findByOwnerId, etc.), empty-result cases |
| `model` | **70 %** | 5+ | Entity construction, relationship traversal (only if custom logic exists; Lombok-generated code excluded) |
| `config` | **60 %** | 5+ | DataSeeder runs without exception, CORS config resolves, Swagger config loads |
| **Overall** | **85 %** | 95+ | Weighted across all packages |

---

## 3. Critical Scenarios per Feature Area

### Authentication (`service/UserServiceImpl`)
- [ ] Register — success, duplicate email, duplicate username, invalid input
- [ ] Login — success, wrong password, non-existent email, inactive user
- [ ] Profile — get own, update own, update non-existent
- [ ] JWT — generate, validate, expired, malformed, wrong secret

### Apartments (`service/ApartmentServiceImpl`)
- [ ] Create — success, missing required fields, non-landlord role
- [ ] List — empty DB, with filters, pagination
- [ ] Update — owner can update, non-owner rejected, not found
- [ ] Delete — owner can delete, non-owner rejected, cascade check

### Viewing Requests (`service/ViewingRequestServiceImpl`)
- [ ] Create — success, duplicate for same apartment, apartment not found
- [ ] Confirm — owner confirms, non-owner rejected, already confirmed
- [ ] Decline — with reason, without reason, already declined
- [ ] Cancel — tenant cancels, non-tenant rejected
- [ ] Transition history — correct ordering, auth check

### Favorites (`service/FavoriteServiceImpl`)
- [ ] Add — success, already favorited (idempotent), apartment not found
- [ ] Remove — success, not favorited (idempotent)
- [ ] List — empty, with entries, pagination
- [ ] Check — true, false

### Reviews (`service/ReviewServiceImpl`)
- [ ] Submit — success, already reviewed same apartment, rating range
- [ ] Update — own review, other's review rejected
- [ ] Delete — own, other's rejected
- [ ] Moderate — admin approves, admin rejects, non-admin rejected
- [ ] Stats — correct average, correct count, zero reviews

### Notifications (`service/NotificationServiceImpl`)
- [ ] List — paged, unread only, all
- [ ] Mark read — single, all, not own rejected
- [ ] Unread count — zero, positive

### Saved Searches (`service/SavedSearchServiceImpl`)
- [ ] Create — success, duplicate name rejected
- [ ] List — by user, empty
- [ ] Toggle — active→inactive, inactive→active
- [ ] Delete — own, other's rejected

### Messaging (`service/ConversationServiceImpl`)
- [ ] Create conversation — success, already exists (return existing)
- [ ] Send message — success, conversation not found, not participant
- [ ] Edit message — within 24h, after 24h rejected, not author
- [ ] Delete — soft delete, not author rejected
- [ ] Mark read — conversation participant, non-participant rejected

### Admin (`service/AdminServiceImpl`)
- [ ] Dashboard — returns stats, handles zero data
- [ ] User management — list, change role, change status
- [ ] Review moderation — approve, reject, not found

---

## 4. Adding Coverage for New Features

When you implement a new feature (see `FEATURE_ROADMAP_SPRING_PORT.md`):

### Checklist

1. **Add unit tests** for the service implementation:
   - At least one test per public method.
   - At least one error-path test per method.
   - Target: ≥ 95% on the new service class.

2. **Add controller tests** (`@WebMvcTest`):
   - At least one test per endpoint (success case).
   - At least one auth-failure test.
   - Target: ≥ 80% on the new controller.

3. **Add DTO tests** if new DTOs are created:
   - Test `fromEntity()` with a fully populated entity.
   - Test `fromEntity()` with null optional fields.
   - Target: ≥ 95%.

4. **Add repository tests** if custom query methods are added:
   - Test with matching data, test with no matches.
   - Target: ≥ 80%.

5. **Run coverage check:**
   ```bash
   ./gradlew checkCoco
   ```

6. **Update `coco_rules.yml`** if you added a new package.

### Regression tests for bug fixes

- Write a test that **reproduces the bug** (fails before fix, passes after).
- Name it clearly: `confirmViewing_concurrentRequests_handledCorrectly()`.

---

## 5. Updating Thresholds

When adding new code that temporarily lowers coverage below a target:

1. **Preferred:** Write tests alongside the code (TDD or test-alongside).
2. **Temporary exception:** Lower the threshold in `coco_rules.yml` with a
   `TODO` comment and a target date to restore it:
   ```yaml
   service:
     target: 85  # TODO: restore to 95 after writing SavedSearchService tests (by 2026-03-01)
   ```
3. **Never** set a target below 60% for any package.

---

## 6. How Coverage Is Enforced

```
./gradlew test
    │
    ▼
./gradlew jacocoTestReport          → build/reports/jacoco/test/
    │
    ▼
./gradlew checkCoco                 → reads coco_rules.yml
    │                                  parses jacocoTestReport.xml
    │                                  compares per-package coverage
    │                                  prints summary table
    │                                  FAILS if any package below target
    ▼
CI pipeline stops on failure
```

### Console output example

```
╔══════════════════════════════════════════════════════════════╗
║  SichrPlace COCO — Code Coverage Objectives Check          ║
╠═════════════════════╦══════════╦══════════╦═════════════════╣
║ Package             ║ Coverage ║ Target   ║ Status          ║
╠═════════════════════╬══════════╬══════════╬═════════════════╣
║ service             ║   97.2%  ║   95%    ║ ✅ PASS         ║
║ dto                 ║   98.1%  ║   95%    ║ ✅ PASS         ║
║ security            ║   91.5%  ║   90%    ║ ✅ PASS         ║
║ controller          ║   82.3%  ║   80%    ║ ✅ PASS         ║
║ repository          ║   85.0%  ║   80%    ║ ✅ PASS         ║
║ model               ║   72.0%  ║   70%    ║ ✅ PASS         ║
║ config              ║   65.0%  ║   60%    ║ ✅ PASS         ║
╠═════════════════════╬══════════╬══════════╬═════════════════╣
║ OVERALL             ║   87.3%  ║   85%    ║ ✅ ALL PASS     ║
╚═════════════════════╩══════════╩══════════╩═════════════════╝
```

---

## 7. Related Documents

| Document | Purpose |
|----------|---------|
| [`TEST_STRATEGY.md`](TEST_STRATEGY.md) | Test layers, naming, writing guidelines |
| [`SECURITY_AND_SECRETS.md`](SECURITY_AND_SECRETS.md) | Secrets management and scanning |
| [`coco_rules.yml`](coco_rules.yml) | Machine-readable coverage thresholds |
