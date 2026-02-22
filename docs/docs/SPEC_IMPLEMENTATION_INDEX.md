# SPEC_IMPLEMENTATION_INDEX

> Purpose: inventory all Markdown documents and track migration from design specs to Java code/tests as source of truth.
> Last updated: 2026-02-20

## Classification Legend
- DESIGN-SPEC: behavior/architecture/API spec intended to drive implementation.
- STATUS/REPORT: progress, audit, checklist, changelog, operational report.
- TEACHING: tutorial/lab/orientation docs retained for learning context.

## A) DESIGN-SPEC Inventory (implementation-tracked)

| MD Path | Area/Feature | Status | Implemented Classes (source of truth) | Gaps / Notes |
|---|---|---|---|---|
| docs/generated/frontend_integration/auth_password_reset.md | Password Reset | ALIGNED_TO_CODE | UserController, UserServiceImpl, GlobalExceptionHandler, UserServicePasswordResetTest, UserControllerPasswordResetTest | Legacy MD banner added; code/tests authoritative. |
| docs/generated/frontend_integration/saved_search_execute.md | Execute Saved Search | ALIGNED_TO_CODE | SavedSearchController#executeSavedSearch, SavedSearchServiceImpl#executeSavedSearch, ApartmentSpecifications, SavedSearchServiceTest, SavedSearchControllerExecuteTest | Malformed filter now mapped to 400 via IllegalArgumentException. |
| docs/generated/frontend_integration/viewing_requests_stats.md | Viewing Request Stats + Complete | ALIGNED_TO_CODE | ViewingRequestController#getStatistics/completeViewingRequest, ViewingRequestServiceImpl#getStatistics/completeViewingRequest, ViewingRequestServiceExtendedTest, ViewingRequestControllerShowcaseTest | State-machine conflict remains 409 (safer; documented). |
| docs/generated/features/auth_email_verification.md | Email Verification | ALIGNED_TO_CODE | UserController#verifyEmail/resendVerification, UserServiceImpl#verifyEmail/resendVerificationEmail, EmailVerificationToken, UserServiceEmailVerificationTest, UserControllerEmailVerificationTest | Legacy node-style GET path in MD superseded by current POST endpoints. |
| docs/generated/design/auth_email_verification_design.md | Email Verification Design | ALIGNED_TO_CODE | Same as above + EmailService/EmailServiceStub, EmailVerificationTokenRepository | Keep as historical design context; legacy banner added. |
| docs/generated/migrations/V007__user_email_verification_plan.md | Migration V007 | ALIGNED_TO_CODE | db/migrations/V007__email_verification_tokens.sql, model/EmailVerificationToken.java, repository/EmailVerificationTokenRepository.java | Plan doc mismatches final migration naming; treated as legacy plan. |
| docs/NEXT_TABLES_DESIGN.md | DB table evolution design | PARTIAL | model/*.java, db/migrations/V001..V007, BACKEND_DB_STATUS.md | Tags/analytics tables intentionally de-scoped (teaching extensions). |
| docs/FEATURE_ROADMAP.md | Feature roadmap design | PARTIAL | controllers/services/tests across implemented phases | Future phases pending by design. |
| docs/FEATURE_ROADMAP_SPRING_PORT.md | Spring port roadmap | PARTIAL | Phase-1 endpoints/services implemented | Later phases intentionally pending. |
| docs/PHASE2_FRONTEND_INTEGRATION.md | Frontend integration phase design | PARTIAL | Existing controller endpoints in API docs + tests | Contains planned integrations not fully migrated to tests yet. |
| docs/FRONTEND_INTEGRATION_OVERVIEW.md | Frontend integration contract | PARTIAL | API_ENDPOINTS_BACKEND.md + controller classes + MockMvc tests | High-level; kept for teaching/onboarding.

## B) STATUS/REPORT Inventory

| MD Path | Type |
|---|---|
| CHANGELOG.md | STATUS/REPORT |
| DEMO_SCRIPT_BACKEND.md | STATUS/REPORT |
| EXAM_CHECKLIST_BACKEND.md | STATUS/REPORT |
| THESIS_OVERVIEW_BACKEND.md | STATUS/REPORT |
| docs/API_ENDPOINTS_BACKEND.md | STATUS/REPORT |
| docs/BACKEND_10OF10_CRITERIA.md | STATUS/REPORT |
| docs/BACKEND_DB_STATUS.md | STATUS/REPORT |
| docs/COCO_RULES.md | STATUS/REPORT |
| docs/CONTRIBUTING_QUALITY.md | STATUS/REPORT |
| docs/SHOWCASE_FEATURES.md | STATUS/REPORT |
| docs/QA-HANDOVER.md | STATUS/REPORT |
| docs/TEST_ROADMAP_SESSION_2.md | STATUS/REPORT |
| docs/TEST_STRATEGY.md | STATUS/REPORT |
| docs/TEST_TODO.md | STATUS/REPORT |
| docs/diagrams/SMOKE_TEST_CHECKLIST.md | STATUS/REPORT |
| db/migrations/README.md | STATUS/REPORT |

## C) TEACHING Inventory

| MD Path | Type |
|---|---|
| docs/ENV_SETUP_GUIDE.MD | TEACHING |
| docs/FULLSTACK_GOLDEN_PATH.md | TEACHING |
| docs/FULLSTACK_LAB_EXERCISES.md | TEACHING |
| docs/mssql_droplet_setup.md | TEACHING |
| docs/ONBOARDING_README.md | TEACHING |
| docs/SECURITY_AND_SECRETS.md | TEACHING |
| docs/SEED_WORKPLACE_MSSQL.md | TEACHING |
| docs/SQL_EXAM_QUESTIONS.md | TEACHING |
| docs/SQL_LAB_MSSQL_BASICS.md | TEACHING |
| docs/SQL_LAB_MSSQL_INTERMEDIATE.md | TEACHING |
| docs/SQL_MSSQL_FEATURES_SHOWCASE.md | TEACHING |
| docs/STUDENT_EXTENSION_TRACKS.md | TEACHING |
| docs/TUTORIUM_LAB_WORKPLACE.md | TEACHING |
| docs/diagrams/architecture_flow.md | TEACHING |
| docs/diagrams/Contributing to SichrPlace.md | TEACHING |
| docs/diagrams/erd_sichrplace.md | TEACHING |
| docs/diagrams/sequence_diagrams.md | TEACHING |
| docs/diagrams/SICHRPLACE API ENDPOINTS - GERMAN.md | TEACHING |
| docs/diagrams/SICHRPLACE_DIAGRAMS.md | TEACHING |
| docs/diagrams/SICHRPLACE_NORTH_STAR.md | TEACHING |
| docs/diagrams/state_charts.md | TEACHING |
| docs/diagrams/TUTORIUM_ROADMAP.md | TEACHING |
| docs/diagrams/VPS_DEPLOYMENT_GUIDE.md | TEACHING |

## D) Session Migration Notes

### Migrated in this session
- Password Reset (already migrated; kept aligned)
- Execute Saved Search (controller-level living tests added, 400 invalid-filter alignment)
- Viewing Request Stats + Complete (controller-level living tests added)
- Email Verification (controller-level living tests added; generated specs marked legacy)

### Removal policy
Legacy DESIGN-SPEC docs should be removed only when:
1. Behavior is fully represented by Java code + tests.
2. API_ENDPOINTS_BACKEND.md and BACKEND_DB_STATUS.md reflect current contract.
3. QA sign-off confirms no drift.
