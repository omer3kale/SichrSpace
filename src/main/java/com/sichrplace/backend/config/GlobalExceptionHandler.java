package com.sichrplace.backend.config;

import com.sichrplace.backend.dto.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DeadlockLoserDataAccessException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /* ── AuthException — structured auth-domain errors ── */
    @ExceptionHandler(com.sichrplace.backend.exception.AuthException.class)
    public ResponseEntity<ApiErrorResponse> handleAuthException(
            com.sichrplace.backend.exception.AuthException ex, HttpServletRequest request) {
        log.warn("Auth error on {} — code={} msg={}", request.getRequestURI(), ex.getErrorCode(), ex.getMessage());
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(ex.getHttpStatus().value())
                .error(ex.getHttpStatus().getReasonPhrase())
                .errorCode(ex.getErrorCode())
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.status(ex.getHttpStatus()).body(body);
    }

    /* ── Validation (400 with field-level details) ── */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }

        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Validation Failed")
                .message("One or more fields are invalid")
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .fieldErrors(fieldErrors)
                .build();
        return ResponseEntity.badRequest().body(body);
    }

    /* ── Malformed JSON body (400) ── */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleMalformedJson(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        log.warn("Malformed JSON on {} – {}", request.getRequestURI(), ex.getMostSpecificCause().getMessage());
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Bad Request")
                .message("Malformed JSON request body")
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.badRequest().body(body);
    }

    /* ── Missing required query/path parameter (400) ── */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParam(
            MissingServletRequestParameterException ex, HttpServletRequest request) {
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Bad Request")
                .message("Missing required parameter: " + ex.getParameterName())
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.badRequest().body(body);
    }

    /* ── Query/path parameter type mismatch (400) ── */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String expected = ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown";
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Bad Request")
                .message("Parameter '" + ex.getName() + "' must be of type " + expected)
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.badRequest().body(body);
    }

    /* ── Business-rule violations mapped by message content ── */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        String msg = ex.getMessage();

        if (msg != null && (msg.contains("not found") || msg.contains("Not found"))) {
            status = HttpStatus.NOT_FOUND;
        }
        if (msg != null && msg.contains("Invalid email or password")) {
            status = HttpStatus.UNAUTHORIZED;
        }
        if (msg != null && msg.contains("Account is deactivated")) {
            status = HttpStatus.FORBIDDEN;
        }

        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(msg)
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.status(status).body(body);
    }

    /* ── State machine violations (409 Conflict) ── */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalState(
            IllegalStateException ex, HttpServletRequest request) {
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(HttpStatus.CONFLICT.value())
                .error("Conflict")
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    /* ── Ownership / authorization failures (403) ── */
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiErrorResponse> handleSecurityException(
            SecurityException ex, HttpServletRequest request) {
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(HttpStatus.FORBIDDEN.value())
                .error("Forbidden")
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    /* ── Spring Security @PreAuthorize failures (403) ── */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(HttpStatus.FORBIDDEN.value())
                .error("Forbidden")
                .message("You do not have permission to access this resource")
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    /* ── DB: constraint / uniqueness / FK violations (409) ── */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        String root = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        String errorCode = resolveConstraintErrorCode(root);
        log.warn("DB_CONSTRAINT_VIOLATION path={} errorCode={} root={}", request.getRequestURI(), errorCode, root);
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(HttpStatus.CONFLICT.value())
                .error("Conflict")
                .errorCode(errorCode)
                .message("A data constraint was violated")
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    /** Maps constraint violation root-cause message to a stable errorCode. */
    private String resolveConstraintErrorCode(String rootMessage) {
        if (rootMessage == null) return "DB_CONSTRAINT_VIOLATION";
        String m = rootMessage.toLowerCase();
        if (m.contains("uq_users_email") || m.contains("unique") && m.contains("email")) return "USER_EMAIL_ALREADY_EXISTS";
        if (m.contains("ux_users_username_not_null") || m.contains("unique") && m.contains("username")) return "USER_USERNAME_ALREADY_EXISTS";
        if (m.contains("fk_") || m.contains("foreign key") || m.contains("reference")) return "DB_FK_VIOLATION";
        return "DB_CONSTRAINT_VIOLATION";
    }

    /* ── DB: deadlock (503) ── */
    @ExceptionHandler({DeadlockLoserDataAccessException.class, CannotAcquireLockException.class})
    public ResponseEntity<ApiErrorResponse> handleDeadlock(
            Exception ex, HttpServletRequest request) {
        String rootMsg = (ex.getCause() != null) ? ex.getCause().getMessage() : ex.getMessage();
        log.warn("DB_DEADLOCK path={} msg={}", request.getRequestURI(), rootMsg);
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(HttpStatus.SERVICE_UNAVAILABLE.value())
                .error("Service Unavailable")
                .errorCode("DB_DEADLOCK")
                .message("Request could not complete due to a database deadlock. Please retry.")
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    /* ── DB: query timeout (503) ── */
    @ExceptionHandler(QueryTimeoutException.class)
    public ResponseEntity<ApiErrorResponse> handleQueryTimeout(
            QueryTimeoutException ex, HttpServletRequest request) {
        log.warn("DB_TIMEOUT path={} msg={}", request.getRequestURI(), ex.getMessage());
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(HttpStatus.SERVICE_UNAVAILABLE.value())
                .error("Service Unavailable")
                .errorCode("DB_TIMEOUT")
                .message("The database query timed out. Please try again.")
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    /* ── DB: transient access failures (other than deadlock/timeout) (503) ── */
    @ExceptionHandler(TransientDataAccessException.class)
    public ResponseEntity<ApiErrorResponse> handleTransientDataAccess(
            TransientDataAccessException ex, HttpServletRequest request) {
        log.warn("DB_TRANSIENT path={} type={} msg={}", request.getRequestURI(), ex.getClass().getSimpleName(), ex.getMessage());
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(HttpStatus.SERVICE_UNAVAILABLE.value())
                .error("Service Unavailable")
                .errorCode("DB_TRANSIENT_FAILURE")
                .message("A transient database error occurred. Please try again.")
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    /* ── DB: connection unavailable (503) ── */
    @ExceptionHandler({CannotGetJdbcConnectionException.class, CannotCreateTransactionException.class})
    public ResponseEntity<ApiErrorResponse> handleDbConnectionFailure(
            Exception ex, HttpServletRequest request) {
        log.error("DB_CONNECTION_UNAVAILABLE path={} msg={}", request.getRequestURI(), ex.getMessage());
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(HttpStatus.SERVICE_UNAVAILABLE.value())
                .error("Service Unavailable")
                .errorCode("DB_CONNECTION_UNAVAILABLE")
                .message("Database is currently unavailable. Please try again shortly.")
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    /* ── Catch-all (500) ── */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneral(
            Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {} – {}", request.getRequestURI(), ex.getMessage(), ex);
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("Internal Server Error")
                .errorCode("INTERNAL_ERROR")
                .message("An unexpected error occurred")
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
