package com.sichrplace.backend.service;

import com.sichrplace.backend.exception.AuthException;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.EmailVerificationTokenRepository;
import com.sichrplace.backend.repository.PasswordResetTokenRepository;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for account-lockout behaviour in {@link UserServiceImpl}.
 *
 * <p>Covers:
 * <ul>
 *   <li>Failed-attempt counter increments on wrong password (below threshold).</li>
 *   <li>Lockout timestamp is set once {@code maxFailedAttempts} is reached.</li>
 *   <li>A locked account is rejected even with the correct password.</li>
 *   <li>Successful login resets {@code failedLoginAttempts} and {@code lockedUntil}.</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserService — account lockout")
class AccountLockoutTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private EmailVerificationTokenRepository emailVerificationTokenRepository;
    @Mock private EmailService emailService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private RefreshTokenService refreshTokenService;

    @InjectMocks private UserServiceImpl userService;

    private User user;

    @BeforeEach
    void setUp() {
        // Inject @Value fields that @InjectMocks cannot populate from application.yml
        ReflectionTestUtils.setField(userService, "maxFailedAttempts", 5);
        ReflectionTestUtils.setField(userService, "lockoutMinutes", 30);

        user = User.builder()
                .id(10L)
                .email("lock@example.com")
                .password("$2a$10$hashed")
                .role(User.UserRole.TENANT)
                .isActive(true)
                .emailVerified(true)
                .failedLoginAttempts(0)
                .build();
    }

    @Test
    @DisplayName("failed-attempt counter increments on wrong password (below threshold)")
    void wrongPassword_incrementsCounter() {
        when(userRepository.findByEmail("lock@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "$2a$10$hashed")).thenReturn(false);
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThrows(AuthException.class,
                () -> userService.login("lock@example.com", "wrong"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertEquals(1, saved.getFailedLoginAttempts());
        assertNull(saved.getLockedUntil(), "Account must not be locked below the threshold");
    }

    @Test
    @DisplayName("account is locked after reaching maxFailedAttempts (5)")
    void maxAttempts_setsLockedUntil() {
        user.setFailedLoginAttempts(4); // next failure hits threshold
        when(userRepository.findByEmail("lock@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "$2a$10$hashed")).thenReturn(false);
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThrows(AuthException.class,
                () -> userService.login("lock@example.com", "wrong"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertEquals(5, saved.getFailedLoginAttempts());
        assertNotNull(saved.getLockedUntil(), "lockedUntil must be set once threshold is reached");
        assertTrue(saved.getLockedUntil().isAfter(Instant.now()),
                "Lock expiry must be in the future");
    }

    @Test
    @DisplayName("locked account is rejected even with correct password")
    void lockedAccount_rejectedWithCorrectPassword() {
        user.setLockedUntil(Instant.now().plusSeconds(1800)); // locked for 30 min
        when(userRepository.findByEmail("lock@example.com")).thenReturn(Optional.of(user));

        AuthException ex = assertThrows(AuthException.class,
                () -> userService.login("lock@example.com", "correct-password"));

        assertEquals("ACCOUNT_LOCKED", ex.getErrorCode());
    }

    @Test
    @DisplayName("successful login resets failedLoginAttempts and lockedUntil")
    void successfulLogin_resetsLockoutState() {
        user.setFailedLoginAttempts(3);
        when(userRepository.findByEmail("lock@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correct", "$2a$10$hashed")).thenReturn(true);
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateAccessToken(any())).thenReturn("access-jwt");
        when(jwtTokenProvider.getAccessTokenExpirationMs()).thenReturn(86400000L);
        when(refreshTokenService.createToken(any(), any())).thenReturn("raw-refresh");

        userService.login("lock@example.com", "correct");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertEquals(0, saved.getFailedLoginAttempts(), "counter must be reset to 0 on success");
        assertNull(saved.getLockedUntil(), "lockedUntil must be cleared on success");
    }
}
