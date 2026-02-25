package com.sichrplace.backend.service;

import com.sichrplace.backend.exception.AuthException;
import com.sichrplace.backend.model.PasswordResetToken;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.PasswordResetTokenRepository;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the password-reset flow in {@link UserServiceImpl}.
 *
 * <p>Tests cover:
 * <ul>
 *   <li>forgotPassword — known email generates token + invalidates old ones</li>
 *   <li>forgotPassword — unknown email returns success silently (anti-enumeration)</li>
 *   <li>resetPassword — valid token resets password + marks token used</li>
 *   <li>resetPassword — expired token is rejected</li>
 *   <li>resetPassword — already-used token is rejected</li>
 *   <li>resetPassword — invalid token is rejected</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserService — Password Reset")
class UserServicePasswordResetTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;

    @InjectMocks private UserServiceImpl userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("alice@example.com")
                .password("$2a$10$hashed")
                .firstName("Alice")
                .lastName("Tester")
                .role(User.UserRole.TENANT)
                .isActive(true)
                .build();
    }

    // ─── forgotPassword ─────────────────────────────────────────────

    @Nested
    @DisplayName("forgotPassword")
    class ForgotPasswordTests {

        @Test
        @DisplayName("known email → generates token, invalidates old tokens, returns success + token")
        void knownEmail_generatesToken() {
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(testUser));
            when(passwordResetTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Map<String, String> result = userService.forgotPassword("alice@example.com");

            assertNotNull(result);
            assertEquals("If the email exists, a reset link has been sent.", result.get("message"));
            assertNotNull(result.get("token"), "Token should be present (dev mode)");
            assertTrue(result.get("token").length() > 20, "Token should be a Base64url string");

            // Verify old tokens invalidated
            verify(passwordResetTokenRepository).invalidateAllForUser(eq(1L), any(Instant.class));

            // Verify new token saved with SHA-256 hash
            ArgumentCaptor<PasswordResetToken> captor = ArgumentCaptor.forClass(PasswordResetToken.class);
            verify(passwordResetTokenRepository).save(captor.capture());
            PasswordResetToken saved = captor.getValue();
            assertEquals(testUser, saved.getUser());
            assertEquals(64, saved.getTokenHash().length(), "SHA-256 hex hash should be 64 chars");
            assertNotNull(saved.getExpiresAt());
            assertTrue(saved.getExpiresAt().isAfter(Instant.now()), "Expiry should be in the future");
        }

        @Test
        @DisplayName("unknown email → returns success silently (anti-enumeration)")
        void unknownEmail_silentSuccess() {
            when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

            Map<String, String> result = userService.forgotPassword("unknown@example.com");

            assertNotNull(result);
            assertEquals("If the email exists, a reset link has been sent.", result.get("message"));
            assertFalse(result.containsKey("token"), "No token for unknown email");

            // Verify no token operations
            verify(passwordResetTokenRepository, never()).invalidateAllForUser(anyLong(), any());
            verify(passwordResetTokenRepository, never()).save(any());
        }
    }

    // ─── resetPassword ──────────────────────────────────────────────

    @Nested
    @DisplayName("resetPassword")
    class ResetPasswordTests {

        @Test
        @DisplayName("valid token → resets password + marks token used")
        void validToken_resetsPassword() {
            PasswordResetToken prt = PasswordResetToken.builder()
                    .id(10L)
                    .user(testUser)
                    .tokenHash("abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890")
                    .expiresAt(Instant.now().plus(30, ChronoUnit.MINUTES))
                    .createdAt(Instant.now().minus(30, ChronoUnit.MINUTES))
                    .usedAt(null)
                    .build();

            when(passwordResetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(prt));
            when(passwordEncoder.encode("NewP@ss1234")).thenReturn("$2a$10$newHash");
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(passwordResetTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            assertDoesNotThrow(() -> userService.resetPassword("someBase64Token", "NewP@ss1234"));

            // Verify password updated
            verify(passwordEncoder).encode("NewP@ss1234");
            verify(userRepository).save(testUser);
            assertEquals("$2a$10$newHash", testUser.getPassword());

            // Verify token marked as used
            ArgumentCaptor<PasswordResetToken> captor = ArgumentCaptor.forClass(PasswordResetToken.class);
            verify(passwordResetTokenRepository).save(captor.capture());
            assertNotNull(captor.getValue().getUsedAt(), "Token should be marked used");
        }

        @Test
        @DisplayName("expired token → throws AuthException with TOKEN_EXPIRED")
        void expiredToken_throws() {
            PasswordResetToken prt = PasswordResetToken.builder()
                    .id(11L)
                    .user(testUser)
                    .tokenHash("expiredhash_abcdef1234567890abcdef1234567890abcdef12345678901")
                    .expiresAt(Instant.now().minus(10, ChronoUnit.MINUTES))  // expired
                    .createdAt(Instant.now().minus(2, ChronoUnit.HOURS))
                    .usedAt(null)
                    .build();

            when(passwordResetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(prt));

            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.resetPassword("expiredToken", "NewP@ss1234"));
            assertEquals("TOKEN_EXPIRED", ex.getErrorCode());

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("used token → throws AuthException with TOKEN_ALREADY_USED")
        void usedToken_throws() {
            PasswordResetToken prt = PasswordResetToken.builder()
                    .id(12L)
                    .user(testUser)
                    .tokenHash("usedhash___abcdef1234567890abcdef1234567890abcdef12345678901")
                    .expiresAt(Instant.now().plus(30, ChronoUnit.MINUTES))
                    .createdAt(Instant.now().minus(20, ChronoUnit.MINUTES))
                    .usedAt(Instant.now().minus(5, ChronoUnit.MINUTES))  // already used
                    .build();

            when(passwordResetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(prt));

            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.resetPassword("usedToken", "NewP@ss1234"));
            assertEquals("TOKEN_ALREADY_USED", ex.getErrorCode());

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("invalid (non-existent) token → throws AuthException with INVALID_TOKEN")
        void invalidToken_throws() {
            when(passwordResetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.resetPassword("bogusToken", "NewP@ss1234"));
            assertEquals("INVALID_TOKEN", ex.getErrorCode());

            verify(userRepository, never()).save(any());
        }
    }
}
