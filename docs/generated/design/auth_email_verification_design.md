# Design Doc — Email Verification

> **Legacy Notice (2026-02-20):** Implementation is now authoritative.
> See `UserController`, `UserServiceImpl`, `EmailVerificationToken`,
> `UserServiceEmailVerificationTest`, and `UserControllerEmailVerificationTest`.
> This design document is retained as historical context and may be removed after final verification.

> **Feature ID:** `auth_email_verification`
> **Phase:** Phase 1
> **Date:** 2026-02-20

---

## 1. Class Overview

| Layer | Class | Package |
|-------|-------|---------|
| Controller | `UserController` | `com.sichrplace.backend.controller` |
| Service (interface) | `UserService` | `com.sichrplace.backend.service` |
| Service (impl) | `UserServiceImpl` | `com.sichrplace.backend.service` |
| Repository | `UserRepository` | `com.sichrplace.backend.repository` |
| DTO | `VerifyEmailResponseDto` | `com.sichrplace.backend.dto` |

---

## 2. Responsibilities

### Controller — `UserController`
- Base path: `/api/auth`
- Translates HTTP requests into service calls.
- Returns appropriate HTTP status codes (200 OK, 400 Bad Request, 410 Gone, 429 Too Many Requests).
- Applies `@PreAuthorize` for role-based access (resend requires authentication).
- Swagger/OpenAPI annotations (`@Tag`, `@Operation`).

### Service — `UserService` / `UserServiceImpl`
- Business logic and validation.
- Token generation (UUID), expiry check (24 h), single-use enforcement.
- Calls `EmailService` to send the verification email.
- Transactional boundaries (`@Transactional`).
- Throws domain-specific exceptions for controller-level error mapping.

### Repository — `UserRepository`
- Extends `JpaRepository<User, Long>`.
- New query method: `Optional<User> findByVerificationToken(String token)`.

---

## 3. Public Endpoints

| # | Method | Path | Summary | Roles |
|---|--------|------|---------|-------|
| 1 | GET | `/api/auth/verify-email/{token}` | Verify email address via token URL | — (public) |
| 2 | POST | `/api/auth/resend-verification` | Resend verification email | Bearer (authenticated, unverified users) |

---

## 4. Method-Level Notes

### GET `/api/auth/verify-email/{token}` — Verify email address via token URL

**Response:** `VerifyEmailResponseDto`

**Notes:** Token is a UUID stored on the user row. Single-use, expires after 24 h.

**Status codes:** 200 OK, 400 Bad Request (invalid), 410 Gone (expired)

---

### POST `/api/auth/resend-verification` — Resend verification email

**Response:** `{ message: string }`

**Notes:** Rate-limited to 1 per minute. Generates a new token, invalidates old.

**Status codes:** 200 OK, 429 Too Many Requests

---

## 5. Security & Roles

| Role | Allowed Actions |
|------|----------------|
| Anonymous | Verify email via GET token link |
| Authenticated (unverified) | Resend verification email |
| ADMIN | — |

---

## 6. Dependencies (Other Services / External APIs)

- `EmailService` — Send verification email with token link
- `UserRepository` — Find user by verification token, update emailVerified flag

---

## 7. Error Handling

| Scenario | Exception | HTTP Status |
|----------|-----------|-------------|
| Token not found in DB | `ResourceNotFoundException` | 400 Bad Request |
| Token expired (>24 h) | `TokenExpiredException` | 410 Gone |
| User already verified | — | 200 OK (idempotent, no error) |
| Resend too soon (<1 min) | `RateLimitException` | 429 Too Many Requests |

---

## 8. Lombok & Annotations Checklist

- [x] `@RestController`, `@RequestMapping("/api/auth")` — already exists
- [x] `@RequiredArgsConstructor`, `@Slf4j` — already exists
- [x] `@Tag(name = "UserController")` (Swagger) — already exists
- [ ] `@Transactional` on `verifyEmail()` and `resendVerification()` service methods
- [ ] `@Transactional(readOnly = true)` — not applicable (both write)
- [ ] `@PreAuthorize("isAuthenticated()")` on resend-verification controller method
- [ ] Entity `User.java`: add `emailVerified` (Boolean), `verificationToken` (String), `verificationTokenExpiresAt` (Instant)

---

## 9. Implementation Sketch

### UserController additions

```java
@GetMapping("/verify-email/{token}")
@Operation(summary = "Verify email address via token")
public ResponseEntity<VerifyEmailResponseDto> verifyEmail(
        @PathVariable String token) {
    VerifyEmailResponseDto result = userService.verifyEmail(token);
    return ResponseEntity.ok(result);
}

@PostMapping("/resend-verification")
@PreAuthorize("isAuthenticated()")
@Operation(summary = "Resend verification email")
public ResponseEntity<Map<String, String>> resendVerification(
        @AuthenticationPrincipal UserDetails userDetails) {
    userService.resendVerificationEmail(userDetails.getUsername());
    return ResponseEntity.ok(Map.of("message", "Verification email sent."));
}
```

### UserServiceImpl additions

```java
@Transactional
public VerifyEmailResponseDto verifyEmail(String token) {
    User user = userRepository.findByVerificationToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Invalid verification token."));

    if (user.getVerificationTokenExpiresAt().isBefore(Instant.now())) {
        throw new TokenExpiredException("Verification token has expired.");
    }

    user.setEmailVerified(true);
    user.setVerificationToken(null);
    user.setVerificationTokenExpiresAt(null);
    userRepository.save(user);

    return new VerifyEmailResponseDto(true, "Email verified successfully.");
}

@Transactional
public void resendVerificationEmail(String username) {
    User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found."));

    if (Boolean.TRUE.equals(user.getEmailVerified())) {
        throw new IllegalStateException("Email already verified.");
    }

    // Rate limit: check last token creation time
    if (user.getVerificationTokenExpiresAt() != null &&
        user.getVerificationTokenExpiresAt().minus(23, ChronoUnit.HOURS)
            .isAfter(Instant.now().minus(1, ChronoUnit.MINUTES))) {
        throw new RateLimitException("Please wait before requesting another email.");
    }

    String newToken = UUID.randomUUID().toString();
    user.setVerificationToken(newToken);
    user.setVerificationTokenExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
    userRepository.save(user);

    emailService.sendVerificationEmail(user.getEmail(), newToken);
}
```

### UserRepository addition

```java
Optional<User> findByVerificationToken(String verificationToken);
```
