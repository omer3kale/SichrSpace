# Phase 2 — Viewing Requests + Conversations: Backend Task List

> **Source**: `docs/FEATURE_ROADMAP.md` sections 3 (Viewing Requests) and 8 (Messaging / Conversations)  
> **Baseline**: 441 tests · 0 failures · COCO all-green (service 99.4 % · overall 83.1 %)  
> **Date**: 2025-07-20

---

## Status Legend

| Tag | Meaning |
|-----|---------|
| ✅ DONE | Already implemented & tested |
| 🟡 PARTIAL | Schema exists but endpoint / logic missing |
| ❌ TODO | Not started |

---

## A. Viewing Requests Gap Closure

### A-1  Mark Completed — ✅ DONE
- `PUT /api/viewing-requests/{id}/complete` exists  
- `ViewingRequestServiceImpl.completeViewingRequest()` with CONFIRMED→COMPLETED guard  
- Transition history recorded  
- **No work needed**

### A-2  Statistics Endpoint — ✅ DONE
- `GET /api/viewing-requests/statistics` exists  
- `ViewingRequestStatsDto` with total / per-status counts + avg response time  
- **No work needed**

### A-3  Email Triggers on VR Status Change — ✅ IMPLEMENTED

> Wired `EmailService.sendEmail()` into `ViewingRequestServiceImpl` lifecycle transitions.
> `EmailService` interface and `EmailServiceImpl` (SMTP) + `EmailServiceStub` (dev/test) already existed.
> Previously only `UserServiceImpl` called `EmailService` (for registration).

**Implementation details:**
- Injected `EmailService` as constructor arg via `@RequiredArgsConstructor` in `ViewingRequestServiceImpl`
- Added private helper `sendStatusEmail(to, subject, apartmentTitle, dateTime, detail)` with try/catch so mail failures never break the main workflow
- Email sent after each transition:
  - `confirmViewingRequest` → tenant receives "Viewing request confirmed"
  - `declineViewingRequest` → tenant receives "Viewing request declined" (with reason or fallback)
  - `cancelViewingRequest` → landlord receives "Viewing request cancelled" (with tenant name)
  - `completeViewingRequest` → other party receives "Viewing request completed"
- 5 new tests in `ViewingRequestServiceExtendedTest`: email verifications on happy paths + edge cases (SMTP failure, null reason, null date)
- Result: 446 tests, 0 failures, service 99.4%, overall 83.4%, all COCO green

**Tasks:**

| # | Task | Files |
|---|------|-------|
| A-3-1 | Inject `EmailService` into `ViewingRequestServiceImpl` (constructor via `@RequiredArgsConstructor`) | `ViewingRequestServiceImpl.java` |
| A-3-2 | After `confirmViewingRequest` — email tenant: "Your viewing for {apartment} on {date} has been confirmed" | `ViewingRequestServiceImpl.java` |
| A-3-3 | After `declineViewingRequest` — email tenant: "Your viewing for {apartment} was declined. Reason: {reason}" | `ViewingRequestServiceImpl.java` |
| A-3-4 | After `cancelViewingRequest` — email landlord: "Tenant {name} cancelled the viewing for {apartment}" | `ViewingRequestServiceImpl.java` |
| A-3-5 | After `completeViewingRequest` — email other party: "The viewing for {apartment} has been marked completed" | `ViewingRequestServiceImpl.java` |
| A-3-6 | Unit tests: verify `emailService.sendEmail()` called with correct args for each transition | `ViewingRequestServiceExtendedTest.java` (or new `ViewingRequestEmailTest.java`) |
| A-3-7 | Update `FEATURE_ROADMAP.md` — mark "Email triggers" as ✅ | `docs/FEATURE_ROADMAP.md` |

**Estimated test delta:** +4–6 tests  
**Schema change:** None  
**Risk:** Low — pure service wiring, no new endpoints

### A-4  Payment Status Tracking — ❌ TODO (deferred)

> Depends on Phase 2 (Dual Payments: PayPal + Stripe) from `ROADMAP.md`.
> Cannot implement until payment infrastructure exists.

**Preconditions:**
- PayPal / Stripe payment entities & endpoints
- `Payment` or `PaymentStatus` model linked to `ViewingRequest`

**Deferred tasks (placeholder):**

| # | Task | Notes |
|---|------|-------|
| A-4-1 | Add `payment_status` column to `viewing_requests` table (Flyway migration) | Enum: `NOT_REQUIRED`, `PENDING`, `PAID`, `REFUNDED` |
| A-4-2 | Add `paymentStatus` field to `ViewingRequest.java` model | Default `NOT_REQUIRED` |
| A-4-3 | Expose in `ViewingRequestDto` | |
| A-4-4 | Filter endpoints: `/my/paged?paymentStatus=PAID` | |
| A-4-5 | Tests for payment status filtering + transitions | |

**Status:** Blocked — awaiting Dual Payments phase

---

## B. Conversations / Messaging Gap Closure

### B-1  Archive Conversation — ✅ IMPLEMENTED

> Add an `archived` flag per-user so each participant can independently archive a conversation.
> The old backend used a MongoDB `archivedBy` array.

**Implementation details (Phase 2 B-1):**

- New entity `ConversationArchive` (`conversation_id`, `user_id`, `archived_at`) with unique constraint — JPA `ddl-auto` handles DDL
- New repository `ConversationArchiveRepository` with `existsByConversationIdAndUserId` and `deleteByConversationIdAndUserId`
- `ConversationRepository` — added `findByParticipantExcludingArchived()` and `findArchivedByParticipant()` JPQL sub-select queries
- `getUserConversations()` now excludes archived conversations (uses `NOT IN` sub-select)
- `PATCH /api/conversations/{id}/archive` — toggle archive (returns `{ "archived": true/false }`)
- `GET /api/conversations/archived` — list archived conversations (paginated)
- 10 new tests: service (archive, unarchive, not-found, unauthorized, get-archived, excludes-archived) + controller (archive true/false, no-auth, list archived)
- **461 tests, 0 failures, all COCO green** (service 99.3%, overall 83.6%)

**Schema change:** New table `conversation_archives` (JPA auto-DDL)  
**Risk:** Low

### B-2  Search Messages — ✅ IMPLEMENTED

> Full-text search across messages within conversations the user participates in.

**Implementation details (Phase 2 B-2):**

- `MessageRepository.searchByUserAndContent(userId, query, pageable)` — JPQL sub-select scoped to user's conversations, case-insensitive LIKE, excludes soft-deleted
- `ConversationService.searchMessages()` interface method + `ConversationServiceImpl` maps `Page<Message>` → `Page<MessageDto>`
- `GET /api/conversations/messages/search?q={query}` — `@PreAuthorize("isAuthenticated()")`, blank-query validation → 400
- 5 new tests: controller (200 with results, blank → 400, no-auth → 401) + service (match, empty result)
- **451 tests, 0 failures, all COCO green** (service 99.4%, overall 83.4%)

**Schema change:** None  
**Risk:** Low

### B-3  File Attachments — ✅ IMPLEMENTED

> `Message.java` already has `fileUrl`, `fileName`, `fileSize` columns and `MessageType.FILE/IMAGE`.
> Added: `MessageAttachment` entity for multi-attachment metadata + REST endpoints.

**Implementation details (Phase 2 B-3):**

- Created `MessageAttachment` entity (`message_attachments` table): `id`, `message_id` FK, `filename`, `contentType`, `sizeBytes`, `storageUrl`, `createdAt`
- Created `MessageAttachmentDto` with `fromEntity()` static factory, `@Builder`
- Created `MessageAttachmentRepository` with `findByMessageId(Long)`
- Created `MessageAttachmentService` interface + `MessageAttachmentServiceImpl`:
  - `addAttachment(userId, messageId, filename, contentType, sizeBytes, storageUrl)` — validates participant
  - `getAttachments(userId, messageId)` — validates participant, returns list
- `POST /api/conversations/messages/{messageId}/attachments` — register attachment metadata (201)
- `GET /api/conversations/messages/{messageId}/attachments` — list attachments
- Validation: blank filename/contentType/storageUrl → 400, null size → 400
- Non-participant → 403 (SecurityException)
- 11 new tests: 6 service tests (`MessageAttachmentServiceTest`) + 5 controller tests
- No Flyway migration — JPA `ddl-auto: update` handles DDL (same pattern as B-1, B-5)

**Schema change:** New table `message_attachments` (JPA auto-DDL)  
**Risk:** Low — metadata-only (actual file storage assumed external)

### B-4  Emoji Reactions — ✅ IMPLEMENTED

> New join-table entity: a user can react to a message with an emoji.

**Implementation details (Phase 2 B-4):**

- Created `MessageReaction` entity (`message_reactions` table): `id`, `message_id` FK, `user_id` FK, `emojiCode`, `createdAt`
  - Unique constraint `uq_reaction_msg_user_emoji` on (`message_id`, `user_id`, `emoji_code`)
- Created `MessageReactionDto` with `fromEntity()` static factory, `@Builder`
- Created `MessageReactionRepository` with `findByMessageId()`, `findByMessageIdAndUserIdAndEmojiCode()`, `existsByMessageIdAndUserIdAndEmojiCode()`
- Created dedicated `MessageReactionService` interface + `MessageReactionServiceImpl`:
  - `addReaction(userId, messageId, emojiCode)` — validates participant, checks uniqueness, saves, WebSocket push
  - `removeReaction(userId, messageId, emojiCode)` — validates participant, deletes, WebSocket push
  - `getReactions(userId, messageId)` — validates participant, returns list
- `@Autowired(required = false) SimpMessagingTemplate` for optional WebSocket push
- Push events to `/topic/conversations.{id}.reactions` with `{action: ADD/REMOVE, reaction: dto}`
- `POST /api/conversations/messages/{messageId}/reactions` — add reaction (201)
- `DELETE /api/conversations/messages/{messageId}/reactions?emoji=...` — remove reaction (204)
- `GET /api/conversations/messages/{messageId}/reactions` — list reactions
- Validation: blank emoji → 400; duplicate → 409; non-participant → 403
- 22 new tests: 13 service tests (`MessageReactionServiceTest`) + 9 controller tests
- No Flyway migration — JPA `ddl-auto: update` handles DDL (same pattern as B-1, B-5)

**Schema change:** New table `message_reactions` (JPA auto-DDL)  
**Risk:** Low — standard CRUD with WebSocket push

### B-5  Report Conversation — ✅ IMPLEMENTED

> Allow a user to flag a conversation for admin review.

**Implementation details:**
- Created `ConversationReport` entity with `conversation_id`, `reporter_id`, `reason`, `status` (PENDING/REVIEWED/DISMISSED), `created_at`, `resolved_at`, `resolved_by_id`
- No Flyway migration — JPA `ddl-auto: update` handles DDL (same as B-1 ConversationArchive)
- Created `ConversationReportRepository` with `findByStatus()`, `existsByConversationIdAndReporterId()`, `findAllByOrderByCreatedAtDesc()`
- Created `ConversationReportDto` with `fromEntity()` static factory
- Created dedicated `ConversationReportService` interface + `ConversationReportServiceImpl`:
  - `reportConversation(userId, conversationId, reason)` — validates participant, prevents duplicates
  - `getReports(status, pageable)` — admin use, optional status filter
  - `updateReportStatus(adminUserId, reportId, newStatus)` — records resolver
- `POST /api/conversations/{id}/report` added to `ConversationController` (body: `{ "reason": "..." }`, 201)
- `GET /api/admin/conversations/reports?status=PENDING` added to `AdminController` (paged, ADMIN role)
- `PATCH /api/admin/conversations/reports/{reportId}` added to `AdminController` (body: `{ "status": "REVIEWED" }`)
- 19 new tests: 7 service tests (`ConversationReportServiceTest`), 5 controller tests (`ConversationControllerTest`), 6 admin tests (`AdminControllerTest`), plus existing
- **480 tests, 0 failures, all COCO gates green**

**Test delta:** +19 tests (461 → 480)
**Schema change:** New table `conversation_reports`
**Risk:** Low — standard CRUD with role guard

### B-6  Real-Time (WebSocket) — ✅ DONE
- Phase 1.4 STOMP over WebSocket complete  
- `/ws` endpoint, `JwtChannelInterceptor`, push in `NotificationServiceImpl`, `ConversationServiceImpl`, `ViewingRequestServiceImpl`  
- **No work needed**

---

## C. Implementation Priority (Recommended Order)

| Priority | Story | Rationale |
|----------|-------|-----------|
| 1 | **A-3 Email Triggers** | Zero schema change, EmailService already exists, pure service wiring, lowest risk |
| 2 | **B-2 Search Messages** | Zero schema change, single JPQL query + 1 endpoint, high user value |
| 3 | **B-1 Archive Conversation** | Small new table, simple toggle, improves UX |
| 4 | **B-3 File Attachments** | Schema columns exist, needs file I/O service + upload endpoint |
| 5 | **B-5 Report Conversation** | New table, admin panel integration, moderation feature |
| 6 | **B-4 Emoji Reactions** | New table + DTO enrichment + WS push, most complex |
| — | **A-4 Payment Status** | Blocked until Dual Payments phase |

---

## D. Estimated Totals

| Metric | Value |
|--------|-------|
| New entities | 3 (`ConversationArchive`, `MessageReaction`, `ConversationReport`) + `MessageAttachment` |
| New tables (JPA auto-DDL) | 4 (`conversation_archives`, `conversation_reports`, `message_attachments`, `message_reactions`) |
| New endpoints | 13 |
| New service methods | ~14 |
| New test cases | ~33+ |
| Files touched | ~20 |
| Files created | ~12 |

---

## E. COCO Impact Assessment

All new code will follow existing patterns:
- Controller tests via `@WebMvcTest` with `@MockBean` services
- Service tests via `@ExtendWith(MockitoExtension.class)` with `@InjectMocks`
- Each story must pass `.\gradlew.bat testWithCoverage checkCoco` before merge

Expected post-Phase-2 test count: **~480–490 tests**  
Expected COCO gates: all green (service ≥ 99 %, controller ≥ 99 %)
