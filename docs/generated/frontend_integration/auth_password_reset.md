# Frontend Integration Spec — Password Reset

> **Legacy Notice (2026-02-20):** Implementation is now authoritative.
> Source of truth is Java code + tests:
> `UserServiceImpl#forgotPassword`, `UserServiceImpl#resetPassword`,
> `UserController#forgotPassword`, `UserController#resetPassword`,
> `UserServicePasswordResetTest`, `UserControllerPasswordResetTest`.
> This document is retained temporarily for transition and will be removed after final verification.

| Meta | Value |
|------|-------|
| **Backend tag** | `v1.2.0-thesis-showcase` |
| **Integration level** | Public (no JWT required) |
| **Generated** | 2025-06-16 |

---

## 1  Domain & UX Intent

**User story**

> As a user who has forgotten my password, I want to request a reset link
> and set a new password so that I can regain access to my account without
> contacting support.

| Aspect | Detail |
|--------|--------|
| **Primary user role** | Any registered user (TENANT, LANDLORD, or ADMIN) |
| **Screen context** | Login page → 'Forgot password?' link → reset form |

---

## 2  Backend Contract

### 1. `POST /api/auth/forgot-password`

| Property | Value |
|----------|-------|
| **Auth required** | No — public endpoint |
| **Rate-limit notes** | Recommend frontend rate-limiting (disable button for 60s after submit) to prevent email flooding |

#### Request fields

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | `String` | Yes | @NotBlank @Email — must be a valid email format |

#### Response fields

| Field | Type | Notes |
|-------|------|-------|
| `message` | `String` | Always returns a success message regardless of whether the email exists (prevents user enumeration) |
| `token` | `String` | Reset token (returned in response for demo/dev — in production, sent via email only) |

#### Error codes

| HTTP Status | Meaning | Suggested UX |
|-------------|---------|--------------|
| `400` | Validation error (blank or invalid email format) | Highlight email field with red border; show inline validation message |

#### Validation hints

- The backend always returns 200 even if the email is not registered — this prevents user enumeration attacks.
- In production, the token should be sent via email, not in the response body. The current implementation returns it for demo convenience.
- The token is a UUID string, valid for a limited time.

### 2. `POST /api/auth/reset-password`

| Property | Value |
|----------|-------|
| **Auth required** | No — public endpoint (token-based auth) |
| **Rate-limit notes** | Recommend disabling submit button after first click to prevent duplicate submissions |

#### Request fields

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `token` | `String` | Yes | @NotBlank — the UUID token received from forgot-password |
| `newPassword` | `String` | Yes | @NotBlank @Size(min=8) — minimum 8 characters |

#### Response fields

| Field | Type | Notes |
|-------|------|-------|
| `message` | `String` | Confirmation message (e.g. 'Password has been reset successfully') |

#### Error codes

| HTTP Status | Meaning | Suggested UX |
|-------------|---------|--------------|
| `400` | Validation error (blank token, password too short) or invalid/expired token | Show specific error message; if token expired, offer link to request a new one |

#### Validation hints

- Password must be at least 8 characters — enforce this client-side before submission.
- If the token is expired or already used, the backend returns 400 — show a 'token expired' message with a link back to forgot-password.
- The new password is hashed with BCrypt server-side; never send the raw password in query parameters.

---

## 3  Frontend Consumption Pattern

> **No framework lock-in** — the patterns below are expressed in plain
> JavaScript (`fetch` / `XMLHttpRequest`). Adapt to your own component
> model (AppleMontiCore, Web Components, etc.) as needed.

### Data-fetch pattern

```js
// Step 1: Request reset
const res1 = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: userEmail })
});
const data1 = await res1.json();
// Show "Check your email" message

// Step 2: Reset password (user clicks link with token)
const res2 = await fetch(`${BASE_URL}/api/auth/reset-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: tokenFromUrl, newPassword: newPwd })
});
if (!res2.ok) { /* handle 400 */ }
const data2 = await res2.json();
// Redirect to login page with success message
```

### State shape (plain object)

```json
{
  "step": "request",
  "email": "",
  "token": "",
  "newPassword": "",
  "confirmPassword": "",
  "isSubmitting": false,
  "successMessage": null,
  "error": null
}
```

### Render hints

- Two-step flow: (1) 'Enter your email' form, (2) 'Enter new password' form.
- After step 1 succeeds, show a confirmation screen ('Check your email for a reset link').
- Step 2 is typically reached via a URL with the token as a query parameter (?token=xxx).
- Add a 'confirm password' field client-side (not sent to backend — just for UX validation).
- Show a password strength indicator (optional but recommended).
- After successful reset, redirect to login with a success banner.

---

## 4  Responsive & Accessibility Notes

### Breakpoints

| Breakpoint | Layout guidance |
|------------|----------------|
| ≤ 480px (mobile) | Full-width form centred vertically; large touch-friendly input fields (min 44px height). |
| 481–768px (tablet) | Form card centred with max-width 400px; generous padding. |
| ≥ 769px (desktop) | Form card centred with max-width 420px; optional split layout with branding on left. |

### Priority content

- Email / password input field is always the primary focus element on page load.
- Error messages appear directly below the relevant input field.
- The submit button is always visible without scrolling.

### Accessibility (a11y)

- Form inputs must have associated `<label>` elements (not just placeholder text).
- Error messages should be linked to inputs via `aria-describedby`.
- The submit button should be disabled and show a spinner while isSubmitting is true.
- Use `role="alert"` for success/error messages so screen readers announce them.
- Password field should have a show/hide toggle with `aria-label="Toggle password visibility"`.

---

## 5  Testing Hooks

### Mock data source

```
Use Swagger UI at /swagger-ui/index.html to call forgot-password
with any seeded user email (e.g. alice@example.com). The response
includes the reset token directly (dev mode). Then call
reset-password with that token and a new password (min 8 chars).
```

### Manual test checklist

- [ ] Submit forgot-password with a valid registered email — verify 200 and message.
- [ ] Submit forgot-password with an unregistered email — verify 200 (no user enumeration).
- [ ] Submit forgot-password with an invalid email format — verify 400 validation error.
- [ ] Submit reset-password with valid token and 8+ character password — verify success.
- [ ] Submit reset-password with a password shorter than 8 characters — verify 400.
- [ ] Submit reset-password with an expired or already-used token — verify 400.
- [ ] After successful reset, login with the new password — verify it works.
- [ ] Resize browser from desktop to mobile — verify form remains usable.
- [ ] Tab through all form fields — verify logical focus order.
