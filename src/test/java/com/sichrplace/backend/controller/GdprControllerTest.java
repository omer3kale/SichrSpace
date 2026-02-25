package com.sichrplace.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.ConsentRequest;
import com.sichrplace.backend.dto.GdprExportResponse;
import com.sichrplace.backend.model.GdprConsentLog;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.GdprService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * {@link WebMvcTest} slices for {@link GdprController}.
 *
 * <p>Security filters are disabled ({@code addFilters = false}).
 * Endpoints that call {@code authenticatedUserId()} need a {@code Long} principal
 * in the {@link SecurityContextHolder} — set directly in {@link BeforeEach}.
 * Verifies HTTP responses for all 5 GDPR endpoints.
 */
@WebMvcTest(GdprController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
@DisplayName("GdprController")
class GdprControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private GdprService gdprService;
    @MockBean private JwtTokenProvider jwtTokenProvider; // required by JwtAuthenticationFilter @Component

    private static final Long USER_ID = 99L;

    @BeforeEach
    void setUpSecurityContext() {
        // GdprController.authenticatedUserId() reads SecurityContextHolder directly.
        // With addFilters=false the filter chain doesn't populate it, so we do it manually.
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        TestingAuthenticationToken auth =
                new TestingAuthenticationToken(USER_ID, null, "ROLE_USER");
        auth.setAuthenticated(true);
        ctx.setAuthentication(auth);
        SecurityContextHolder.setContext(ctx);
    }

    @AfterEach
    void cleanUpSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    // ── POST /api/gdpr/me/export ─────────────────────────────────────────

    @Test
    @DisplayName("POST /api/gdpr/me/export returns 202 Accepted with jobId")
    void queueExport_returns202() throws Exception {
        GdprExportResponse response = GdprExportResponse.builder()
                .jobId(7L).userId(USER_ID).status("QUEUED").build();
        when(gdprService.queueExport(USER_ID)).thenReturn(response);

        mockMvc.perform(post("/api/gdpr/me/export"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId").value(7));
    }

    // ── GET /api/gdpr/me/export/{jobId}/status ────────────────────────────

    @Test
    @DisplayName("GET /api/gdpr/me/export/{jobId}/status returns 200 with status field")
    void getExportStatus_returns200() throws Exception {
        GdprExportResponse response = GdprExportResponse.builder()
                .jobId(7L).userId(USER_ID).status("QUEUED").build();
        // service arg order: (jobId, userId)
        when(gdprService.getExportStatus(7L, USER_ID)).thenReturn(response);

        mockMvc.perform(get("/api/gdpr/me/export/7/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("QUEUED"));
    }

    // ── DELETE /api/gdpr/me ───────────────────────────────────────────────

    @Test
    @DisplayName("DELETE /api/gdpr/me returns 200 OK with message")
    void deletionRequest_returns200() throws Exception {
        mockMvc.perform(delete("/api/gdpr/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }

    // ── POST /api/gdpr/consent ────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/gdpr/consent returns 204 No Content")
    void logConsent_returns204() throws Exception {
        ConsentRequest req = new ConsentRequest();
        req.setConsentType("marketing");
        req.setGranted(true);

        mockMvc.perform(post("/api/gdpr/consent")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("POST /api/gdpr/consent when unauthenticated sets null userId (optionalAuthenticatedUserId returns null)")
    void logConsent_anonymous_returnsNoContent() throws Exception {
        // Clear context → optionalAuthenticatedUserId(): auth == null → return null
        SecurityContextHolder.clearContext();
        ConsentRequest req = new ConsentRequest();
        req.setConsentType("analytics");
        req.setGranted(false);

        mockMvc.perform(post("/api/gdpr/consent")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("POST /api/gdpr/consent with X-Forwarded-For header uses XFF IP for hash (remoteAddr xff branch)")
    void logConsent_withXff_returnsNoContent() throws Exception {
        ConsentRequest req = new ConsentRequest();
        req.setConsentType("functional");
        req.setGranted(true);

        mockMvc.perform(post("/api/gdpr/consent")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Forwarded-For", "203.0.113.1, 198.51.100.5")
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNoContent());
    }

    // ── GET /api/gdpr/consent-history ─────────────────────────────────────

    @Test
    @DisplayName("GET /api/gdpr/consent-history returns 200 with a list")
    void consentHistory_returns200() throws Exception {
        GdprConsentLog entry = new GdprConsentLog();
        entry.setUserId(USER_ID);
        entry.setConsentType("MARKETING");
        entry.setGranted(false);
        entry.setRecordedAt(Instant.now());

        when(gdprService.getConsentHistory(USER_ID)).thenReturn(List.of(entry));

        mockMvc.perform(get("/api/gdpr/consent-history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].consentType").value("MARKETING"));
    }
}
