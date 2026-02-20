package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.UserDto;
import com.sichrplace.backend.dto.UserAuthDto;
import com.sichrplace.backend.model.PasswordResetToken;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.PasswordResetTokenRepository;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public UserAuthDto register(String email, String password, String firstName, String lastName, User.UserRole role) {
        log.info("Registration attempt for email={}", email);

        if (role == User.UserRole.ADMIN) {
            log.warn("Blocked attempt to self-register as ADMIN, email={}", email);
            throw new IllegalArgumentException("Cannot self-register as ADMIN");
        }

        if (userRepository.existsByEmail(email)) {
            log.warn("Registration failed – email already exists: {}", email);
            throw new IllegalArgumentException("Email already registered");
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .firstName(firstName)
                .lastName(lastName)
                .role(role)
                .emailVerified(false)
                .isActive(true)
                .build();

        user = userRepository.save(user);
        log.info("User registered successfully id={}, role={}", user.getId(), role);

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user);

        return UserAuthDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtTokenProvider.getAccessTokenExpirationMs())
                .build();
    }

    @Override
    public UserAuthDto login(String email, String password) {
        log.info("Login attempt for email={}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Login failed – email not found: {}", email);
                    return new IllegalArgumentException("Invalid email or password");
                });

        if (!user.getIsActive()) {
            log.warn("Login failed – account deactivated, userId={}", user.getId());
            throw new IllegalArgumentException("Account is deactivated");
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            log.warn("Login failed – bad password for userId={}", user.getId());
            throw new IllegalArgumentException("Invalid email or password");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        log.info("Login successful userId={}, role={}", user.getId(), user.getRole());

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user);

        return UserAuthDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtTokenProvider.getAccessTokenExpirationMs())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return UserDto.fromEntity(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return UserDto.fromEntity(user);
    }

    @Override
    public UserDto updateUser(Long id, UserDto updateData) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (updateData.getFirstName() != null) {
            user.setFirstName(updateData.getFirstName());
        }
        if (updateData.getLastName() != null) {
            user.setLastName(updateData.getLastName());
        }
        if (updateData.getBio() != null) {
            user.setBio(updateData.getBio());
        }
        if (updateData.getPhone() != null) {
            user.setPhone(updateData.getPhone());
        }
        if (updateData.getCity() != null) {
            user.setCity(updateData.getCity());
        }
        if (updateData.getCountry() != null) {
            user.setCountry(updateData.getCountry());
        }

        user = userRepository.save(user);
        return UserDto.fromEntity(user);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    // ─── Password Reset ──────────────────────────────────────────────

    private static final int TOKEN_EXPIRY_HOURS = 1;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    public Map<String, String> forgotPassword(String email) {
        log.info("Password reset requested for email={}", email);

        // Always return success to prevent email enumeration
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            log.warn("Password reset for unknown email={} — returning success silently", email);
            return Map.of("message", "If the email exists, a reset link has been sent.");
        }

        // Invalidate any existing tokens for this user
        passwordResetTokenRepository.invalidateAllForUser(user.getId(), Instant.now());

        // Generate cryptographic token
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String plainToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        String tokenHash = sha256(plainToken);

        PasswordResetToken prt = PasswordResetToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(Instant.now().plus(TOKEN_EXPIRY_HOURS, ChronoUnit.HOURS))
                .createdAt(Instant.now())
                .build();
        passwordResetTokenRepository.save(prt);

        // In production, send email.  For now, log the token.
        log.info("Password reset token for userId={}: {}", user.getId(), plainToken);

        return Map.of(
                "message", "If the email exists, a reset link has been sent.",
                "token", plainToken   // REMOVE in production — shown only for dev/demo
        );
    }

    @Override
    public void resetPassword(String token, String newPassword) {
        String tokenHash = sha256(token);

        PasswordResetToken prt = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset token"));

        if (prt.isUsed()) {
            throw new IllegalStateException("Reset token has already been used");
        }
        if (prt.isExpired()) {
            throw new IllegalStateException("Reset token has expired");
        }

        // Update password
        User user = prt.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark token as used
        prt.setUsedAt(Instant.now());
        passwordResetTokenRepository.save(prt);

        log.info("Password reset completed for userId={}", user.getId());
    }

    private static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
