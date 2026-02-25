package com.sichrplace.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.exception.AuthException;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.RefreshTokenService;
import com.sichrplace.backend.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
@DisplayName("UserController — Password Reset Endpoints")
class UserControllerPasswordResetTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

        @MockBean
        private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private RefreshTokenService refreshTokenService;

    @MockBean
    private UserRepository userRepository;

    @Test
    @DisplayName("POST /api/auth/forgot-password with valid email returns 200")
    void forgotPassword_validEmail_returns200() throws Exception {
        when(userService.forgotPassword("alice@example.com"))
                .thenReturn(Map.of("message", "If the email exists, a reset link has been sent.", "token", "dev-token"));

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "alice@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("If the email exists, a reset link has been sent."))
                .andExpect(jsonPath("$.token").value("dev-token"));

        verify(userService).forgotPassword("alice@example.com");
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password with unknown email still returns 200")
    void forgotPassword_unknownEmail_returns200() throws Exception {
        when(userService.forgotPassword("unknown@example.com"))
                .thenReturn(Map.of("message", "If the email exists, a reset link has been sent."));

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "unknown@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("If the email exists, a reset link has been sent."));

        verify(userService).forgotPassword("unknown@example.com");
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password with invalid email returns 400")
    void forgotPassword_invalidEmail_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "bad-email"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"));
    }

    @Test
    @DisplayName("POST /api/auth/reset-password with valid payload returns 200")
    void resetPassword_validPayload_returns200() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token", "valid-token",
                                "newPassword", "NewPass123"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password has been reset successfully."));

        verify(userService).resetPassword("valid-token", "NewPass123");
    }

    @Test
    @DisplayName("POST /api/auth/reset-password with short password returns 400")
    void resetPassword_shortPassword_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token", "valid-token",
                                "newPassword", "short"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"));
    }

    @Test
    @DisplayName("POST /api/auth/reset-password with blank token returns 400")
    void resetPassword_blankToken_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token", "",
                                "newPassword", "NewPass123"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"));
    }

    @Test
    @DisplayName("POST /api/auth/reset-password with invalid or expired token returns 400")
    void resetPassword_invalidOrExpiredToken_returns400() throws Exception {
        doThrow(AuthException.invalidToken())
                .when(userService).resetPassword(anyString(), anyString());

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token", "expired-token",
                                "newPassword", "NewPass123"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_TOKEN"));
    }
}
