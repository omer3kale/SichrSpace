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
 * Unit tests for registration, login, and profile operations in {@link UserServiceImpl}.
 *
 * <p>Tests cover:
 * <ul>
 *   <li>register — happy path, duplicate email, ADMIN role blocked</li>
 *   <li>login — happy path, wrong password, unknown email, deactivated account</li>
 *   <li>getUserById — found, not found</li>
 *   <li>updateUser — partial update</li>
 *   <li>emailExists — true and false</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserService — Registration, Login & Profile")
class UserServiceRegistrationLoginTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private EmailVerificationTokenRepository emailVerificationTokenRepository;
    @Mock private EmailService emailService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private RefreshTokenService refreshTokenService;

    @InjectMocks private UserServiceImpl userService;

    private User existingUser;

    @BeforeEach
    void setUp() {
        existingUser = User.builder()
                .id(1L)
                .email("alice@example.com")
                .password("$2a$10$hashedPassword")
                .firstName("Alice")
                .lastName("Tester")
                .role(User.UserRole.TENANT)
                .emailVerified(true)
                .isActive(true)
                .createdAt(Instant.now())
                .build();
    }

    // ─── register ───────────────────────────────────────────────────

    @Nested
    @DisplayName("register")
    class RegisterTests {

        @Test
        @DisplayName("valid registration → returns auth DTO with tokens")
        void validRegistration() {
            when(userRepository.existsByEmail("bob@example.com")).thenReturn(false);
            when(passwordEncoder.encode("StrongP@ss1")).thenReturn("$2a$10$encoded");
            when(userRepository.save(any())).thenAnswer(inv -> {
                User u = inv.getArgument(0);
                u.setId(2L);
                return u;
            });
            when(emailVerificationTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(jwtTokenProvider.generateAccessToken(any())).thenReturn("access-jwt");
            when(refreshTokenService.createToken(any(), any())).thenReturn("raw-refresh");
            when(jwtTokenProvider.getAccessTokenExpirationMs()).thenReturn(86400000L);

            UserAuthDto result = userService.register(
                    "bob@example.com", "StrongP@ss1", "Bob", "Builder", User.UserRole.TENANT
            );

            assertNotNull(result);
            assertEquals("bob@example.com", result.getEmail());
            assertEquals("access-jwt", result.getAccessToken());
            assertEquals("raw-refresh", result.getRefreshToken());
            // Verify verification token was issued
            verify(emailVerificationTokenRepository).save(any());
            verify(emailService).sendEmail(eq("bob@example.com"), anyString(), anyString());
        }

        @Test
        @DisplayName("duplicate email → throws AuthException with EMAIL_TAKEN")
        void duplicateEmail_throws() {
            when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);

            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.register(
                            "alice@example.com", "StrongP@ss1", "A", "B", User.UserRole.TENANT
                    ));
            assertEquals("EMAIL_TAKEN", ex.getErrorCode());
        }

        @Test
        @DisplayName("ADMIN role → throws AuthException with ADMIN_SELF_REGISTER")
        void adminRole_throws() {
            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.register(
                            "admin@example.com", "StrongP@ss1", "A", "B", User.UserRole.ADMIN
                    ));
            assertEquals("ADMIN_SELF_REGISTER", ex.getErrorCode());
        }

        @Test
        @DisplayName("weak password → throws AuthException with PASSWORD_WEAK")
        void weakPassword_throws() {
            when(userRepository.existsByEmail("new@example.com")).thenReturn(false);

            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.register(
                            "new@example.com", "nouppercase1!", "A", "B", User.UserRole.TENANT
                    ));
            assertEquals("PASSWORD_WEAK", ex.getErrorCode());
        }
    }

    // ─── login ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("login")
    class LoginTests {

        @Test
        @DisplayName("valid credentials → returns auth DTO")
        void validLogin() {
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(existingUser));
            when(passwordEncoder.matches("StrongP@ss1", "$2a$10$hashedPassword")).thenReturn(true);
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(jwtTokenProvider.generateAccessToken(any())).thenReturn("access-jwt");
            when(refreshTokenService.createToken(any(), any())).thenReturn("raw-refresh");
            when(jwtTokenProvider.getAccessTokenExpirationMs()).thenReturn(86400000L);

            UserAuthDto result = userService.login("alice@example.com", "StrongP@ss1");

            assertNotNull(result);
            assertEquals("alice@example.com", result.getEmail());
            assertEquals("access-jwt", result.getAccessToken());
        }

        @Test
        @DisplayName("wrong password → throws AuthException with INVALID_CREDENTIALS")
        void wrongPassword_throws() {
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(existingUser));
            when(passwordEncoder.matches("wrong", "$2a$10$hashedPassword")).thenReturn(false);

            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.login("alice@example.com", "wrong"));
            assertEquals("INVALID_CREDENTIALS", ex.getErrorCode());
        }

        @Test
        @DisplayName("unknown email → throws AuthException with INVALID_CREDENTIALS")
        void unknownEmail_throws() {
            when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.login("nobody@example.com", "pass"));
            assertEquals("INVALID_CREDENTIALS", ex.getErrorCode());
        }

        @Test
        @DisplayName("deactivated account → throws AuthException with ACCOUNT_DEACTIVATED")
        void deactivatedAccount_throws() {
            existingUser.setIsActive(false);
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(existingUser));

            AuthException ex = assertThrows(AuthException.class,
                    () -> userService.login("alice@example.com", "pass"));
            assertEquals("ACCOUNT_DEACTIVATED", ex.getErrorCode());
        }
    }

    // ─── getUserById ────────────────────────────────────────────────

    @Nested
    @DisplayName("getUserById")
    class GetUserTests {

        @Test
        @DisplayName("existing user → returns DTO")
        void existingUser_returnsDto() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));

            UserDto result = userService.getUserById(1L);

            assertNotNull(result);
            assertEquals("alice@example.com", result.getEmail());
        }

        @Test
        @DisplayName("unknown user → throws IllegalArgumentException")
        void unknownUser_throws() {
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> userService.getUserById(999L));
        }
    }

    // ─── updateUser ─────────────────────────────────────────────────

    @Test
    @DisplayName("partial update → updates only non-null fields")
    void partialUpdate() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserDto update = new UserDto();
        update.setFirstName("Alicia");
        update.setCity("Berlin");

        UserDto result = userService.updateUser(1L, update);

        assertEquals("Alicia", result.getFirstName());
        assertEquals("Tester", result.getLastName());  // unchanged
        assertEquals("Berlin", result.getCity());
    }

    @Test
    @DisplayName("full update applies all optional profile fields")
    void fullUpdate_allOptionalFields() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserDto update = new UserDto();
        update.setFirstName("A1");
        update.setLastName("B1");
        update.setBio("Bio here");
        update.setPhone("+491234");
        update.setCity("Hamburg");
        update.setCountry("DE");

        UserDto result = userService.updateUser(1L, update);

        assertEquals("A1", result.getFirstName());
        assertEquals("B1", result.getLastName());
        assertEquals("Bio here", result.getBio());
        assertEquals("+491234", result.getPhone());
        assertEquals("Hamburg", result.getCity());
        assertEquals("DE", result.getCountry());
    }

    @Test
    @DisplayName("updateUser unknown user throws")
    void updateUser_unknown_throws() {
        when(userRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> userService.updateUser(404L, new UserDto()));
    }

    @Test
    @DisplayName("getUserByEmail existing returns DTO")
    void getUserByEmail_existing() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(existingUser));

        UserDto result = userService.getUserByEmail("alice@example.com");

        assertEquals("alice@example.com", result.getEmail());
    }

    @Test
    @DisplayName("getUserByEmail unknown throws")
    void getUserByEmail_unknown_throws() {
        when(userRepository.findByEmail("none@example.com")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> userService.getUserByEmail("none@example.com"));
    }

    // ─── emailExists ────────────────────────────────────────────────

    @Test
    @DisplayName("emailExists returns true for known email")
    void emailExists_true() {
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);
        assertTrue(userService.emailExists("alice@example.com"));
    }

    @Test
    @DisplayName("emailExists returns false for unknown email")
    void emailExists_false() {
        when(userRepository.existsByEmail("nobody@example.com")).thenReturn(false);
        assertFalse(userService.emailExists("nobody@example.com"));
    }
}
