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
