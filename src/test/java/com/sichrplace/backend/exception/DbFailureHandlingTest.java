package com.sichrplace.backend.exception;

import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DeadlockLoserDataAccessException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.transaction.CannotCreateTransactionException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * DB Failure Handling — unit tests for {@link GlobalExceptionHandler} DB-specific exception handlers.
 *
 * <p>Failure type → expected HTTP status → expected errorCode:
 * <ul>
 *   <li>DataIntegrityViolationException (email unique)   → 409 → USER_EMAIL_ALREADY_EXISTS</li>
 *   <li>DataIntegrityViolationException (username unique) → 409 → USER_USERNAME_ALREADY_EXISTS</li>
 *   <li>DataIntegrityViolationException (FK)              → 409 → DB_FK_VIOLATION</li>
 *   <li>DataIntegrityViolationException (generic)         → 409 → DB_CONSTRAINT_VIOLATION</li>
 *   <li>DeadlockLoserDataAccessException                  → 503 → DB_DEADLOCK</li>
 *   <li>CannotAcquireLockException                        → 503 → DB_DEADLOCK</li>
 *   <li>QueryTimeoutException                             → 503 → DB_TIMEOUT</li>
 *   <li>TransientDataAccessException                      → 503 → DB_TRANSIENT_FAILURE</li>
 *   <li>CannotGetJdbcConnectionException                  → 503 → DB_CONNECTION_UNAVAILABLE</li>
 *   <li>CannotCreateTransactionException                  → 503 → DB_CONNECTION_UNAVAILABLE</li>
 * </ul>
 *
 * <p>Retry policy:
 * <ul>
 *   <li>DB_DEADLOCK / DB_TIMEOUT / DB_TRANSIENT_FAILURE: client may retry idempotent reads once.</li>
 *   <li>DB_CONSTRAINT_VIOLATION / FK_VIOLATION: never retried — caller must fix the request.</li>
 *   <li>DB_CONNECTION_UNAVAILABLE: retry only after health check passes.</li>
 * </ul>
 */
@DisplayName("GlobalExceptionHandler — DB Failure Handling")
class DbFailureHandlingTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    private HttpServletRequest req(String path) {
        HttpServletRequest r = mock(HttpServletRequest.class);
        when(r.getRequestURI()).thenReturn(path);
        return r;
    }

    // ─────────────────────────────────────────────────────────────────
    // Constraint / uniqueness / FK violations
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("DataIntegrityViolation — constraint mapping")
    class ConstraintViolations {

        @Test
        @DisplayName("duplicate email → 409 USER_EMAIL_ALREADY_EXISTS")
        void duplicateEmail_returns409_emailErrorCode() {
            DataIntegrityViolationException ex =
                    new DataIntegrityViolationException("could not execute statement",
                            new RuntimeException("Violation of UNIQUE KEY constraint 'UQ_users_email'"));

            ResponseEntity<ApiErrorResponse> resp = handler.handleDataIntegrity(ex, req("/api/auth/register"));

            assertEquals(HttpStatus.CONFLICT, resp.getStatusCode());
            assertNotNull(resp.getBody());
            assertEquals("USER_EMAIL_ALREADY_EXISTS", resp.getBody().getErrorCode());
            assertEquals("Conflict", resp.getBody().getError());
        }

        @Test
        @DisplayName("duplicate username → 409 USER_USERNAME_ALREADY_EXISTS")
        void duplicateUsername_returns409_usernameErrorCode() {
            DataIntegrityViolationException ex =
                    new DataIntegrityViolationException("could not execute statement",
                            new RuntimeException("Violation of UNIQUE KEY constraint 'UX_users_username_not_null'"));

            ResponseEntity<ApiErrorResponse> resp = handler.handleDataIntegrity(ex, req("/api/users/1"));

            assertEquals(HttpStatus.CONFLICT, resp.getStatusCode());
            assertEquals("USER_USERNAME_ALREADY_EXISTS", resp.getBody().getErrorCode());
        }

        @Test
        @DisplayName("FK violation → 409 DB_FK_VIOLATION")
        void fkViolation_returns409_fkErrorCode() {
            DataIntegrityViolationException ex =
                    new DataIntegrityViolationException("could not execute statement",
                            new RuntimeException("The INSERT statement conflicted with the FOREIGN KEY constraint 'FK_viewing_requests_apartment'"));

            ResponseEntity<ApiErrorResponse> resp = handler.handleDataIntegrity(ex, req("/api/viewing-requests"));

            assertEquals(HttpStatus.CONFLICT, resp.getStatusCode());
            assertEquals("DB_FK_VIOLATION", resp.getBody().getErrorCode());
        }

        @Test
        @DisplayName("generic constraint violation → 409 DB_CONSTRAINT_VIOLATION")
        void genericConstraint_returns409_genericErrorCode() {
            DataIntegrityViolationException ex =
                    new DataIntegrityViolationException("constraint violation",
                            new RuntimeException("CHECK constraint 'CK_apartments_status' violated"));

            ResponseEntity<ApiErrorResponse> resp = handler.handleDataIntegrity(ex, req("/api/apartments"));

            assertEquals(HttpStatus.CONFLICT, resp.getStatusCode());
            assertEquals("DB_CONSTRAINT_VIOLATION", resp.getBody().getErrorCode());
        }

        @Test
        @DisplayName("every constraint 409 response has path and timestamp")
        void constraintViolation_hasPathAndTimestamp() {
            DataIntegrityViolationException ex =
                    new DataIntegrityViolationException("dup", new RuntimeException("unique"));

            ResponseEntity<ApiErrorResponse> resp = handler.handleDataIntegrity(ex, req("/api/test"));

            assertNotNull(resp.getBody().getPath());
            assertNotNull(resp.getBody().getTimestamp());
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Deadlock
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Deadlock — 503 DB_DEADLOCK")
    class DeadlockFailures {

        @Test
        @DisplayName("DeadlockLoserDataAccessException → 503 DB_DEADLOCK")
        void deadlockLoser_returns503() {
            DeadlockLoserDataAccessException ex =
                    new DeadlockLoserDataAccessException("Transaction was deadlocked", null);

            ResponseEntity<ApiErrorResponse> resp = handler.handleDeadlock(ex, req("/api/apartments/1"));

            assertEquals(HttpStatus.SERVICE_UNAVAILABLE, resp.getStatusCode());
            assertNotNull(resp.getBody());
            assertEquals("DB_DEADLOCK", resp.getBody().getErrorCode());
        }

        @Test
        @DisplayName("CannotAcquireLockException → 503 DB_DEADLOCK")
        void cannotAcquireLock_returns503() {
            CannotAcquireLockException ex =
                    new CannotAcquireLockException("Lock wait timeout exceeded");

            ResponseEntity<ApiErrorResponse> resp = handler.handleDeadlock(ex, req("/api/viewing-requests"));

            assertEquals(HttpStatus.SERVICE_UNAVAILABLE, resp.getStatusCode());
            assertEquals("DB_DEADLOCK", resp.getBody().getErrorCode());
        }

        @Test
        @DisplayName("deadlock response message contains retry hint")
        void deadlockResponse_containsRetryHint() {
            DeadlockLoserDataAccessException ex =
                    new DeadlockLoserDataAccessException("deadlock", null);

            ResponseEntity<ApiErrorResponse> resp = handler.handleDeadlock(ex, req("/api/test"));

            assertTrue(resp.getBody().getMessage().toLowerCase().contains("retry"),
                    "DB_DEADLOCK message should mention retry");
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Query timeout
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Query timeout — 503 DB_TIMEOUT")
    class QueryTimeouts {

        @Test
        @DisplayName("QueryTimeoutException → 503 DB_TIMEOUT")
        void queryTimeout_returns503() {
            QueryTimeoutException ex = new QueryTimeoutException("Query execu­tion timed out after 30000ms");

            ResponseEntity<ApiErrorResponse> resp = handler.handleQueryTimeout(ex, req("/api/apartments"));

            assertEquals(HttpStatus.SERVICE_UNAVAILABLE, resp.getStatusCode());
            assertEquals("DB_TIMEOUT", resp.getBody().getErrorCode());
        }

        @Test
        @DisplayName("timeout response has stable error field")
        void queryTimeout_hasStableErrorField() {
            QueryTimeoutException ex = new QueryTimeoutException("timeout");

            ResponseEntity<ApiErrorResponse> resp = handler.handleQueryTimeout(ex, req("/api/test"));

            assertEquals("Service Unavailable", resp.getBody().getError());
            assertNotNull(resp.getBody().getTimestamp());
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Transient access failures
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Transient access failures — 503 DB_TRANSIENT_FAILURE")
    class TransientFailures {

        @Test
        @DisplayName("TransientDataAccessException subclass → 503 DB_TRANSIENT_FAILURE")
        void transientAccess_returns503() {
            TransientDataAccessException ex = new QueryTimeoutException("transient failure");

            ResponseEntity<ApiErrorResponse> resp = handler.handleTransientDataAccess(ex, req("/api/listings"));

            assertEquals(HttpStatus.SERVICE_UNAVAILABLE, resp.getStatusCode());
            assertEquals("DB_TRANSIENT_FAILURE", resp.getBody().getErrorCode());
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Connectivity failures
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Connection failures — 503 DB_CONNECTION_UNAVAILABLE")
    class ConnectionFailures {

        @Test
        @DisplayName("CannotGetJdbcConnectionException → 503 DB_CONNECTION_UNAVAILABLE")
        void jdbcConnectionFailed_returns503() {
            CannotGetJdbcConnectionException ex =
                    new CannotGetJdbcConnectionException("Unable to acquire JDBC Connection");

            ResponseEntity<ApiErrorResponse> resp = handler.handleDbConnectionFailure(ex, req("/api/health/db-readiness"));

            assertEquals(HttpStatus.SERVICE_UNAVAILABLE, resp.getStatusCode());
            assertEquals("DB_CONNECTION_UNAVAILABLE", resp.getBody().getErrorCode());
        }

        @Test
        @DisplayName("CannotCreateTransactionException → 503 DB_CONNECTION_UNAVAILABLE")
        void cannotCreateTransaction_returns503() {
            CannotCreateTransactionException ex =
                    new CannotCreateTransactionException("Could not open JPA EntityManager for transaction");

            ResponseEntity<ApiErrorResponse> resp = handler.handleDbConnectionFailure(ex, req("/api/auth/login"));

            assertEquals(HttpStatus.SERVICE_UNAVAILABLE, resp.getStatusCode());
            assertEquals("DB_CONNECTION_UNAVAILABLE", resp.getBody().getErrorCode());
        }

        @Test
        @DisplayName("connection failure response has path field")
        void connectionFailure_hasPath() {
            CannotGetJdbcConnectionException ex =
                    new CannotGetJdbcConnectionException("connection refused");

            ResponseEntity<ApiErrorResponse> resp = handler.handleDbConnectionFailure(ex, req("/api/users"));

            assertEquals("/api/users", resp.getBody().getPath());
        }
    }
}
