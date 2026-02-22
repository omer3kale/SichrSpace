# SQL Lab — MSSQL Intermediate (SichrPlace)

> **Audience:** SE tutorium students (after completing the basics lab)
> **Database:** SQL Server 2025 Developer, SichrPlace schema (9 tables, 43 seed rows)
> **Duration:** 60–90 minutes
> **Prerequisites:** [`SQL_LAB_MSSQL_BASICS.md`](SQL_LAB_MSSQL_BASICS.md) completed

---

## Overview

This lab moves beyond `SELECT`/`JOIN`/`GROUP BY` into topics you'll encounter
in real backend work:

| Area | Exercises |
|------|-----------|
| Normalization & constraints | 1–3 |
| Indexing & performance | 4–5 |
| Parameterised thinking | 6–7 |
| Subqueries & CTEs | 8 |

---

## Part 1 — Normalization & Constraints

### Exercise 1 — Map the primary and foreign keys

> **Task:** Query the system catalog to list every FK constraint in the
> SichrPlace database, showing parent table → child table and columns.

```sql
SELECT
    fk.name                         AS fk_name,
    tp.name                         AS parent_table,
    cp.name                         AS parent_column,
    tr.name                         AS referenced_table,
    cr.name                         AS referenced_column
FROM sys.foreign_keys            fk
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.tables             tp  ON fkc.parent_object_id     = tp.object_id
INNER JOIN sys.columns            cp  ON fkc.parent_object_id     = cp.object_id
                                     AND fkc.parent_column_id     = cp.column_id
INNER JOIN sys.tables             tr  ON fkc.referenced_object_id = tr.object_id
INNER JOIN sys.columns            cr  ON fkc.referenced_object_id = cr.object_id
                                     AND fkc.referenced_column_id = cr.column_id
ORDER BY parent_table, fk_name;
```

> **Question:** How many FK relationships exist? Which table has the most FKs
> pointing outward? (Hint: `conversations` has 3.)

---

### Exercise 2 — Verify unique constraints

> **Task:** The `apartment_reviews` table has a unique constraint
> `uq_apartment_reviewer` on `(apartment_id, reviewer_id)`.
> Try to violate it and observe the error.

```sql
-- First, find an existing review
SELECT TOP 1 apartment_id, reviewer_id FROM apartment_reviews;
-- Suppose that returns apartment_id=1, reviewer_id=4

-- Now try to insert a duplicate
INSERT INTO apartment_reviews
    (apartment_id, reviewer_id, rating, title, comment, status, created_at, updated_at)
VALUES
    (1, 4, 5, 'Duplicate test', 'This should fail', 'PENDING', GETDATE(), GETDATE());
```

> **Expected:** Error 2627 — violation of UNIQUE constraint.
>
> **Best practice:** Unique constraints prevent data anomalies at the database
> level, even if the application layer has a bug. They are the last line of
> defence for data integrity.

---

### Exercise 3 — Propose a new constraint or index

> **Task:** Study the schema and propose **one** additional constraint or
> index that would improve data quality or performance. Write the DDL
> statement and a 2-sentence justification.

**Example proposals:**

| Proposal | DDL | Justification |
|----------|-----|---------------|
| CHECK constraint on `rating` | `ALTER TABLE apartment_reviews ADD CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5);` | Prevents invalid ratings at the DB level. The UI limits to 1–5 but direct SQL inserts could bypass that. |
| Index on `messages.created_at` | `CREATE INDEX idx_msg_created ON messages(created_at);` | Already exists (`idx_msg_created_at`), but verify — the "recent messages" query in Exercise 5 of the basics lab benefits from this. |
| NOT NULL on `apartments.district` | `ALTER TABLE apartments ALTER COLUMN district NVARCHAR(255) NOT NULL;` | Every Aachen apartment has a district; making this NOT NULL prevents incomplete records. |

> **Your turn:** Pick one that doesn't exist yet, write the DDL, and justify it.

---

## Part 2 — Indexing & Performance

### Exercise 4 — Compare a naive query vs. an indexed query

> **Task:** Run both queries below and compare their execution plans
> (in SSMS: Ctrl+M to include Actual Execution Plan, then execute).

**Query A — Filter on non-indexed column (`bio`):**

```sql
SELECT id, first_name, email
FROM users
WHERE bio LIKE '%looking%';
```

**Query B — Filter on indexed column (`email`):**

```sql
SELECT id, first_name, email
FROM users
WHERE email = 'charlie.student@rwth-aachen.de';
```

> **What to observe:**
>
> | Aspect | Query A | Query B |
> |--------|---------|---------|
> | Scan type | Table Scan or Clustered Index Scan | Index Seek on `idx_user_email` |
> | Estimated cost | Higher (scans all rows) | Lower (direct lookup) |
> | Why | `bio` has no index | `email` has a unique index |
>
> **Best practice:** When writing `WHERE` clauses, prefer columns that have
> an index. Avoid `LIKE '%…'` patterns on unindexed TEXT columns in
> production — they always trigger full scans.

---

### Exercise 5 — List all indexes on the SichrPlace schema

> **Task:** Query the system catalog to see every index, which table it
> belongs to, and which columns it covers.

```sql
SELECT
    t.name        AS table_name,
    i.name        AS index_name,
    i.type_desc   AS index_type,
    i.is_unique,
    STRING_AGG(c.name, ', ')
        WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
FROM sys.indexes         i
INNER JOIN sys.tables    t  ON i.object_id = t.object_id
INNER JOIN sys.index_columns ic ON i.object_id  = ic.object_id
                               AND i.index_id   = ic.index_id
INNER JOIN sys.columns   c  ON ic.object_id  = c.object_id
                           AND ic.column_id   = c.column_id
WHERE t.is_ms_shipped = 0
  AND i.name IS NOT NULL
GROUP BY t.name, i.name, i.type_desc, i.is_unique
ORDER BY t.name, i.name;
```

> **Question:** Which table has the most indexes? Compare the output with
> the `@Index` annotations you see in the JPA entity classes
> (e.g. `Apartment.java` has 5 index declarations).

---

## Part 3 — Parameterised Thinking

### Exercise 6 — Write queries as prepared statements

> **Task:** Rewrite these queries replacing hardcoded values with named
> parameters. Explain what the Java/Spring layer would bind.

**Original query:**

```sql
SELECT m.content, m.created_at, u.first_name
FROM messages m
INNER JOIN users u ON m.sender_id = u.id
WHERE m.conversation_id = 1
  AND m.created_at >= '2026-01-01'
ORDER BY m.created_at DESC;
```

**Parameterised version:**

```sql
-- Parameters: @conversationId (BIGINT), @since (DATETIME2)
SELECT m.content, m.created_at, u.first_name
FROM messages m
INNER JOIN users u ON m.sender_id = u.id
WHERE m.conversation_id = @conversationId
  AND m.created_at >= @since
ORDER BY m.created_at DESC;
```

> **In Spring/JPA this becomes:**
> ```java
> @Query("SELECT m FROM Message m JOIN m.sender u " +
>        "WHERE m.conversation.id = :convId " +
>        "AND m.createdAt >= :since ORDER BY m.createdAt DESC")
> List<Message> findRecentInConversation(
>     @Param("convId") Long convId,
>     @Param("since") Instant since);
> ```
>
> **Best practice:** Never concatenate user input into SQL strings.
> Parameterised queries prevent SQL injection and allow the query optimizer
> to cache execution plans.

---

### Exercise 7 — Apartment search with dynamic filters

> **Task:** Write a query that could back a "search apartments" API where
> the user can optionally filter by city, max rent, and furnished status.

```sql
-- Parameters: @city (NVARCHAR), @maxRent (DECIMAL), @furnished (BIT)
-- Each parameter is NULL if not provided by the user
SELECT id, title, city, district, monthly_rent, furnished
FROM apartments
WHERE (@city     IS NULL OR city         = @city)
  AND (@maxRent  IS NULL OR monthly_rent <= @maxRent)
  AND (@furnished IS NULL OR furnished   = @furnished)
  AND status = 'AVAILABLE'
ORDER BY monthly_rent ASC;
```

> **Why this pattern?** The `@param IS NULL OR column = @param` idiom
> makes each filter optional. If the caller doesn't provide a city filter,
> `@city IS NULL` evaluates to TRUE and the condition is skipped.
>
> **Trade-off:** This "catch-all" query can produce sub-optimal plans on
> SQL Server. For high-traffic APIs, consider `OPTION (RECOMPILE)` or
> building the query dynamically with Spring Data `Specification`.

---

## Part 4 — Subqueries & Common Table Expressions

### Exercise 8 — Apartments by message activity (CTE)

> **Task:** Find apartments that have had more than 3 messages across all
> their conversations, ranked by total message count.

**Step 1 — subquery approach:**

```sql
SELECT
    a.id,
    a.title,
    a.city,
    msg_counts.total_messages
FROM apartments a
INNER JOIN (
    SELECT c.apartment_id, COUNT(m.id) AS total_messages
    FROM conversations c
    INNER JOIN messages m ON c.id = m.conversation_id
    GROUP BY c.apartment_id
    HAVING COUNT(m.id) > 3
) msg_counts ON a.id = msg_counts.apartment_id
ORDER BY msg_counts.total_messages DESC;
```

**Step 2 — rewrite as a CTE (Common Table Expression):**

```sql
WITH MessageCounts AS (
    SELECT
        c.apartment_id,
        COUNT(m.id) AS total_messages
    FROM conversations c
    INNER JOIN messages m ON c.id = m.conversation_id
    GROUP BY c.apartment_id
    HAVING COUNT(m.id) > 3
)
SELECT
    a.id,
    a.title,
    a.city,
    mc.total_messages
FROM apartments a
INNER JOIN MessageCounts mc ON a.id = mc.apartment_id
ORDER BY mc.total_messages DESC;
```

> **CTE vs subquery:** CTEs (`WITH ... AS`) make complex queries more readable
> by naming intermediate result sets. The query optimizer usually treats them
> identically, but CTEs are easier to debug step by step.

---

## Best Practices Summary

| Practice | Why | Exercise |
|----------|-----|----------|
| **Use appropriate data types** | Prevents silent data truncation; helps the optimiser | 3, 7 |
| **Avoid `SELECT *`** | Reduces network I/O; makes intent explicit; avoids breaking changes when columns are added | All exercises |
| **Use indexed columns in `WHERE` / `JOIN`** | Enables index seeks instead of full table scans | 4, 5 |
| **Parameterise queries** | Prevents SQL injection; enables plan caching | 6, 7 |
| **Normalise and enforce constraints at DB level** | Last line of defence for data integrity | 1, 2, 3 |
| **Use CTEs for complex logic** | Improves readability; easier to test incrementally | 8 |

---

## Quick Reference

| SQL concept | Exercise(s) |
|-------------|------------|
| System catalog (`sys.foreign_keys`, `sys.indexes`) | 1, 5 |
| UNIQUE constraints | 2 |
| CHECK constraints / DDL proposals | 3 |
| Execution plans / index usage | 4 |
| Parameterised queries | 6, 7 |
| Optional filters (`IS NULL OR`) | 7 |
| Subqueries | 8 |
| CTEs (`WITH ... AS`) | 8 |

---

## Next Steps

- **MSSQL features showcase:** [`SQL_MSSQL_FEATURES_SHOWCASE.md`](SQL_MSSQL_FEATURES_SHOWCASE.md)
  — `TRY_CONVERT`, `OFFSET-FETCH`, views, and SQL Server–specific functions
- **Exam-style SQL questions:** [`SQL_EXAM_QUESTIONS.md`](SQL_EXAM_QUESTIONS.md)
  — practice assessment questions on the SichrPlace schema
- **Back to tutorium labs:** [`TUTORIUM_LAB_WORKPLACE.md`](TUTORIUM_LAB_WORKPLACE.md)
