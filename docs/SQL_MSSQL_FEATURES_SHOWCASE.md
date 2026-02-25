# SQL Server Features — Showcase (SichrPlace)

> **Audience:** Students who want to explore MSSQL-specific features beyond
> standard SQL
> **Database:** SQL Server 2025 Developer, SichrPlace schema
> **Duration:** 30–45 minutes (pick and choose)
> **Prerequisites:** [`SQL_LAB_MSSQL_BASICS.md`](SQL_LAB_MSSQL_BASICS.md) completed

---

## Why a Separate Showcase?

The basics and intermediate labs use standard SQL that runs on any RDBMS.
This document covers **SQL Server–specific** features that the SichrPlace
backend either already uses (via JPA translation) or could benefit from.

Each feature includes:

1. A small example query on SichrPlace data
2. A note on how/if the Java layer handles it

---

## 1. `TOP` vs `OFFSET-FETCH` Pagination

### The Problem

The backend paginates apartment listings via Spring Data's `Pageable`.
JPA translates this differently for MSSQL vs PostgreSQL.

### MSSQL: `OFFSET-FETCH` (standard SQL:2008)

```sql
-- Page 1: first 5 apartments, ordered by rent
SELECT id, title, city, monthly_rent
FROM apartments
WHERE status = 'AVAILABLE'
ORDER BY monthly_rent ASC
OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY;

-- Page 2: next 5 apartments
SELECT id, title, city, monthly_rent
FROM apartments
WHERE status = 'AVAILABLE'
ORDER BY monthly_rent ASC
OFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY;
```

### MSSQL: `TOP` (older syntax, still common)

```sql
-- First 3 most expensive apartments
SELECT TOP 3 id, title, city, monthly_rent
FROM apartments
ORDER BY monthly_rent DESC;
```

> **Java layer:** Spring Data generates `OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`
> for MSSQL when you use `Pageable`. You never write `TOP` in JPQL — JPA
> handles the dialect translation.
>
> Check `ApartmentRepository.java` for `findAll(Pageable pageable)`.

---

## 2. `TRY_CONVERT` and `TRY_CAST`

### The Problem

If you `CAST('abc' AS INT)`, SQL Server throws an error.
`TRY_CONVERT` and `TRY_CAST` return `NULL` instead.

### Example: Safe date parsing

```sql
-- Suppose you have a VARCHAR column with potential date values.
-- TRY_CONVERT returns NULL for invalid dates instead of erroring.

SELECT
    id,
    title,
    TRY_CONVERT(DATE, available_from) AS parsed_date,
    CASE
        WHEN TRY_CONVERT(DATE, available_from) IS NULL
        THEN 'Invalid or NULL date'
        ELSE 'Valid'
    END AS date_status
FROM apartments;
```

### Example: Safe numeric conversion

```sql
-- TRY_CAST is the SQL standard version (SQL Server 2012+)
SELECT
    id,
    monthly_rent,
    TRY_CAST(monthly_rent AS INT)     AS rent_as_int,
    TRY_CAST('not-a-number' AS DECIMAL(10,2)) AS bad_cast  -- returns NULL
FROM apartments;
```

> **Java layer:** JPA entity fields have proper types (`BigDecimal`, `LocalDate`),
> so type mismatches are caught at the Java level before they reach MSSQL.
> `TRY_CONVERT` is useful when working directly with SQL data loading
> or ETL scripts.

---

## 3. `STRING_AGG` — Concatenate Grouped Values

### The Problem

You want a comma-separated list of all apartment titles per landlord,
in a single row per landlord.

### Query

```sql
SELECT
    u.first_name + ' ' + u.last_name AS landlord,
    STRING_AGG(a.title, ', ')
        WITHIN GROUP (ORDER BY a.monthly_rent) AS apartments
FROM users u
INNER JOIN apartments a ON u.id = a.user_id
WHERE u.role = 'LANDLORD'
GROUP BY u.first_name, u.last_name;
```

> **Output example:**
> ```
> landlord       | apartments
> Alice Müller   | Ponttor Studio, Aachen Südviertel
> Bob Vermieter  | Mitte 2-Zimmer, …
> ```
>
> **Java layer:** The backend returns apartments as a JSON array, not a
> comma-separated string. `STRING_AGG` is useful for quick reporting
> queries in SSMS but you'd avoid it in JPA.

---

## 4. `IIF` and `CHOOSE` — Inline Conditionals

### `IIF` — Ternary expression

```sql
SELECT
    id,
    title,
    monthly_rent,
    IIF(monthly_rent < 800, 'Budget', 'Standard') AS price_category
FROM apartments
ORDER BY monthly_rent;
```

### `CHOOSE` — Pick from a list by position

```sql
-- Map review rating (1–5) to a label
SELECT
    r.id,
    r.rating,
    CHOOSE(r.rating, 'Terrible', 'Poor', 'Average', 'Good', 'Excellent')
        AS rating_label,
    r.title AS review_title
FROM apartment_reviews r
ORDER BY r.rating DESC;
```

> **Java layer:** This logic typically lives in the DTO mapping or frontend.
> In SQL it's useful for quick ad-hoc reports.

---

## 5. `FORMAT` — Locale-Aware Formatting

### Example: Format rent as German currency

```sql
SELECT
    title,
    monthly_rent,
    FORMAT(monthly_rent, 'C', 'de-DE')   AS rent_de,
    FORMAT(monthly_rent, 'C', 'en-US')   AS rent_us,
    FORMAT(created_at,   'dd.MM.yyyy HH:mm', 'de-DE') AS created_de
FROM apartments;
```

> **Output example:**
> ```
> title            | monthly_rent | rent_de    | rent_us    | created_de
> Ponttor Studio   | 750.00       | 750,00 €   | $750.00    | 15.01.2026 10:00
> ```
>
> **Java layer:** Formatting is done in the frontend (JavaScript `Intl`)
> or in Java with `NumberFormat`. `FORMAT()` is a convenience for SSMS reports.

---

## 6. Views — Reusable Query Definitions

### The Problem

Multiple reports need the same "messages with user and apartment context" join.
Instead of repeating the 4-table join, create a view.

### Create the view

```sql
CREATE OR ALTER VIEW vw_message_details AS
SELECT
    m.id            AS message_id,
    m.content,
    m.message_type,
    m.created_at    AS sent_at,
    m.read_by_recipient,
    c.id            AS conversation_id,
    a.id            AS apartment_id,
    a.title         AS apartment_title,
    a.city,
    sender.id       AS sender_id,
    sender.first_name + ' ' + sender.last_name AS sender_name,
    sender.email    AS sender_email,
    sender.role     AS sender_role
FROM messages m
INNER JOIN conversations c  ON m.conversation_id  = c.id
INNER JOIN apartments    a  ON c.apartment_id     = a.id
INNER JOIN users    sender  ON m.sender_id        = sender.id;
```

### Use the view

```sql
-- Simple: all messages for a specific apartment
SELECT *
FROM vw_message_details
WHERE apartment_id = 1
ORDER BY sent_at DESC;

-- Aggregate: message count per apartment
SELECT
    apartment_title,
    city,
    COUNT(*) AS total_messages
FROM vw_message_details
GROUP BY apartment_title, city
ORDER BY total_messages DESC;
```

> **Java layer:** JPA can map views to read-only entities using `@Subselect`
> or `@Immutable`, but in SichrPlace the joins happen in JPQL.
> Views are most useful for DBA reporting and dashboards that operate
> outside the Spring Boot layer.

### A second view: apartment summary

```sql
CREATE OR ALTER VIEW vw_apartment_summary AS
SELECT
    a.id,
    a.title,
    a.city,
    a.district,
    a.monthly_rent,
    a.status,
    u.first_name + ' ' + u.last_name AS owner_name,
    u.email          AS owner_email,
    a.average_rating,
    a.review_count,
    (SELECT COUNT(*) FROM conversations c WHERE c.apartment_id = a.id)
        AS conversation_count,
    (SELECT COUNT(*) FROM user_favorites f WHERE f.apartment_id = a.id)
        AS favorite_count
FROM apartments a
INNER JOIN users u ON a.user_id = u.id;
```

```sql
-- Use it for a quick dashboard
SELECT * FROM vw_apartment_summary ORDER BY favorite_count DESC;
```

---

## 7. `DATEADD` / `DATEDIFF` — Date Arithmetic

### Example: Messages in the last N days

```sql
-- Last 30 days of messages
SELECT id, content, created_at
FROM messages
WHERE created_at >= DATEADD(DAY, -30, GETDATE())
ORDER BY created_at DESC;
```

### Example: How old is each apartment listing?

```sql
SELECT
    title,
    created_at,
    DATEDIFF(DAY,   created_at, GETDATE()) AS days_old,
    DATEDIFF(MONTH, created_at, GETDATE()) AS months_old
FROM apartments
ORDER BY days_old DESC;
```

> **Java layer:** The equivalent JPQL uses Java's `Instant.now().minus(N, ChronoUnit.DAYS)`
> and passes it as a parameter. JPA then translates to `DATEADD` for MSSQL
> or `NOW() - INTERVAL '30 days'` for PostgreSQL. This is what makes the
> backend portable across databases.

---

## 8. `MERGE` — Upsert Pattern

### The Problem

Insert a user_favorite if it doesn't exist, or do nothing if it does.
This is the "upsert" pattern.

```sql
MERGE INTO user_favorites AS target
USING (SELECT 4 AS user_id, 2 AS apartment_id) AS source
ON target.user_id = source.user_id
   AND target.apartment_id = source.apartment_id
WHEN NOT MATCHED THEN
    INSERT (user_id, apartment_id, created_at)
    VALUES (source.user_id, source.apartment_id, GETDATE());
```

> **Java layer:** The backend uses JPA's unique constraint
> (`uq_user_apartment_favorite`) and catches `DataIntegrityViolationException`
> to return HTTP 409 Conflict. `MERGE` is an alternative approach when
> working directly in SQL scripts or stored procedures.

---

## 9. Service-Mirroring Query Patterns (Mini Backend)

These are SQL equivalents of common SichrPlace service calls for the
`apartments`, `viewing_requests`, `conversations`, and `messages` slice.

### Apartment list/search with pagination

```sql
DECLARE @city NVARCHAR(100) = N'Berlin';
DECLARE @status NVARCHAR(20) = N'available';
DECLARE @offset INT = 0;
DECLARE @page_size INT = 10;

SELECT
    a.id,
    a.title,
    a.city,
    a.rent_amount,
    a.rooms,
    a.status,
    a.created_at,
    u.id AS landlord_id,
    u.username AS landlord_username
FROM dbo.apartments a
INNER JOIN dbo.users u ON u.id = a.landlord_id
WHERE (@city IS NULL OR a.city = @city)
  AND (@status IS NULL OR a.status = @status)
ORDER BY a.created_at DESC
OFFSET @offset ROWS FETCH NEXT @page_size ROWS ONLY;
```

### Tenant viewing requests (own requests only)

```sql
DECLARE @tenant_id UNIQUEIDENTIFIER = @CurrentUserId;

SELECT
    vr.id,
    vr.status,
    vr.preferred_date,
    vr.message,
    vr.created_at,
    a.id AS apartment_id,
    a.title,
    a.city,
    a.rent_amount,
    l.id AS landlord_id,
    l.username AS landlord_username
FROM dbo.viewing_requests vr
INNER JOIN dbo.apartments a ON a.id = vr.apartment_id
INNER JOIN dbo.users l ON l.id = a.landlord_id
WHERE vr.tenant_id = @tenant_id
ORDER BY vr.created_at DESC;
```

### Landlord viewing requests (for owned apartments)

```sql
DECLARE @landlord_id UNIQUEIDENTIFIER = @CurrentUserId;

SELECT
    vr.id,
    vr.status,
    vr.preferred_date,
    vr.message,
    vr.created_at,
    a.id AS apartment_id,
    a.title,
    t.id AS tenant_id,
    t.username AS tenant_username,
    t.email AS tenant_email
FROM dbo.viewing_requests vr
INNER JOIN dbo.apartments a ON a.id = vr.apartment_id
INNER JOIN dbo.users t ON t.id = vr.tenant_id
WHERE a.landlord_id = @landlord_id
ORDER BY vr.created_at DESC;
```

### Conversation list + ordered messages with sender role

```sql
DECLARE @user_id UNIQUEIDENTIFIER = @CurrentUserId;

SELECT
    c.id AS conversation_id,
    c.apartment_id,
    a.title AS apartment_title,
    c.landlord_id,
    c.tenant_id,
    c.updated_at,
    lm.created_at AS last_message_at,
    lm.content AS last_message
FROM dbo.conversations c
INNER JOIN dbo.apartments a ON a.id = c.apartment_id
OUTER APPLY (
    SELECT TOP 1 m.created_at, m.content
    FROM dbo.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
) lm
WHERE c.landlord_id = @user_id OR c.tenant_id = @user_id
ORDER BY ISNULL(lm.created_at, c.updated_at) DESC;

DECLARE @conversation_id UNIQUEIDENTIFIER = @TargetConversationId;

SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    u.role AS sender_role,
    m.content,
    m.created_at
FROM dbo.messages m
INNER JOIN dbo.users u ON u.id = m.sender_id
WHERE m.conversation_id = @conversation_id
ORDER BY m.created_at ASC;
```

### Stored procedure contracts for this slice

```sql
DECLARE @PreferredDate DATETIMEOFFSET = DATEADD(DAY, 3, SYSDATETIMEOFFSET());

EXEC dbo.sp_CreateViewingRequest
    @apartment_id = @ApartmentId,
    @tenant_id = @CurrentUserId,
    @preferred_date = @PreferredDate,
    @message = N'I can visit after work.';

EXEC dbo.sp_GetConversationWithMessages
    @conversation_id = @TargetConversationId,
    @user_id = @CurrentUserId;
```

> `sp_GetConversationWithMessages` enforces participant authorization and throws
> `50021` when the caller is not landlord/tenant of that conversation.

---

## Feature Summary

| Feature | Standard SQL? | Java/JPA equivalent | When to use in MSSQL |
|---------|:---:|---|---|
| `OFFSET-FETCH` | ✅ SQL:2008 | `Pageable` → auto-generated | Pagination in SSMS |
| `TOP` | ❌ MSSQL-only | `@Query("... LIMIT ...")` auto-translated | Quick ad-hoc queries |
| `TRY_CONVERT` / `TRY_CAST` | ❌ MSSQL-only | Java type system catches mismatches | ETL scripts, data loading |
| `STRING_AGG` | ✅ SQL:2017 | Return JSON arrays | Reporting queries |
| `IIF` / `CHOOSE` | ❌ MSSQL-only | Ternary in Java / DTO mapping | Quick labels in reports |
| `FORMAT` | ❌ MSSQL-only | `NumberFormat` / JS `Intl` | SSMS reports, locale formatting |
| Views | ✅ Standard | `@Subselect` (rare in SichrPlace) | DBA dashboards, reusable joins |
| `DATEADD` / `DATEDIFF` | ❌ MSSQL syntax | `Instant.minus()` + param binding | Date arithmetic in raw SQL |
| `MERGE` | ✅ SQL:2003 | Unique constraint + exception handling | Upsert in SQL scripts |

---

## Next Steps

- **Want exam practice?** [`SQL_EXAM_QUESTIONS.md`](SQL_EXAM_QUESTIONS.md)
- **Back to basics:** [`SQL_LAB_MSSQL_BASICS.md`](SQL_LAB_MSSQL_BASICS.md)
- **Performance & constraints:** [`SQL_LAB_MSSQL_INTERMEDIATE.md`](SQL_LAB_MSSQL_INTERMEDIATE.md)
- **Back to tutorium labs:** [`TUTORIUM_LAB_WORKPLACE.md`](TUTORIUM_LAB_WORKPLACE.md)

---

## MSSQL SichrPlace Mini – Smoke Test

> Change only the database name in `USE ...`; the rest can be copy-pasted as-is.

```sql
USE sichrplace_playground;
SET NOCOUNT ON;

-- 1) quick table snapshots
SELECT TOP (5) id, email, role, created_at
FROM dbo.users
ORDER BY created_at DESC;

SELECT TOP (5) id, landlord_id, title, city, status, created_at
FROM dbo.apartments
ORDER BY created_at DESC;

SELECT TOP (5) id, apartment_id, tenant_id, status, preferred_date, created_at
FROM dbo.viewing_requests
ORDER BY created_at DESC;

SELECT TOP (5) id, apartment_id, landlord_id, tenant_id, created_at
FROM dbo.conversations
ORDER BY created_at DESC;

SELECT TOP (5) id, conversation_id, sender_id, content, created_at
FROM dbo.messages
ORDER BY created_at DESC;

-- 2) proc test: create viewing request with a known valid pair
DECLARE @apartment_id UNIQUEIDENTIFIER = (
    SELECT TOP 1 a.id
    FROM dbo.apartments a
    WHERE a.status = N'available'
    ORDER BY a.created_at DESC
);

DECLARE @tenant_id UNIQUEIDENTIFIER = (
    SELECT TOP 1 u.id
    FROM dbo.users u
    WHERE u.role = N'tenant'
    ORDER BY u.created_at DESC
);

DECLARE @preferred_date DATETIMEOFFSET = DATEADD(DAY, 3, SYSDATETIMEOFFSET());

EXEC dbo.sp_CreateViewingRequest
    @apartment_id = @apartment_id,
    @tenant_id = @tenant_id,
    @preferred_date = @preferred_date,
    @message = N'Smoke test viewing request';

-- 3) proc test: get conversation + message stream for an authorized user
DECLARE @conversation_id UNIQUEIDENTIFIER = (
    SELECT TOP 1 c.id
    FROM dbo.conversations c
    ORDER BY c.created_at DESC
);

DECLARE @authorized_user_id UNIQUEIDENTIFIER = (
    SELECT TOP 1 c.tenant_id
    FROM dbo.conversations c
    WHERE c.id = @conversation_id
);

EXEC dbo.sp_GetConversationWithMessages
    @conversation_id = @conversation_id,
    @user_id = @authorized_user_id;
```

Expected outcomes:
- `SELECT TOP (5)` queries return rows for all five mini-backend tables.
- `sp_CreateViewingRequest` returns exactly one newly inserted `viewing_requests` row (`status = pending`).
- `sp_GetConversationWithMessages` returns two result sets: (1) conversation header and (2) ordered messages.

### `sqlcmd` – Non-interactive Smoke Test

Use `-b` so SQL errors return a non-zero exit code (CI-friendly).

```powershell
# Preferred: reusable script file
$sqlcmd = "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\SQLCMD.EXE"
& $sqlcmd -S . -d sichrplace_playground -E -C -b -i db/mssql/smoke_test.sql

# Alternative: minimal inline check
& $sqlcmd -S . -d sichrplace_playground -E -C -b -Q "SET NOCOUNT ON; SELECT TOP (1) id FROM dbo.users; SELECT TOP (1) id FROM dbo.apartments;"
```

- Replace server (`-S`), database (`-d`), and auth options (`-E` Windows auth or `-U/-P` SQL auth) for your environment.
- In CI, fail the job when the command exits non-zero; pass only on exit code `0`.
