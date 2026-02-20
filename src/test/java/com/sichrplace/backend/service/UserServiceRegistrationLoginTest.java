package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.UserAuthDto;
import com.sichrplace.backend.dto.UserDto;
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
                .emailVerified(false)
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
            when(jwtTokenProvider.generateRefreshToken(any())).thenReturn("refresh-jwt");
            when(jwtTokenProvider.getAccessTokenExpirationMs()).thenReturn(86400000L);

            UserAuthDto result = userService.register(
                    "bob@example.com", "StrongP@ss1", "Bob", "Builder", User.UserRole.TENANT
            );

            assertNotNull(result);
            assertEquals("bob@example.com", result.getEmail());
            assertEquals("access-jwt", result.getAccessToken());
            assertEquals("refresh-jwt", result.getRefreshToken());
            // Verify verification token was issued
            verify(emailVerificationTokenRepository).save(any());
            verify(emailService).sendEmail(eq("bob@example.com"), anyString(), anyString());
        }

        @Test
        @DisplayName("duplicate email → throws IllegalArgumentException")
        void duplicateEmail_throws() {
            when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> userService.register(
                            "alice@example.com", "pass", "A", "B", User.UserRole.TENANT
                    ));
            assertTrue(ex.getMessage().contains("already registered"));
        }

        @Test
        @DisplayName("ADMIN role → throws IllegalArgumentException")
        void adminRole_throws() {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> userService.register(
                            "admin@example.com", "pass", "A", "B", User.UserRole.ADMIN
                    ));
            assertTrue(ex.getMessage().contains("ADMIN"));
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
            when(jwtTokenProvider.generateRefreshToken(any())).thenReturn("refresh-jwt");
            when(jwtTokenProvider.getAccessTokenExpirationMs()).thenReturn(86400000L);

            UserAuthDto result = userService.login("alice@example.com", "StrongP@ss1");

            assertNotNull(result);
            assertEquals("alice@example.com", result.getEmail());
            assertEquals("access-jwt", result.getAccessToken());
        }

        @Test
        @DisplayName("wrong password → throws IllegalArgumentException")
        void wrongPassword_throws() {
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(existingUser));
            when(passwordEncoder.matches("wrong", "$2a$10$hashedPassword")).thenReturn(false);

            assertThrows(IllegalArgumentException.class,
                    () -> userService.login("alice@example.com", "wrong"));
        }

        @Test
        @DisplayName("unknown email → throws IllegalArgumentException")
        void unknownEmail_throws() {
            when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> userService.login("nobody@example.com", "pass"));
        }

        @Test
        @DisplayName("deactivated account → throws IllegalArgumentException")
        void deactivatedAccount_throws() {
            existingUser.setIsActive(false);
            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(existingUser));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> userService.login("alice@example.com", "pass"));
            assertTrue(ex.getMessage().contains("deactivated"));
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
