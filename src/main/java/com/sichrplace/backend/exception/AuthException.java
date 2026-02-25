package com.sichrplace.backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Structured auth-domain exception carrying a machine-readable {@link #errorCode}
 * and the intended HTTP status.  Caught by {@code GlobalExceptionHandler}.
 *
 * <h3>Error codes</h3>
 * <table>
 *   <tr><td>EMAIL_TAKEN</td>        <td>409</td><td>Email already registered</td></tr>
 *   <tr><td>PASSWORD_WEAK</td>      <td>400</td><td>Password fails strength rules</td></tr>
 *   <tr><td>VALIDATION_FAILED</td>  <td>400</td><td>Generic field validation failure</td></tr>
 *   <tr><td>EMAIL_NOT_VERIFIED</td> <td>403</td><td>Login attempted with unverified email</td></tr>
 *   <tr><td>ACCOUNT_LOCKED</td>     <td>423</td><td>Too many failed login attempts</td></tr>
 *   <tr><td>ACCOUNT_DEACTIVATED</td><td>403</td><td>Account disabled by admin</td></tr>
 *   <tr><td>INVALID_CREDENTIALS</td><td>401</td><td>Wrong email or password</td></tr>
 *   <tr><td>TOKEN_EXPIRED</td>      <td>410</td><td>Reset / verification token expired</td></tr>
 *   <tr><td>TOKEN_ALREADY_USED</td> <td>400</td><td>Token consumed previously</td></tr>
 *   <tr><td>INVALID_TOKEN</td>      <td>400</td><td>Token not found</td></tr>
 *   <tr><td>ADMIN_SELF_REGISTER</td><td>403</td><td>Self-registration as ADMIN blocked</td></tr>
 * </table>
 */
@Getter
public class AuthException extends RuntimeException {

    private final String errorCode;
    private final HttpStatus httpStatus;

    public AuthException(String errorCode, HttpStatus httpStatus, String message) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
    }

    // ── Convenience factories ──────────────────────────────────────

    public static AuthException emailTaken(String email) {
        return new AuthException("EMAIL_TAKEN", HttpStatus.CONFLICT,
                "Email is already registered: " + email);
    }

    public static AuthException passwordWeak() {
        return new AuthException("PASSWORD_WEAK", HttpStatus.BAD_REQUEST,
                "Password must be at least 8 characters and contain at least "
                        + "one uppercase letter, one lowercase letter, one digit, "
                        + "and one special character (@$!%*?&#)");
    }

    public static AuthException emailNotVerified() {
        return new AuthException("EMAIL_NOT_VERIFIED", HttpStatus.FORBIDDEN,
                "Email address has not been verified. Please check your inbox.");
    }

    public static AuthException accountLocked() {
        return new AuthException("ACCOUNT_LOCKED", HttpStatus.LOCKED,
                "Account is temporarily locked due to too many failed login attempts. "
                        + "Please try again later.");
    }

    public static AuthException accountDeactivated() {
        return new AuthException("ACCOUNT_DEACTIVATED", HttpStatus.FORBIDDEN,
                "Account has been deactivated. Please contact support.");
    }

    public static AuthException invalidCredentials() {
        return new AuthException("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED,
                "Invalid email or password");
    }

    public static AuthException tokenExpired() {
        return new AuthException("TOKEN_EXPIRED", HttpStatus.GONE,
                "Token has expired. Please request a new one.");
    }

    public static AuthException tokenAlreadyUsed() {
        return new AuthException("TOKEN_ALREADY_USED", HttpStatus.BAD_REQUEST,
                "Token has already been used.");
    }

    public static AuthException invalidToken() {
        return new AuthException("INVALID_TOKEN", HttpStatus.BAD_REQUEST,
                "Invalid or unrecognised token.");
    }

    public static AuthException adminSelfRegister() {
        return new AuthException("ADMIN_SELF_REGISTER", HttpStatus.FORBIDDEN,
                "Cannot self-register as ADMIN");
    }
}
