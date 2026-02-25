package com.sichrplace.backend.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("SecurityConfig")
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private SecurityFilterChain securityFilterChain;

    @Autowired
    private CorsConfigurationSource corsConfigurationSource;

    @Test
    @DisplayName("security beans are present and functional")
    void beansArePresent() {
        assertNotNull(passwordEncoder);
        assertNotNull(securityFilterChain);
        assertNotNull(corsConfigurationSource);
        assertTrue(passwordEncoder.matches("secret123", passwordEncoder.encode("secret123")));

        CorsConfiguration cfg = corsConfigurationSource.getCorsConfiguration(new org.springframework.mock.web.MockHttpServletRequest("GET", "/api/health"));
        assertNotNull(cfg);
        assertNotNull(cfg.getAllowedMethods());
        assertTrue(cfg.getAllowedMethods().contains("GET"));
    }

    @Test
    @DisplayName("public endpoints are not blocked by auth entry point")
    void publicEndpointsNotUnauthorized() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login").contentType("application/json").content("{}"))
                .andExpect(result -> assertNotEquals(401, result.getResponse().getStatus()));

        mockMvc.perform(get("/api/apartments/999999"))
                .andExpect(result -> assertNotEquals(401, result.getResponse().getStatus()));
    }

    @Test
    @DisplayName("non-permitted endpoint requires authentication")
    void protectedPathRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/protected/probe"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("admin path requires ADMIN role")
    @WithMockUser(roles = "TENANT")
    void adminPathForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/probe"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("admin path allows ADMIN role through security layer")
    @WithMockUser(roles = "ADMIN")
    void adminPathAllowsAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/probe"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertTrue(status != 401 && status != 403,
                            "Expected admin role to pass security gate, got: " + status);
                });
    }

    // ── CSRF posture (stateless JWT API) ─────────────────────────────────────

    @Test
    @DisplayName("CSRF is disabled — POST to public endpoint without CSRF token is not rejected with 403")
    void csrfDisabled_postWithoutCsrfTokenNotRejected() throws Exception {
        // A stateless JWT API must never require a CSRF token.
        // Sending a POST without a CSRF token confirms csrf().disable() is in effect.
        // MockMvc does NOT inject a CSRF token by default when security is configured
        // without .with(csrf()), so a 403 here would mean CSRF is unexpectedly active.
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(result ->
                        assertNotEquals(403, result.getResponse().getStatus(),
                                "CSRF must be disabled: 403 without CSRF token means CSRF is unexpectedly active"));
    }

    @Test
    @DisplayName("auth API does not emit Set-Cookie header — stateless session policy enforced")
    void authApiEmitsNoSetCookieHeader() throws Exception {
        // Confirms STATELESS posture: no HttpSession and no auth cookie is ever created.
        // If a Set-Cookie header appeared, tokens could be used in CSRF attacks.
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(result ->
                        assertNull(result.getResponse().getHeader("Set-Cookie"),
                                "Auth APIs must not emit Set-Cookie — JWT must live in Authorization header only"));
    }
}
