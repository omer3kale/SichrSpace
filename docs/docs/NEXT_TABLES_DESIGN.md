# SichrPlace — Next Tables Design Note

> **Purpose:** Analyse functional gaps in the current 9-table schema and
> propose 2–4 additional tables that complete documented but un-built
> features.
>
> **Date:** February 2026
> **Schema baseline:** `V001__initial_schema_mssql.sql` (9 tables),
> `V002__seed_workplace_mssql.sql` (43 rows)

---

## 1. Gaps & Ideas

The following feature ideas already appear in existing documentation
(extension tracks, future work, lab exercises) but have **no table** yet:

| # | Feature idea | Source | New table needed? |
|---|---|---|---|
| G1 | **Viewing-request transition history** — log every status change with actor, timestamp, reason | Track B (B5–B7) | **Yes** — `viewing_request_transitions` |
| G2 | **Soft-delete on apartments and reviews** — `deletedAt` / `deletedBy` columns | Track B (B1–B4) | **No** — columns on existing tables |
| G3 | **Saved searches** — user stores a filter combination and gets notified on new matches | Track C (C4–C7) | **Yes** — `saved_searches` |
| G4 | **Analytics / usage stats** — daily aggregated platform metrics | Track A (A1–A4), THESIS §11.3 | **Maybe** — can be computed live via JPA, but a `usage_stats_daily` table enables pre-aggregation and time-series queries |
| G5 | **Apartment tags / amenity taxonomy** — normalised tags instead of free-text `amenities` column | Labs (SQL intermediate ex. 3 "propose a constraint"), THESIS §11.3 geo-search | **Yes** — `apartment_tags` (or a tag + junction table) |

**Filtering decisions:**

- **G2** (soft-delete) adds columns, not tables — excluded from this design note.
- **G4** (analytics) can start as live queries (Track A already does this);
  a summary table is Phase 3.
- **G1, G3, G5** each require a new table and are directly referenced in
  existing student tracks or labs.

---

## 2. Proposed Tables

### 2.1  `viewing_request_transitions`

**What it captures:** An append-only audit log of every state change on a
viewing request (PENDING → CONFIRMED → CANCELLED, etc.). Each row records
who made the change, when, and why.

**Use cases enabled:**
- Track B (B5–B7): transition history endpoint
  `GET /api/viewing-requests/{id}/history`
- Lab exercise: "Draw the actual state transitions you observed" (Tutorium
  Lab 2, Exercise 2.2)
- SQL lab extension: "Query the transition log to count how many requests
  were declined vs. cancelled in the last 30 days"

**Column set:**

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | BIGINT IDENTITY | NOT NULL | PK |
| `viewing_request_id` | BIGINT | NOT NULL | FK → `viewing_requests.id` |
| `from_status` | VARCHAR(20) | NULL | NULL for the initial PENDING creation |
| `to_status` | VARCHAR(20) | NOT NULL | PENDING, CONFIRMED, DECLINED, COMPLETED, CANCELLED |
| `changed_by` | BIGINT | NOT NULL | FK → `users.id` |
| `changed_at` | DATETIME2 | NOT NULL | When the transition happened |
| `reason` | VARCHAR(500) | NULL | Free-text reason (e.g. decline reason) |

**Indexes:** `idx_vrt_request` on `viewing_request_id`,
`idx_vrt_changed_at` on `changed_at`.

**DDL sketch:**

```sql
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_NAME = 'viewing_request_transitions')
BEGIN
    CREATE TABLE viewing_request_transitions (
        id                  BIGINT      IDENTITY(1,1)   NOT NULL,
        viewing_request_id  BIGINT      NOT NULL,
        from_status         VARCHAR(20) NULL,
        to_status           VARCHAR(20) NOT NULL,
        changed_by          BIGINT      NOT NULL,
        changed_at          DATETIME2   NOT NULL,
        reason              VARCHAR(500) NULL,

        CONSTRAINT pk_vr_transitions PRIMARY KEY (id),
        CONSTRAINT fk_vrt_request FOREIGN KEY (viewing_request_id)
            REFERENCES viewing_requests(id),
        CONSTRAINT fk_vrt_user FOREIGN KEY (changed_by)
            REFERENCES users(id)
    );

    CREATE INDEX idx_vrt_request    ON viewing_request_transitions (viewing_request_id);
    CREATE INDEX idx_vrt_changed_at ON viewing_request_transitions (changed_at);

    PRINT 'Created table: viewing_request_transitions';
END
ELSE
    PRINT 'Table viewing_request_transitions already exists — skipping.';
GO
```

---

### 2.2  `saved_searches`

**What it captures:** A user's saved apartment filter combination (city,
price range, bedrooms, etc.) stored as a JSON string. Enables "alert me when
a new apartment matches my criteria."

**Use cases enabled:**
- Track C (C4–C7): saved-search CRUD endpoints
- Notification type `SAVED_SEARCH_ALERT` already exists in
  `Notification.NotificationType` but has no backing table
- SQL lab: "Parse the filter_json and count how many users search for
  furnished apartments"

**Column set:**

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | BIGINT IDENTITY | NOT NULL | PK |
| `user_id` | BIGINT | NOT NULL | FK → `users.id` |
| `name` | VARCHAR(255) | NOT NULL | User-chosen label ("My Ponttor search") |
| `filter_json` | VARCHAR(MAX) | NOT NULL | Serialized search params |
| `is_active` | BIT | NOT NULL DEFAULT 1 | Can be paused without deleting |
| `last_matched_at` | DATETIME2 | NULL | Last time a new match was found |
| `match_count` | INT | NOT NULL DEFAULT 0 | Running total of matches sent |
| `created_at` | DATETIME2 | NOT NULL | Row creation time |
| `updated_at` | DATETIME2 | NULL | Last modification |

**Constraints:** Unique on `(user_id, name)` — a user can't have two saved
searches with the same label.

**DDL sketch:**

```sql
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_NAME = 'saved_searches')
BEGIN
    CREATE TABLE saved_searches (
        id              BIGINT          IDENTITY(1,1)   NOT NULL,
        user_id         BIGINT          NOT NULL,
        name            VARCHAR(255)    NOT NULL,
        filter_json     VARCHAR(MAX)    NOT NULL,
        is_active       BIT             NOT NULL        DEFAULT 1,
        last_matched_at DATETIME2       NULL,
        match_count     INT             NOT NULL        DEFAULT 0,
        created_at      DATETIME2       NOT NULL,
        updated_at      DATETIME2       NULL,

        CONSTRAINT pk_saved_searches PRIMARY KEY (id),
        CONSTRAINT fk_ss_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT uq_ss_user_name UNIQUE (user_id, name)
    );

    CREATE INDEX idx_ss_user      ON saved_searches (user_id);
    CREATE INDEX idx_ss_active    ON saved_searches (is_active);

    PRINT 'Created table: saved_searches';
END
ELSE
    PRINT 'Table saved_searches already exists — skipping.';
GO
```

---

### 2.3  `apartment_tags`

**What it captures:** A normalised many-to-many relationship between
apartments and a controlled tag vocabulary (e.g. `WLAN`, `Balkon`,
`Haustiere`, `Einbauküche`). Replaces the free-text `amenities` column
with structured, queryable data.

**Use cases enabled:**
- Track C (search filtering): filter by tag instead of `LIKE '%WLAN%'`
- SQL lab (intermediate ex. 3): "Propose a constraint or index that improves
  data quality" — tags are a textbook normalisation exercise
- ERD extension: adds a junction table to the diagram
- Geo-search (THESIS §11.3): tags could include location-related metadata

**Column set — two tables (tag + junction):**

**`tags` (lookup table):**

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | INT IDENTITY | NOT NULL | PK |
| `name` | VARCHAR(50) | NOT NULL | Unique tag label |
| `category` | VARCHAR(50) | NULL | Optional grouping (amenity, location, feature) |

**`apartment_tags` (junction):**

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `apartment_id` | BIGINT | NOT NULL | FK → `apartments.id` |
| `tag_id` | INT | NOT NULL | FK → `tags.id` |

**Constraints:** Composite PK on `(apartment_id, tag_id)`.

**DDL sketch:**

```sql
-- Tag lookup table
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_NAME = 'tags')
BEGIN
    CREATE TABLE tags (
        id       INT          IDENTITY(1,1) NOT NULL,
        name     VARCHAR(50)  NOT NULL,
        category VARCHAR(50)  NULL,

        CONSTRAINT pk_tags PRIMARY KEY (id),
        CONSTRAINT uq_tag_name UNIQUE (name)
    );

    PRINT 'Created table: tags';
END
ELSE
    PRINT 'Table tags already exists — skipping.';
GO

-- Junction table
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_NAME = 'apartment_tags')
BEGIN
    CREATE TABLE apartment_tags (
        apartment_id BIGINT NOT NULL,
        tag_id       INT    NOT NULL,

        CONSTRAINT pk_apartment_tags PRIMARY KEY (apartment_id, tag_id),
        CONSTRAINT fk_at_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id),
        CONSTRAINT fk_at_tag       FOREIGN KEY (tag_id)       REFERENCES tags(id)
    );

    CREATE INDEX idx_at_tag ON apartment_tags (tag_id);

    PRINT 'Created table: apartment_tags';
END
ELSE
    PRINT 'Table apartment_tags already exists — skipping.';
GO
```

---

### 2.4  `usage_stats_daily`

**What it captures:** Pre-aggregated daily platform metrics (new users,
messages sent, viewings requested, etc.). A materialised summary that
avoids running expensive `COUNT(*)` queries against large tables for
the admin dashboard.

**Use cases enabled:**
- Track A (analytics dashboard): faster `GET /api/admin/analytics`
- SQL lab (advanced): "Write an INSERT…SELECT that populates today's row
  from the live tables"
- MSSQL features showcase: candidate for a scheduled SQL Agent job or a
  Spring `@Scheduled` method

**Column set:**

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | BIGINT IDENTITY | NOT NULL | PK |
| `stat_date` | DATE | NOT NULL | The calendar day being summarised |
| `total_users` | INT | NOT NULL | Cumulative user count as of that day |
| `new_users` | INT | NOT NULL | Users created on that day |
| `total_apartments` | INT | NOT NULL | Cumulative apartment count |
| `new_apartments` | INT | NOT NULL | Apartments created on that day |
| `messages_sent` | INT | NOT NULL | Messages created on that day |
| `viewing_requests` | INT | NOT NULL | Viewing requests created on that day |
| `reviews_submitted` | INT | NOT NULL | Reviews submitted on that day |
| `avg_review_rating` | DECIMAL(3,2) | NULL | Average rating of reviews submitted that day |
| `created_at` | DATETIME2 | NOT NULL | When this summary row was generated |

**Constraints:** Unique on `stat_date` — one row per day.

**DDL sketch:**

```sql
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_NAME = 'usage_stats_daily')
BEGIN
    CREATE TABLE usage_stats_daily (
        id                  BIGINT          IDENTITY(1,1)   NOT NULL,
        stat_date           DATE            NOT NULL,
        total_users         INT             NOT NULL,
        new_users           INT             NOT NULL,
        total_apartments    INT             NOT NULL,
        new_apartments      INT             NOT NULL,
        messages_sent       INT             NOT NULL,
        viewing_requests    INT             NOT NULL,
        reviews_submitted   INT             NOT NULL,
        avg_review_rating   DECIMAL(3,2)    NULL,
        created_at          DATETIME2       NOT NULL,

        CONSTRAINT pk_usage_stats_daily PRIMARY KEY (id),
        CONSTRAINT uq_stat_date UNIQUE (stat_date)
    );

    CREATE INDEX idx_usd_date ON usage_stats_daily (stat_date);

    PRINT 'Created table: usage_stats_daily';
END
ELSE
    PRINT 'Table usage_stats_daily already exists — skipping.';
GO
```

---

## 3. Integration Points

### 3.1  `viewing_request_transitions`

| Aspect | Detail |
|--------|--------|
| **JPA entity** | New `ViewingRequestTransition` entity with `@ManyToOne` to `ViewingRequest` |
| **Repository** | `ViewingRequestTransitionRepository` — `findByViewingRequestIdOrderByChangedAtAsc()` |
| **Service change** | Modify `ViewingRequestService.confirm/decline/cancel()` to persist a transition row before saving the new status |
| **Controller** | Add `GET /api/viewing-requests/{id}/history` → returns `List<TransitionDto>` |
| **Teaching** | New SQL lab exercise: "Query the transition log to find the average time between PENDING and CONFIRMED". Updates state chart diagram. |

### 3.2  `saved_searches`

| Aspect | Detail |
|--------|--------|
| **JPA entity** | New `SavedSearch` entity with `@ManyToOne` to `User` |
| **Repository** | `SavedSearchRepository` — `findByUserIdOrderByCreatedAtDesc()`, `findByIsActiveTrue()` |
| **Service** | New `SavedSearchService` — CRUD + a `checkForMatches()` method (called by `@Scheduled` or on new apartment creation) |
| **Controller** | New `SavedSearchController` — `POST/GET/DELETE /api/saved-searches` |
| **Teaching** | Track C deliverable (C4–C7). SQL lab: "Join `saved_searches` to `users` and count active searches per role". |

### 3.3  `tags` + `apartment_tags`

| Aspect | Detail |
|--------|--------|
| **JPA entities** | `Tag` entity + `@ManyToMany` on `Apartment` with `@JoinTable(name = "apartment_tags")` |
| **Repository** | `TagRepository` — `findByNameIn()`. No separate repo for junction table (JPA manages it). |
| **Service change** | Extend `ApartmentService.create/update()` to accept a `List<String> tags`, resolve to `Tag` entities |
| **Controller change** | Add `tags` field to `ApartmentCreateDto` and `ApartmentResponseDto` |
| **Teaching** | Classic normalisation exercise: "Why is a junction table better than a comma-separated amenities column?" Appears in ERD as the only many-to-many relationship. |

### 3.4  `usage_stats_daily`

| Aspect | Detail |
|--------|--------|
| **JPA entity** | `UsageStatsDaily` (read/write entity, likely `@Immutable` for query use) |
| **Repository** | `UsageStatsDailyRepository` — `findByStatDateBetween()` |
| **Service** | `AnalyticsService.generateDailySummary()` — called by `@Scheduled(cron = "0 5 0 * * *")` or manual admin trigger |
| **Controller** | Extend `AdminController` — `GET /api/admin/analytics/daily?from=...&to=...` |
| **Teaching** | SQL lab: "Write the `INSERT...SELECT` that populates today's row". MSSQL features showcase: scheduling with SQL Agent. |

---

## 4. Priority & Migration Plan

| Table | Priority | Rationale | v1.3.0 Status |
|-------|----------|-----------|---------------|
| `viewing_request_transitions` | **MUST HAVE** | Directly completes Track B; the state machine is a core teaching concept and the audit log is a thesis-defensible pattern | **IMPLEMENTED** (V003, v1.1.0) |
| `saved_searches` | **MUST HAVE** | Directly completes Track C; the `SAVED_SEARCH_ALERT` notification type already exists but has no backing data | **IMPLEMENTED** (V004, v1.1.0) |
| `tags` + `apartment_tags` | **NICE TO HAVE** | Normalisation exercise is pedagogically strong but the current `amenities` column works; can be a student deliverable | **DE-SCOPED** — see note below |
| `usage_stats_daily` | **NICE TO HAVE** | Track A works with live queries; pre-aggregation is an optimisation for larger datasets | **DE-SCOPED** — see note below |

> ### De-scope note (v1.3.0-backend-10of10)
>
> **Decision:** Both NICE-TO-HAVE tables (`tags`/`apartment_tags` and
> `usage_stats_daily`) are **explicitly kept as future work** and are not
> required for the v1.3.0 10/10 thesis assessment. Rationale:
>
> - **`tags` + `apartment_tags`:** The free-text `amenities` column is
>   sufficient for the thesis demo and student exercises. Tag normalisation
>   is a strong extension exercise for future cohorts (see §2.3 integration
>   points for the full design). The DDL sketch above remains valid and
>   ready for implementation.
>
> - **`usage_stats_daily`:** The admin dashboard already uses live JPA queries
>   (`AdminService.getDashboardStats()`). Pre-aggregation is a scalability
>   optimisation that becomes relevant at production scale, not at thesis
>   demo scale (49 seed rows). The DDL sketch and `@Scheduled` design above
>   remain valid for future implementation.
>
> Both designs are preserved in this document as **student extension exercises**
> referenced from TUTORIUM_LAB_WORKPLACE.md.

### Suggested implementation order (updated v1.3.0)

```
Phase 1 — V003__viewing_request_transitions.sql           ✅ DONE (v1.1.0)
  • Table, indexes, entity, repository, service, endpoint — all implemented
  • 4 seed transitions in V005
  • Transition history endpoint: GET /api/viewing-requests/{id}/history
  • 9 unit tests in ViewingRequestServiceExtendedTest

Phase 2 — V004__saved_searches.sql                        ✅ DONE (v1.1.0)
  • Table, indexes, entity, repository, service, controller — all implemented
  • 2 seed searches in V005
  • Execute endpoint: POST /api/saved-searches/{id}/execute (v1.2.0)
  • 6 unit tests in SavedSearchServiceTest

Phase 3 — V005__tags_and_apartment_tags.sql               ❌ DE-SCOPED (v1.3.0)
  • Design preserved above (§2.3) — ready for student implementation
  • Kept as extension exercise for future cohorts

Phase 4 — V006__usage_stats_daily.sql                     ❌ DE-SCOPED (v1.3.0)
  • Design preserved above (§2.4) — ready for student implementation
  • Note: V006 version number is now used by password_reset_tokens migration
  • If implemented, use V008 or later
```

### Updated table count per phase

| Phase | Tables | Total | Status |
|-------|--------|-------|--------|
| Current (v1.0.0) | 9 | 9 | Done |
| Phase 1 | +1 (viewing_request_transitions) | 10 | **Done** (v1.1.0) |
| Phase 2 | +1 (saved_searches) | 11 | **Done** (v1.1.0) |
| v1.2.0 | +1 (password_reset_tokens) | 12 | **Done** (v1.2.0, migration V006 in v1.3.0) |
| v1.3.0 | +1 (email_verification_tokens) | 13 | **Done** (v1.3.0, migration V007) |
| Phase 3 | +2 (tags, apartment_tags) | 15 | **De-scoped** — future work |
| Phase 4 | +1 (usage_stats_daily) | 16 | **De-scoped** — future work |
