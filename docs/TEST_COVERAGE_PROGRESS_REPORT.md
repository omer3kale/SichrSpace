# Test Coverage Progress Report

> **Project:** SichrPlace Backend  
> **Stack:** Spring Boot 3.2.2 / Java 21 / MSSQL 2025  
> **Report date:** 2026-02-23

---

## Final Snapshot — FTL Block Closure

| Metric | Value |
|--------|-------|
| **Total tests** | 807 |
| **Failures** | 0 |
| **Overall coverage** | 88.8% |
| **COCO status** | All gates GREEN |
| **Build timestamp** | 2026-02-23 17:08:11 |
| **Endpoints** | 89 across 15 controllers |

### Package-Level Coverage

| Package | Coverage | COCO Threshold | Status |
|---------|----------|----------------|--------|
| security | 100.0% | 95% | ✅ PASS |
| controller | 99.4% | 99% | ✅ PASS |
| service | 99.2% | 99% | ✅ PASS |
| dto | 98.7% | 20% | ✅ PASS |
| model | 89.2% | 12% | ✅ PASS |
| config | 51.0% | 20% | ✅ PASS |
| repository | 1.4% | 0% | ✅ PASS |
| **OVERALL** | **88.8%** | **60%** | ✅ **PASS** |

---

## Sprint History

| Sprint | Milestone | Tests | Key Changes |
|--------|-----------|-------|-------------|
| 1–4 | Phase 1 (Auth + Profiles) | 120 → 280 | Registration, JWT, user profiles, role-based security |
| 5–6 | Phase 2 (Listings + Chat) | 280 → 423 | Apartments, search, messaging, conversations |
| 7 | Phase 3 (Payments) | 423 → 441 | Stripe + PayPal, webhooks, payment flow |
| 8 | Coverage push | 441 → 775 | Massive test expansion, COCO gates introduced |
| 9 | FTL Endgame | 775 → 807 | Service uplift (98.0%→99.2%), Turkish locale fix, ContentController |

### Sprint 9 Key Deltas

- **Service coverage:** 98.0% → 99.2% via 27 targeted tests across 6 service files
- **Controller coverage:** 99.3% → 99.4% via ContentController (7 tests for `/api/content/*`)
- **Config coverage:** 50.8% → 51.0%
- **Overall coverage:** 88.7% → 88.8%
- **Turkish locale fix:** 14 `.toUpperCase()` sites hardened with `Locale.ROOT`
- **New endpoints:** 4 content endpoints added to SecurityConfig `permitAll()`

---

## Golden-Path Coverage (Steps 1–13)

| Step | Flow | Covered | Test Count |
|------|------|---------|------------|
| 1 | Register | ✅ | 2 |
| 2 | Verify email | ✅ | 4 |
| 3 | Login | ✅ | 2 |
| 4 | Create profile | ✅ | 6 |
| 5 | Search apartments | ✅ | 6 |
| 6 | Post listing | ✅ | 5 |
| 7 | Start chat | ✅ | 39 |
| 8 | Request viewing | ✅ | 10 |
| 9 | Confirm viewing | ✅ | 10 |
| 10 | Pay for viewing | ✅ | 14 |
| 11 | Booking request | ✅ | 8 |
| 12 | Accept booking | ✅ | 4 |
| 13 | Contract/move-in | ⏳ Deferred | 0 |

Steps 1–12: happy-path + error coverage.  
Step 13: future-phase feature — not yet built.

---

## Regression Baseline

This snapshot corresponds to the **FTL Endgame — Complete** state and should be
used as the regression baseline for all future development. Any code change must
pass the following command with 0 failures before merge:

```
.\gradlew.bat clean testWithCoverage checkCoco --no-daemon --console=plain
```

**Expected output:** 807+ tests, 0 failures, all COCO gates GREEN.
