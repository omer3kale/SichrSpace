package com.sichrplace.backend.controller;

import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit-level tests for {@link HealthController#dbReadiness()} via MockMvc.
 *
 * <p>Security filters are disabled ({@code addFilters = false}) because the
 * health endpoint is public and these tests focus on response shape, not auth.
 *
 * <p>The {@link JdbcTemplate} is mocked to drive both the UP (success) and
 * DOWN (exception) paths without requiring a live database.
 */
@WebMvcTest(HealthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
@DisplayName("HealthController — /api/health/db-readiness")
class HealthControllerDbReadinessTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    // ─────────────────────────────────────────────────────────────────────────
    // Happy path — DB responds normally
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("UP path — database is reachable")
    class DbUp {

        @Test
        @DisplayName("Returns 200 with db=UP when both probes succeed")
        void returns200_whenProbesSucceed() throws Exception {
            when(jdbcTemplate.queryForObject(eq("SELECT 1"), eq(Integer.class))).thenReturn(1);
            when(jdbcTemplate.queryForObject(eq("SELECT COUNT(*) FROM dbo.users"), eq(Integer.class))).thenReturn(5);

            mockMvc.perform(get("/api/health/db-readiness"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("UP"))
                    .andExpect(jsonPath("$.db").value("UP"))
                    .andExpect(jsonPath("$.probe").value(1))
                    .andExpect(jsonPath("$.usersCount").value(5))
                    .andExpect(jsonPath("$.application").isNotEmpty())
                    .andExpect(jsonPath("$.timestamp").isNotEmpty());
        }

        @Test
        @DisplayName("Returns 200 with usersCount=0 when table is empty")
        void returns200_whenTableEmpty() throws Exception {
            when(jdbcTemplate.queryForObject(eq("SELECT 1"), eq(Integer.class))).thenReturn(1);
            when(jdbcTemplate.queryForObject(eq("SELECT COUNT(*) FROM dbo.users"), eq(Integer.class))).thenReturn(0);

            mockMvc.perform(get("/api/health/db-readiness"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.db").value("UP"))
                    .andExpect(jsonPath("$.usersCount").value(0));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Down path — DB throws DataAccessException
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("DOWN path — database is unreachable or fails")
    class DbDown {

        @Test
        @DisplayName("Returns 503 with db=DOWN when SELECT 1 throws CannotGetJdbcConnectionException")
        void returns503_whenConnectionFails() throws Exception {
            when(jdbcTemplate.queryForObject(eq("SELECT 1"), eq(Integer.class)))
                    .thenThrow(new CannotGetJdbcConnectionException("Connection refused by DB"));

            mockMvc.perform(get("/api/health/db-readiness"))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.status").value("DOWN"))
                    .andExpect(jsonPath("$.db").value("DOWN"))
                    .andExpect(jsonPath("$.error").isNotEmpty())
                    .andExpect(jsonPath("$.application").isNotEmpty())
                    .andExpect(jsonPath("$.timestamp").isNotEmpty());
        }

        @Test
        @DisplayName("Returns 503 with db=DOWN when usersCount query throws")
        void returns503_whenUsersCountFails() throws Exception {
            when(jdbcTemplate.queryForObject(eq("SELECT 1"), eq(Integer.class))).thenReturn(1);
            when(jdbcTemplate.queryForObject(eq("SELECT COUNT(*) FROM dbo.users"), eq(Integer.class)))
                    .thenThrow(new CannotGetJdbcConnectionException("Lost connection during count query"));

            mockMvc.perform(get("/api/health/db-readiness"))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.status").value("DOWN"))
                    .andExpect(jsonPath("$.db").value("DOWN"))
                    .andExpect(jsonPath("$.error").isNotEmpty());
        }
    }
}
