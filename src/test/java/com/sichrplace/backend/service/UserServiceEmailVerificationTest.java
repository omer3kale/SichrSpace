package com.sichrplace.backend.service;

import com.sichrplace.backend.exception.AuthException;
import com.sichrplace.backend.model.EmailVerificationToken;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.EmailVerificationTokenRepository;
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
 * Unit tests for the email verification flow in {@link UserServiceImpl}.
 *
 * <p>Tests cover:
 * <ul>
 *   <li>verifyEmail — valid token verifies the user's email</li>
 *   <li>verifyEmail — expired token is rejected</li>
 *   <li>verifyEmail — already-used token is rejected</li>
 *   <li>verifyEmail — invalid token is rejected</li>
 *   <li>resendVerificationEmail — known unverified email re-issues token</li>
 *   <li>resendVerificationEmail — unknown email returns success silently</li>
 *   <li>resendVerificationEmail — already verified email returns success silently</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserService — Email Verification")
class UserServiceEmailVerificationTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private EmailVerificationTokenRepository emailVerificationTokenRepository;
    @Mock private EmailService emailService;
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
                .emailVerified(false)
                .isActive(true)
                .build();
    }

    // ─── verifyEmail ────────────────────────────────────────────────

    @Nested
    @DisplayName("verifyEmail")
    class VerifyEmailTests {

        @Test
        @DisplayName("valid token → marks user email as verified")
        void validToken_verifiesEmail() {
            EmailVerificationToken evt = EmailVerificationToken.builder()
                    .id(10L)
                    .user(testUser)
                    .tokenHash("abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890")
                    .expiresAt(Instant.now().plus(12, ChronoUnit.HOURS))
                    .createdAt(Instant.now().minus(12, ChronoUnit.HOURS))
                    .usedAt(null)
                    .build();

            when(emailVerificationTokenRepository.findByTokenHash(anyString()))
                    .thenReturn(Optional.of(evt));
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(emailVerificationTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Map<String, String> result = userService.verifyEmail("someBase64Token");

            assertEquals("Email verified successfully.", result.get("message"));
            assertTrue(testUser.getEmailVerified(), "User should be marked as email-verified");

            // Verify token marked as used
            ArgumentCaptor<EmailVerificationToken> captor =
                    ArgumentCaptor.forClass(EmailVerificationToken.class);
            verify(emailVerificationTokenRepository).save(captor.capture());
            assertNotNull(captor.getValue().getUsedAt(), "Token should be marked used");
        }

        @Test
        @DisplayName("expired token → throws AuthException with TOKEN_EXPIRED")
        void expiredToken_throws() {
            EmailVerificationToken evt = EmailVerificationToken.builder()
                    .id(11L)
                    .user(testUser)
                    .tokenHash("expiredhash_abcdef1234567890abcdef1234567890abcdef12345678901")
                    .expiresAt(Instant.now().minus(1, ChronoUnit.HOURS))
                    .createdAt(Instant.now().minus(25, ChronoUnit.HOURS))
                    .usedAt(null)
                    .build();

            when(emailVerificationTokenRepository.findByTokenHash(anyString()))
                    .thenReturn(Optional.of(evt));

            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.verifyEmail("expiredToken"));
            assertEquals("TOKEN_EXPIRED", ex.getErrorCode());
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("used token → throws AuthException with TOKEN_ALREADY_USED")
        void usedToken_throws() {
            EmailVerificationToken evt = EmailVerificationToken.builder()
                    .id(12L)
                    .user(testUser)
                    .tokenHash("usedhash___abcdef1234567890abcdef1234567890abcdef12345678901")
                    .expiresAt(Instant.now().plus(12, ChronoUnit.HOURS))
                    .createdAt(Instant.now().minus(6, ChronoUnit.HOURS))
                    .usedAt(Instant.now().minus(1, ChronoUnit.HOURS))
                    .build();

            when(emailVerificationTokenRepository.findByTokenHash(anyString()))
                    .thenReturn(Optional.of(evt));

            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.verifyEmail("usedToken"));
            assertEquals("TOKEN_ALREADY_USED", ex.getErrorCode());
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("invalid (non-existent) token → throws AuthException with INVALID_TOKEN")
        void invalidToken_throws() {
            when(emailVerificationTokenRepository.findByTokenHash(anyString()))
                    .thenReturn(Optional.empty());

            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.verifyEmail("bogusToken"));
            assertEquals("INVALID_TOKEN", ex.getErrorCode());
            verify(userRepository, never()).save(any());
        }
    }

    // ─── resendVerificationEmail ────────────────────────────────────

    @Nested
    @DisplayName("resendVerificationEmail")
    class ResendTests {

        @Test
        @DisplayName("known unverified email → re-issues verification token")
        void knownUnverifiedEmail_reissues() {
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(testUser));
            when(emailVerificationTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Map<String, String> result = userService.resendVerificationEmail("alice@example.com");

            assertNotNull(result);
            assertTrue(result.get("message").contains("link has been sent"));
            verify(emailVerificationTokenRepository).save(any());
            verify(emailService).sendEmail(eq("alice@example.com"), anyString(), anyString());
        }

        @Test
        @DisplayName("unknown email → returns success silently (anti-enumeration)")
        void unknownEmail_silentSuccess() {
            when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

            Map<String, String> result = userService.resendVerificationEmail("unknown@example.com");

            assertNotNull(result);
            assertTrue(result.get("message").contains("link has been sent"));
            verify(emailVerificationTokenRepository, never()).save(any());
            verify(emailService, never()).sendEmail(anyString(), anyString(), anyString());
        }

        @Test
        @DisplayName("already verified email → returns success silently")
        void alreadyVerified_silentSuccess() {
            testUser.setEmailVerified(true);
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(testUser));

            Map<String, String> result = userService.resendVerificationEmail("alice@example.com");

            assertNotNull(result);
            assertTrue(result.get("message").contains("link has been sent"));
            verify(emailVerificationTokenRepository, never()).save(any());
            verify(emailService, never()).sendEmail(anyString(), anyString(), anyString());
        }
    }
}
