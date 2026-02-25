package com.sichrplace.backend.controller;

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
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
@DisplayName("UserController — Email Verification Endpoints")
class UserControllerEmailVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private RefreshTokenService refreshTokenService;

    @MockBean
    private UserRepository userRepository;

    @Test
    @DisplayName("POST /api/auth/verify-email returns success message")
    void verifyEmail_success() throws Exception {
        when(userService.verifyEmail("valid-token"))
                .thenReturn(Map.of("message", "Email verified successfully."));

        mockMvc.perform(post("/api/auth/verify-email?token=valid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Email verified successfully."));
    }

    @Test
    @DisplayName("POST /api/auth/verify-email returns 400 for invalid token")
    void verifyEmail_invalidToken() throws Exception {
        when(userService.verifyEmail("bad-token"))
                .thenThrow(AuthException.invalidToken());

        mockMvc.perform(post("/api/auth/verify-email?token=bad-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_TOKEN"));
    }

    @Test
    @DisplayName("POST /api/auth/resend-verification returns anti-enumeration success")
    void resendVerification_success() throws Exception {
        when(userService.resendVerificationEmail("alice@example.com"))
                .thenReturn(Map.of("message", "If the email exists and is unverified, a new link has been sent."));

        mockMvc.perform(post("/api/auth/resend-verification?email=alice@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("If the email exists and is unverified, a new link has been sent."));
    }
}
