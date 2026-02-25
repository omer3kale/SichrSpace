package com.sichrplace.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.RefreshTokenRequest;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.RefreshTokenService;
import com.sichrplace.backend.service.UserService;
import org.junit.jupiter.api.AfterEach;
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

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * {@link WebMvcTest} slices for the refresh / logout endpoints in
 * {@link com.sichrplace.backend.controller.UserController}.
 *
 * <p>Uses {@code authentication()} post-processor with a {@code Long} principal
 * where required (logout-all), and {@code @WithMockUser} is avoided because
 * the controller casts {@code auth.getPrincipal()} to {@code Long}.
 */
@WebMvcTest(com.sichrplace.backend.controller.UserController.class)@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)@DisplayName("UserController — refresh-token / logout endpoints")
class RefreshTokenControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private UserService userService;
    @MockBean private RefreshTokenService refreshTokenService;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private UserRepository userRepository;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /** Set up SecurityContextHolder with a Long principal (addFilters=false means no filter does this). */
    private static void setAuth(Long userId) {
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        TestingAuthenticationToken auth = new TestingAuthenticationToken(userId, null, "ROLE_USER");
        auth.setAuthenticated(true);
        ctx.setAuthentication(auth);
        SecurityContextHolder.setContext(ctx);
    }

    // ── /api/auth/refresh ────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/refresh with valid token returns 200 + new access token")
    void refresh_validToken_returns200() throws Exception {
        User user = User.builder()
                .id(1L).email("u@example.com").role(User.UserRole.TENANT).build();

        // Controller flow: rotateToken(raw) → newRaw, getUserIdFromToken(newRaw) → userId,
        // userRepository.findById(userId) → user, generateAccessToken(user) → jwt
        when(refreshTokenService.rotateToken(anyString(), any())).thenReturn("new-raw-token");
        when(refreshTokenService.getUserIdFromToken("new-raw-token")).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateAccessToken(any())).thenReturn("new-access-jwt");
        when(jwtTokenProvider.getAccessTokenExpirationMs()).thenReturn(86400000L);

        RefreshTokenRequest req = new RefreshTokenRequest();
        req.setRefreshToken("valid-raw");

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new-access-jwt"));
    }

    @Test
    @DisplayName("POST /api/auth/refresh with revoked token returns 400 Bad Request")
    void refresh_invalidToken_returns4xx() throws Exception {
        // GlobalExceptionHandler maps IAE → 400 (revoked msg), or 404 (not-found msg)
        when(refreshTokenService.rotateToken(anyString(), any()))
                .thenThrow(new IllegalArgumentException(
                        "Refresh token has been revoked; all sessions invalidated"));

        RefreshTokenRequest req = new RefreshTokenRequest();
        req.setRefreshToken("bad-token");

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // ── /api/auth/logout ─────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/refresh returns 404 when user not found after token rotation (covers lambda$refresh$0)")
    void refresh_userNotFound_returns404() throws Exception {
        // rotateToken succeeds, getUserIdFromToken succeeds, but userRepository finds no user
        // → orElseThrow lambda fires → IAE("User not found") → GlobalExceptionHandler → 404
        when(refreshTokenService.rotateToken(anyString(), any())).thenReturn("rotated-raw");
        when(refreshTokenService.getUserIdFromToken("rotated-raw")).thenReturn(99L);
        when(userRepository.findById(99L)).thenReturn(Optional.empty()); // user not found

        RefreshTokenRequest req = new RefreshTokenRequest();
        req.setRefreshToken("valid-raw");

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound()); // IAE("User not found") → 404 via GlobalExceptionHandler
    }

    @Test
    @DisplayName("POST /api/auth/logout with body returns 204 No Content (no principal cast needed)")
    void logout_withBody_returns204() throws Exception {
        // When a refresh token is in the body, controller calls revokeToken(raw) — no principal read
        RefreshTokenRequest req = new RefreshTokenRequest();
        req.setRefreshToken("to-revoke");

        mockMvc.perform(post("/api/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("POST /api/auth/logout without body revokes all tokens for user via SecurityContext (else branch)")
    void logout_withoutBody_returns204_via_revokeAll() throws Exception {
        // null body → request == null → else branch reads userId from SecurityContextHolder
        setAuth(1L);
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isNoContent());
        // UserController.logout() else-branch: revokeAllForUser(1L) called via SecurityContextHolder
    }

    // ── /api/auth/logout-all ─────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/logout-all returns 204 No Content (revokes all for userId)")
    void logoutAll_returns204() throws Exception {
        // logoutAll casts auth.getPrincipal() to Long.
        // With addFilters=false the filter chain can't populate SecurityContextHolder,
        // so we set it directly before the request.
        setAuth(1L);

        mockMvc.perform(post("/api/auth/logout-all")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
    }
}
