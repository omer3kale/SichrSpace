package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.UserAuthDto;
import com.sichrplace.backend.dto.UserDto;
import com.sichrplace.backend.exception.AuthException;
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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * FTL Sprint-1 hardening tests (FTL-01 through FTL-04).
 *
 * <p>Covers:
 * <ul>
 *   <li>FTL-01: Renter registration — password strength edge cases</li>
 *   <li>FTL-02: Landlord registration — happy path, cross-role rejection</li>
 *   <li>FTL-03: Password-reset token error codes (covered in existing test; no new unit needed)</li>
 *   <li>FTL-04: Locale preference on profile update</li>
 *   <li>Email-not-verified login gate</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("FTL Sprint-1 — Auth Hardening")
class AuthFtlHardeningTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private EmailVerificationTokenRepository emailVerificationTokenRepository;
    @Mock private EmailService emailService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private RefreshTokenService refreshTokenService;

    @InjectMocks private UserServiceImpl userService;

    // ─── FTL-01: Password Strength Variations ───────────────────────

    @Nested
    @DisplayName("FTL-01 — Password strength")
    class PasswordStrengthTests {

        @BeforeEach
        void emailAvailable() {
            lenient().when(userRepository.existsByEmail(anyString())).thenReturn(false);
        }

        @ParameterizedTest(name = "rejected: \"{0}\"")
        @ValueSource(strings = {
                "nouppercase1!",  // missing uppercase
                "NOLOWERCASE1!",  // missing lowercase
                "NoDigitHere!",   // missing digit
                "NoSpecial1abc",  // missing special char
                "Ab1!",           // too short
                "",               // empty
                "1234567890"      // only digits
        })
        @DisplayName("weak passwords → PASSWORD_WEAK")
        void weakPasswords_rejected(String weakPassword) {
            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.register(
                            "u@example.com", weakPassword, "A", "B", User.UserRole.TENANT));
            assertEquals("PASSWORD_WEAK", ex.getErrorCode());
        }

        @ParameterizedTest(name = "accepted: \"{0}\"")
        @ValueSource(strings = {
                "StrongP@ss1",
                "MyP@55word",
                "A1b!cccc",        // exactly at 8 boundary
                "Complex#1xY"
        })
        @DisplayName("strong passwords → registration proceeds")
        void strongPasswords_accepted(String strongPassword) {
            when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$enc");
            when(userRepository.save(any())).thenAnswer(inv -> {
                User u = inv.getArgument(0);
                u.setId(99L);
                return u;
            });
            when(emailVerificationTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(jwtTokenProvider.generateAccessToken(any())).thenReturn("jwt");
            when(refreshTokenService.createToken(any(), any())).thenReturn("rt");
            when(jwtTokenProvider.getAccessTokenExpirationMs()).thenReturn(86400000L);

            UserAuthDto result = userService.register(
                    "u@example.com", strongPassword, "A", "B", User.UserRole.TENANT);

            assertNotNull(result);
            assertEquals("u@example.com", result.getEmail());
        }
    }

    // ─── FTL-02: Landlord Registration ──────────────────────────────

    @Nested
    @DisplayName("FTL-02 — Landlord registration")
    class LandlordRegistrationTests {

        @Test
        @DisplayName("LANDLORD role registration succeeds")
        void landlordRegistration_happyPath() {
            when(userRepository.existsByEmail("landlord@example.com")).thenReturn(false);
            when(passwordEncoder.encode("StrongP@ss1")).thenReturn("$2a$10$enc");
            when(userRepository.save(any())).thenAnswer(inv -> {
                User u = inv.getArgument(0);
                u.setId(10L);
                return u;
            });
            when(emailVerificationTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(jwtTokenProvider.generateAccessToken(any())).thenReturn("jwt");
            when(refreshTokenService.createToken(any(), any())).thenReturn("rt");
            when(jwtTokenProvider.getAccessTokenExpirationMs()).thenReturn(86400000L);

            UserAuthDto result = userService.register(
                    "landlord@example.com", "StrongP@ss1", "Lord", "Land", User.UserRole.LANDLORD);

            assertNotNull(result);
            assertEquals("landlord@example.com", result.getEmail());
        }

        @Test
        @DisplayName("ADMIN self-register is blocked regardless of password strength")
        void adminRegistration_alwaysBlocked() {
            // email check must never be reached
            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.register(
                            "admin@evil.com", "StrongP@ss1", "A", "B", User.UserRole.ADMIN));

            assertEquals("ADMIN_SELF_REGISTER", ex.getErrorCode());
            verify(userRepository, never()).existsByEmail(anyString());
        }
    }

    // ─── Email-Not-Verified Login Gate ──────────────────────────────

    @Nested
    @DisplayName("EMAIL_NOT_VERIFIED login gate")
    class EmailNotVerifiedTests {

        private User unverifiedUser;

        @BeforeEach
        void setUp() {
            unverifiedUser = User.builder()
                    .id(50L)
                    .email("unverified@example.com")
                    .password("$2a$10$hashed")
                    .role(User.UserRole.TENANT)
                    .isActive(true)
                    .emailVerified(false)
                    .failedLoginAttempts(0)
                    .build();
        }

        @Test
        @DisplayName("correct password + unverified email → EMAIL_NOT_VERIFIED 403")
        void unverifiedEmail_rejected() {
            when(userRepository.findByEmail("unverified@example.com")).thenReturn(Optional.of(unverifiedUser));
            when(passwordEncoder.matches("correct", "$2a$10$hashed")).thenReturn(true);

            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.login("unverified@example.com", "correct"));

            assertEquals("EMAIL_NOT_VERIFIED", ex.getErrorCode());
            assertEquals(403, ex.getHttpStatus().value());
        }

        @Test
        @DisplayName("wrong password + unverified email → INVALID_CREDENTIALS (password checked first)")
        void unverifiedEmail_wrongPassword_credentialsError() {
            when(userRepository.findByEmail("unverified@example.com")).thenReturn(Optional.of(unverifiedUser));
            when(passwordEncoder.matches("wrong", "$2a$10$hashed")).thenReturn(false);
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.login("unverified@example.com", "wrong"));

            assertEquals("INVALID_CREDENTIALS", ex.getErrorCode());
        }
    }

    // ─── FTL-04: Locale Preference ──────────────────────────────────

    @Nested
    @DisplayName("FTL-04 — Locale preference")
    class LocalePreferenceTests {

        private User userWithLocale;

        @BeforeEach
        void setUp() {
            userWithLocale = User.builder()
                    .id(1L)
                    .email("locale@example.com")
                    .password("$2a$10$hashed")
                    .firstName("Loc")
                    .lastName("User")
                    .role(User.UserRole.TENANT)
                    .isActive(true)
                    .emailVerified(true)
                    .build();
        }

        @Test
        @DisplayName("setting preferredLocale persists on profile update")
        void setLocale_persists() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(userWithLocale));
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            UserDto update = new UserDto();
            update.setPreferredLocale("de");

            UserDto result = userService.updateUser(1L, update);

            assertEquals("de", result.getPreferredLocale());
            assertEquals("Loc", result.getFirstName()); // other fields not cleared
        }

        @Test
        @DisplayName("locale update does not affect other profile fields")
        void localeUpdate_doesNotTouchOtherFields() {
            userWithLocale.setBio("My original bio");
            userWithLocale.setCity("Berlin");
            when(userRepository.findById(1L)).thenReturn(Optional.of(userWithLocale));
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            UserDto update = new UserDto();
            update.setPreferredLocale("tr");

            UserDto result = userService.updateUser(1L, update);

            assertEquals("tr", result.getPreferredLocale());
            assertEquals("My original bio", result.getBio());
            assertEquals("Berlin", result.getCity());
        }

        @Test
        @DisplayName("locale returned in getUserById")
        void localeReturnedInGet() {
            userWithLocale.setPreferredLocale("en");
            when(userRepository.findById(1L)).thenReturn(Optional.of(userWithLocale));

            UserDto dto = userService.getUserById(1L);

            assertEquals("en", dto.getPreferredLocale());
        }

        @Test
        @DisplayName("invalid locale (not en/de/tr) throws IllegalArgumentException")
        void invalidLocale_throws() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(userWithLocale));

            UserDto update = new UserDto();
            update.setPreferredLocale("fr");

            assertThrows(IllegalArgumentException.class,
                    () -> userService.updateUser(1L, update));
        }

        @Test
        @DisplayName("locale is normalised to lowercase")
        void localeNormalisedToLowercase() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(userWithLocale));
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            UserDto update = new UserDto();
            update.setPreferredLocale("DE");

            UserDto result = userService.updateUser(1L, update);

            assertEquals("de", result.getPreferredLocale());
        }
    }
}
