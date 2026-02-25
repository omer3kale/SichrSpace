package com.sichrplace.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.RefreshTokenService;
import com.sichrplace.backend.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DeadlockLoserDataAccessException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.CannotCreateTransactionException;

import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * DB Failure Handling — controller pipeline tests.
 *
 * <p>Verifies that when the service layer throws DB exceptions, the full HTTP response
 * (status, Content-Type, errorCode, message shape) matches the documented contract.
 */
@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
@DisplayName("DB Failure Handling — Controller Pipeline")
class DbFailureControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private UserService userService;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private RefreshTokenService refreshTokenService;
    @MockBean private UserRepository userRepository;

    private String registerJson(String email) throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "email", email,
                "password", "SecurePass1!",
                "firstName", "Test",
                "lastName", "User",
                "role", "TENANT"
        ));
    }

    // ─────────────────────────────────────────────────────────────────
    // Constraint violations via controller
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Constraint violations")
    class ConstraintViolationsPipeline {

        @Test
        @DisplayName("duplicate email → 409 with USER_EMAIL_ALREADY_EXISTS errorCode")
        void register_duplicateEmail_returns409() throws Exception {
            when(userService.register(anyString(), anyString(), anyString(), anyString(), any(User.UserRole.class)))
                    .thenThrow(new DataIntegrityViolationException("duplicate",
                            new RuntimeException("Violation of UNIQUE KEY constraint 'UQ_users_email'")));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(registerJson("dup@example.com")))
                    .andExpect(status().isConflict())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.status").value(409))
                    .andExpect(jsonPath("$.errorCode").value("USER_EMAIL_ALREADY_EXISTS"))
                    .andExpect(jsonPath("$.error").value("Conflict"))
                    .andExpect(jsonPath("$.path").value("/api/auth/register"))
                    .andExpect(jsonPath("$.timestamp").isNotEmpty());
        }

        @Test
        @DisplayName("FK violation on register → 409 with DB_FK_VIOLATION errorCode")
        void register_fkViolation_returns409() throws Exception {
            when(userService.register(anyString(), anyString(), anyString(), anyString(), any(User.UserRole.class)))
                    .thenThrow(new DataIntegrityViolationException("fk",
                            new RuntimeException("The INSERT statement conflicted with the FOREIGN KEY constraint 'FK_something'")));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(registerJson("fk@example.com")))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.errorCode").value("DB_FK_VIOLATION"));
        }

        @Test
        @DisplayName("generic constraint → 409 with DB_CONSTRAINT_VIOLATION errorCode")
        void register_genericConstraint_returns409() throws Exception {
            when(userService.register(anyString(), anyString(), anyString(), anyString(), any(User.UserRole.class)))
                    .thenThrow(new DataIntegrityViolationException("check constraint violated",
                            new RuntimeException("CHECK constraint violation")));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(registerJson("chk@example.com")))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.errorCode").value("DB_CONSTRAINT_VIOLATION"));
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Deadlock via controller
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Deadlock failures")
    class DeadlockPipeline {

        @Test
        @DisplayName("DeadlockLoserDataAccessException on register → 503 DB_DEADLOCK")
        void register_deadlock_returns503() throws Exception {
            when(userService.register(anyString(), anyString(), anyString(), anyString(), any(User.UserRole.class)))
                    .thenThrow(new DeadlockLoserDataAccessException("Transaction deadlocked on lock", null));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(registerJson("dl@example.com")))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.errorCode").value("DB_DEADLOCK"))
                    .andExpect(jsonPath("$.status").value(503));
        }

        @Test
        @DisplayName("CannotAcquireLockException on register → 503 DB_DEADLOCK")
        void register_lockTimeout_returns503() throws Exception {
            when(userService.register(anyString(), anyString(), anyString(), anyString(), any(User.UserRole.class)))
                    .thenThrow(new CannotAcquireLockException("Lock wait timeout exceeded"));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(registerJson("lock@example.com")))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.errorCode").value("DB_DEADLOCK"));
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Query timeout via controller
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Query timeouts")
    class TimeoutPipeline {

        @Test
        @DisplayName("QueryTimeoutException on register → 503 DB_TIMEOUT")
        void register_queryTimeout_returns503() throws Exception {
            when(userService.register(anyString(), anyString(), anyString(), anyString(), any(User.UserRole.class)))
                    .thenThrow(new QueryTimeoutException("Query timed out after 30000ms"));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(registerJson("timeout@example.com")))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.errorCode").value("DB_TIMEOUT"))
                    .andExpect(jsonPath("$.error").value("Service Unavailable"));
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Connectivity failures via controller
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Connectivity failures")
    class ConnectivityPipeline {

        @Test
        @DisplayName("CannotGetJdbcConnectionException on register → 503 DB_CONNECTION_UNAVAILABLE")
        void register_jdbcConnectionFailed_returns503() throws Exception {
            when(userService.register(anyString(), anyString(), anyString(), anyString(), any(User.UserRole.class)))
                    .thenThrow(new CannotGetJdbcConnectionException("Unable to acquire JDBC Connection"));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(registerJson("conn@example.com")))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.errorCode").value("DB_CONNECTION_UNAVAILABLE"))
                    .andExpect(jsonPath("$.path").value("/api/auth/register"));
        }

        @Test
        @DisplayName("CannotCreateTransactionException on register → 503 DB_CONNECTION_UNAVAILABLE")
        void register_transactionStartFailed_returns503() throws Exception {
            when(userService.register(anyString(), anyString(), anyString(), anyString(), any(User.UserRole.class)))
                    .thenThrow(new CannotCreateTransactionException("Could not open JPA EntityManager"));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(registerJson("tx@example.com")))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.errorCode").value("DB_CONNECTION_UNAVAILABLE"));
        }
    }
}
