# Migration Plan — V007__user_email_verification

> **Legacy Notice (2026-02-20):** Final migration implementation is authoritative.
> See `db/migrations/V007__email_verification_tokens.sql`,
> `model/EmailVerificationToken.java`, and `repository/EmailVerificationTokenRepository.java`.
> This plan document is legacy and may be removed after final verification.

> **Feature:** Email Verification
> **Phase:** Phase 1
> **Author:** Omer Kale
> **Date:** 2026-02-20

---

## 1. Changes Summary

Adds three columns to the existing `users` table to support email verification:
`email_verified` (BIT, default 0), `verification_token` (NVARCHAR(512), nullable),
and `verification_token_expires_at` (DATETIME2, nullable).  Also adds a filtered
index on `verification_token` for fast lookups.

---

## 2. Tables Touched

| Table | Action | Details |
|-------|--------|---------|
| `users` | ALTER | Add email_verified, verification_token, verification_token_expires_at columns + filtered index |

---

## 3. DDL Changes

```sql
-- V007: Add email verification fields to users table
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.users') AND name = 'email_verified'
)
BEGIN
    ALTER TABLE dbo.users
        ADD email_verified        BIT           NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.users') AND name = 'verification_token'
)
BEGIN
    ALTER TABLE dbo.users
        ADD verification_token    NVARCHAR(512) NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.users') AND name = 'verification_token_expires_at'
)
BEGIN
    ALTER TABLE dbo.users
        ADD verification_token_expires_at DATETIME2 NULL;
END;
GO

-- Index for token lookup
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_users_verification_token')
BEGIN
    CREATE INDEX IX_users_verification_token
        ON dbo.users (verification_token)
        WHERE verification_token IS NOT NULL;
END;
GO
```

**File:** `db/migrations/V007__user_email_verification.sql`
**Mirror:** `src/main/resources/db/migrations/V007__user_email_verification.sql`

---

## 4. Data Migration / Backfilling

1. Set email_verified = 1 for all existing seed users (they are pre-verified).
2. No verification_token needed for existing users.

---

## 5. Rollback Plan

1. DROP INDEX IX_users_verification_token ON dbo.users;
2. ALTER TABLE dbo.users DROP COLUMN verification_token_expires_at;
3. ALTER TABLE dbo.users DROP COLUMN verification_token;
4. ALTER TABLE dbo.users DROP COLUMN email_verified;

---

## 6. Verification Steps

After running the migration, verify:

1. `SELECT email_verified, verification_token FROM dbo.users WHERE username = 'alice';` — should show 1, NULL
2. `SELECT name FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.users') AND name = 'IX_users_verification_token';`
3. INSERT a test row with email_verified = 0, verification_token = 'test-token' — confirm index is used.

---

## 7. Seed Data

```sql
-- Backfill: mark all existing seed users as verified
UPDATE dbo.users SET email_verified = 1 WHERE email_verified = 0;
```

---

## 8. Dependencies

- Requires `V001__initial_schema.sql` to have run first.
- Requires `V002__seed_data.sql` to have run first.
