# 100% Coverage Plan

> **Last updated:** 2026-02-23 (FTL Endgame)
> **Current status:** 807 tests, 0 failures — All COCO gates GREEN

---

## 1. Current Coverage (Sprint 9 — Post-Endgame)

| Package | Coverage | COCO Threshold | Status |
|---------|----------|----------------|--------|
| security | 100.0% | 95% | PASS |
| controller | 99.4% | 99% | PASS |
| config | 51.0% | 20% | PASS |
| **service** | **99.2%** | **99%** | **PASS** |
| dto | 98.7% | 20% | PASS |
| repository | 1.4% | 0% | PASS |
| model | 89.2% | 12% | PASS |
| **OVERALL** | **88.8%** | **60%** | **PASS** |

### 1.1 Sprint 9 Coverage Gains

Service coverage improved from **98.0% → 99.2%** through:
- 27 targeted tests across 6 service files
- Turkish locale bug fix (`Locale.ROOT`) across 14 call sites
- New ContentController with 7 integration tests

---

## 2. Remaining Gaps by Package

### 2.1 Service (99.2% — 0.8% remaining)

Residual uncovered branches are edge cases in:

| Class | Coverage | Missed | Strategy |
|-------|----------|--------|----------|
| GoogleMapsService | 96.8% | 7 | HTTP client error paths — mock RestTemplate failures |
| SmartMatchingService | ~97% | ~15 | Deep nested scoring branches — diminishing returns |
| StripeWebhookService | 97.0% | 7 | Stripe API exception paths |
| PayPalPaymentProviderClient | 95.5% | 7 | PayPal API timeout/error branches |
| StripePaymentProviderClient | 97.4% | 3 | Stripe currency conversion edge case |
| MessageReactionServiceImpl | 97.8% | 5 | Concurrent modification guard |

**Recommendation:** These are all external API integration edge cases. Testing
them requires complex mock setups with diminishing quality returns. The 99.2%
threshold is excellent — pushing to 100% would require mocking third-party HTTP
failures that are better handled by integration/E2E tests in staging.

### 2.2 Controller (99.4% — 0.6% remaining)

Uncovered: rarely-hit exception handler branches in `GlobalExceptionHandler`.
Not worth pursuing — these paths are infrastructure-level.

### 2.3 Config (50.8%)

Config classes are framework wiring (beans, filters). COCO threshold is
intentionally set at 20%. Increasing coverage requires Spring Boot integration
test context manipulation — low value, high effort.

### 2.4 DTO (98.7%)

Lombok-generated `@Builder`, `@Data` methods. Near-100% is achievable but the
remaining 1.3% is generated getter/setter combinations that are never directly
called in test paths.

### 2.5 Model (89.2%)

JPA entity classes with Lombok annotations. Remaining 10.8% is Lombok-generated
`equals`/`hashCode`/`toString` plus JPA lifecycle callbacks. Low value.

### 2.6 Repository (1.4%)

Spring Data JPA interfaces — not unit-testable by design. Repository methods
are tested transitively through service tests. COCO threshold is 0%.

---

## 3. Path to Higher Coverage

### Priority 1: High-Value Tests (Current Focus — DONE)
- [x] Service uncovered branches (SmartMatching, ViewingRequest, Booking, etc.)
- [x] Admin viewing request methods
- [x] Turkish locale bug fix (real production bug found via coverage testing)
- [x] ContentController stub endpoints

### Priority 2: Medium-Value Tests (Future Sprint)
- [ ] GoogleMapsService HTTP error handling (RestTemplate mock failures)
- [ ] StripeWebhookService event processing edge cases
- [ ] PayPalPaymentProviderClient timeout/retry branches
- [ ] GlobalExceptionHandler rare paths (MethodNotAllowed, MediaTypeNotSupported)

### Priority 3: Low-Value / Diminishing Returns
- [ ] Config bean wiring tests (50.8% → 80%+)
- [ ] DTO builder edge cases (98.7% → 100%)
- [ ] Model entity lifecycle callbacks (89.2% → 95%+)
- [ ] Repository interface proxies (Spring Data handles these)

---

## 4. Test Count History

| Milestone | Tests | Failures | Sprint |
|-----------|-------|----------|--------|
| Phase 1 (Auth + CRUD) | 423 | 0 | Sprint 1–3 |
| Phase 2 (Conversations + Viewing) | 441 | 0 | Sprint 4 |
| Phase 3 (Payments + Matching) | 721 | 0 | Sprint 5–6 |
| Phase 4 (Hardening) | 751 | 0 | Sprint 7 |
| Sprint 8 (GDPR + Webhooks) | 775 | 0 | Sprint 8 |
| **Sprint 9 (FTL Endgame)** | **807** | **0** | **Sprint 9** |

---

## 5. COCO Gate Definition

The COCO (Code Coverage Objectives) system is defined in `build.gradle` and
`docs/COCO_RULES.md`. Each package has an independent threshold:

```
security   ≥ 95%   (authentication, JWT, filters)
controller ≥ 99%   (REST endpoints)
service    ≥ 99%   (business logic — highest priority)
config     ≥ 20%   (Spring wiring — low priority)
dto        ≥ 20%   (data transfer objects)
model      ≥ 12%   (JPA entities)
repository ≥  0%   (Spring Data interfaces)
OVERALL    ≥ 60%   (aggregate)
```

All gates are currently GREEN. The build will fail if any package drops below
its threshold, ensuring coverage never regresses.

---

## 6. Golden-Path Test Coverage

The canonical user flow (13 steps) has the following coverage:

| Step | Covered | Tests |
|------|---------|-------|
| 1. Register | Yes | 2 |
| 2. Verify Email | Yes | 4 |
| 3. Login | Yes | 2 |
| 4. Create Profile | Yes | 6 |
| 5. Search Apartments | Yes | 6 |
| 6. Post Listing | Yes | 5 |
| 7. Start Chat | Yes | 39 |
| 8. Request Viewing | Yes | 10 |
| 9. Confirm Viewing | Yes | 10 |
| 10. Pay for Viewing | Yes | 14 |
| 11. Booking Request | Yes | 8 |
| 12. Accept Booking | Yes | 4 |
| 13. Contract/Move-in | Deferred | 0 |

Steps 1–12 all have happy-path + error coverage. Step 13 (contract generation,
digital signing, move-in confirmation) is a future-phase feature not yet built.

---

## 7. FTL Coverage Freeze

> **Frozen:** 2026-02-23 — 807 tests, 0 failures, 88.8% overall

Further increases would require heavy config test scaffolding with low product value.
FTL requirements are fully covered. Remaining gaps (§2) are all external API integration
edge cases — appropriate for integration/E2E tests in staging, not unit-level mocking.
