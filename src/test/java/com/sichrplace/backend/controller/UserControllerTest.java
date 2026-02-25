package com.sichrplace.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.UserAuthDto;
import com.sichrplace.backend.dto.UserDto;
import com.sichrplace.backend.exception.AuthException;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.RefreshTokenService;
import com.sichrplace.backend.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
@DisplayName("UserController")
class UserControllerTest {

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

    private UsernamePasswordAuthenticationToken tenantAuth() {
        return new UsernamePasswordAuthenticationToken(
                11L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_TENANT"))
        );
    }

        @BeforeEach
        void setAuth() {
                SecurityContextHolder.getContext().setAuthentication(tenantAuth());
        }

        @AfterEach
        void clearAuth() {
                SecurityContextHolder.clearContext();
        }

    @Test
    void register_returns201() throws Exception {
        UserAuthDto auth = UserAuthDto.builder().id(1L).email("new@site.com").role("TENANT").accessToken("a").refreshToken("r").build();
        when(userService.register(eq("new@site.com"), eq("Pass12345"), eq("New"), eq("User"), eq(User.UserRole.TENANT))).thenReturn(auth);

        mockMvc.perform(post("/api/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "new@site.com",
                                "password", "Pass12345",
                                "firstName", "New",
                                "lastName", "User",
                                "role", "tenant"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void register_validation400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"));
    }

    @Test
    void login_returns200() throws Exception {
        when(userService.login("u@test.com", "Pass12345"))
                .thenReturn(UserAuthDto.builder().id(2L).email("u@test.com").accessToken("a").refreshToken("r").build());

        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "u@test.com", "password", "Pass12345"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2));
    }

    @Test
    void login_unauthorized401() throws Exception {
        when(userService.login("u@test.com", "wrong"))
                .thenThrow(AuthException.invalidCredentials());

        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "u@test.com", "password", "wrong"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
    }

    @Test
    void getProfile_requiresAuth401() throws Exception {
        when(userService.getUserById(11L)).thenReturn(UserDto.builder().id(11L).email("me@site.com").build());
        mockMvc.perform(get("/api/auth/profile"))
                .andExpect(status().isOk());
    }

    @Test
    void getProfile_success200() throws Exception {
        when(userService.getUserById(11L)).thenReturn(UserDto.builder().id(11L).email("me@site.com").build());

        mockMvc.perform(get("/api/auth/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(11));
    }

    @Test
    void updateProfile_success200() throws Exception {
        when(userService.updateUser(eq(11L), org.mockito.ArgumentMatchers.any(UserDto.class)))
                .thenReturn(UserDto.builder().id(11L).firstName("Updated").build());

        mockMvc.perform(put("/api/auth/profile")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(UserDto.builder().firstName("Updated").build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Updated"));
    }

    @Test
    void updateProfile_forbidden403() throws Exception {
        when(userService.updateUser(eq(11L), org.mockito.ArgumentMatchers.any(UserDto.class)))
                .thenThrow(new SecurityException("Forbidden"));

        mockMvc.perform(put("/api/auth/profile")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void getUserById_notFound404() throws Exception {
        when(userService.getUserById(999L)).thenThrow(new IllegalArgumentException("User not found"));

        mockMvc.perform(get("/api/auth/users/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found"));
    }

        @Test
        void getUserById_success200() throws Exception {
                when(userService.getUserById(15L)).thenReturn(UserDto.builder().id(15L).email("u15@site.com").build());

                mockMvc.perform(get("/api/auth/users/15"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(15));
        }

    @Test
    void forgotPassword_and_reset_verify_resend_paths() throws Exception {
        when(userService.forgotPassword("u@test.com")).thenReturn(Map.of("message", "ok"));
        when(userService.verifyEmail("token-x")).thenReturn(Map.of("message", "verified"));
        when(userService.resendVerificationEmail("u@test.com")).thenReturn(Map.of("message", "resent"));

        mockMvc.perform(post("/api/auth/forgot-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "u@test.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("ok"));

        mockMvc.perform(post("/api/auth/reset-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("token", "abc", "newPassword", "Password88"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password has been reset successfully."));

        mockMvc.perform(post("/api/auth/verify-email").with(csrf()).param("token", "token-x"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("verified"));

        mockMvc.perform(post("/api/auth/resend-verification").with(csrf()).param("email", "u@test.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("resent"));
    }

    @Test
    void resetPassword_invalidToken400_and_validation400() throws Exception {
        doThrow(AuthException.invalidToken())
                .when(userService).resetPassword(anyString(), anyString());

        mockMvc.perform(post("/api/auth/reset-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("token", "bad", "newPassword", "Password88"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_TOKEN"));

        mockMvc.perform(post("/api/auth/reset-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("token", "", "newPassword", "short"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"));
    }
}
