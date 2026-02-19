# Feature Spec — Email Verification

> **Feature ID:** `auth_email_verification`
> **Phase:** Phase 1
> **Priority:** P0 — Critical Path
> **Estimated effort:** 4–6 hours
> **Author:** Omer Kale
> **Date:** 2026-02-20

---

## 1. Legacy Behavior (Node.js / Express)

### Route files
- `routes/auth.js`

### Service files
- `services/emailService.js`

### Endpoint summary (old backend)

| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/api/auth/verify-email/:token` | Verify email address via signed JWT token | IMPLEMENTED |

### How it worked
After registration the old backend sends a verification email containing a
signed JWT as a URL parameter.  The GET endpoint decodes the token, marks
the user as verified in Supabase (`email_verified = true`), and redirects
to the login page.  If the token is invalid or expired, an error page is
shown.  The email is sent via Gmail SMTP through the `emailService`.

---

## 2. New Spring Boot Behavior

### Controllers
- `UserController.java`

### Services
- `UserService.java / UserServiceImpl.java`
- `EmailService.java / EmailServiceImpl.java`

### Entities / Models
- `User.java (add emailVerified, verificationToken fields)`

### Database tables
- `users (ALTER — add email_verified BIT, verification_token NVARCHAR)`

---

## 3. API Surface (Spring Boot Endpoints)

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 1 | GET | `/api/auth/verify-email/{token}` | — | Verify email address via token |
| 2 | POST | `/api/auth/resend-verification` | Bearer | Resend verification email |

---

## 4. Persistence & Schema

### New columns (ALTER)

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

### Migration script
- **ID:** `V007__user_email_verification`
- **File:** `db/migrations/V007__user_email_verification.sql`

### Relationships
No new relationships — column additions to existing `users` table.
The `verification_token` is a UUID string, not a FK.

---

## 5. Security Considerations

- **Single-use tokens:** Set `verification_token` to NULL after successful
  verification.  Prevents replay attacks.
- **Token expiry:** `verification_token_expires_at` must be checked.  Default
  TTL = 24 hours.  Expired tokens → 410 Gone.
- **Rate limiting:** The resend endpoint must be rate-limited (1 per minute per
  user) to prevent email flooding.
- **No PII in URL:** The token is an opaque UUID, not a JWT containing user data.
- **Login gate:** After this feature, `POST /api/auth/login` should return 403 if
  `email_verified = false`, with a message prompting the user to verify.

---

## 6. Edge Cases & Error Handling

- Token already used → 400 Bad Request with message 'Token is invalid or has already been used.'
- Token expired (>24 h) → 410 Gone with message 'Verification token has expired. Please request a new one.'
- User already verified → 200 OK (idempotent, return { verified: true }).
- Non-existent token → 400 Bad Request.
- Resend before 1 minute elapsed → 429 Too Many Requests.
- Resend for already-verified user → 400 Bad Request with 'Email already verified.'

---

## 7. Acceptance Criteria

- [ ] POST /api/auth/register sends a verification email with a unique UUID token.
- [ ] GET /api/auth/verify-email/{token} marks the user as email_verified = true.
- [ ] POST /api/auth/login returns 403 if email_verified = false.
- [ ] Expired tokens (>24 h) are rejected with 410 Gone.
- [ ] Already-used tokens are rejected with 400.
- [ ] POST /api/auth/resend-verification generates a new token and sends a new email.
- [ ] Resend is rate-limited to 1 request per minute per user.
- [ ] DataSeeder creates users with email_verified = true (existing seed data unaffected).

---

## 8. Testing Strategy

| Layer | Tool | What to test |
|-------|------|-------------|
| Unit | JUnit 5 + Mockito | Service logic — token generation, expiry check, idempotent verify, rate limit |
| Integration | @SpringBootTest + H2 | Full flow — register → check email_verified=false → verify → login succeeds |
| API | MockMvc | Endpoint contracts — 200/400/410/429 status codes, response bodies |
| Smoke | MssqlProfileSmokeTest | Verify email_verified column exists and is queryable |

---

## 9. Dependencies

- spring-boot-starter-mail (Jakarta Mail)
- FreeMarker or Thymeleaf for email body rendering

---

## 10. Open Questions

- Use FreeMarker or Thymeleaf for email body templates?  FreeMarker is already in the project for this roadmap system.
- Should verification redirect to a frontend URL or return JSON?  JSON is more API-friendly; frontend can handle the redirect.
