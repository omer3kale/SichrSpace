package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.UserDto;
import com.sichrplace.backend.dto.UserAuthDto;
import com.sichrplace.backend.exception.AuthException;
import com.sichrplace.backend.model.EmailVerificationToken;
import com.sichrplace.backend.model.PasswordResetToken;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.EmailVerificationTokenRepository;
import com.sichrplace.backend.repository.PasswordResetTokenRepository;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    /** Maximum consecutive failed logins before temporary lockout. */
    @Value("${app.login.maxFailedAttempts:5}")
    private int maxFailedAttempts;

    /** Lock duration in minutes after exceeding {@link #maxFailedAttempts}. */
    @Value("${app.login.lockoutMinutes:30}")
    private int lockoutMinutes;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;

    /** Password strength: >= 8 chars, 1 upper, 1 lower, 1 digit, 1 special. */
    private static final Pattern STRONG_PASSWORD = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$");

    @Override
    public UserAuthDto register(String email, String password, String firstName, String lastName, User.UserRole role) {
        log.info("Registration attempt for email={}", email);

        if (role == User.UserRole.ADMIN) {
            log.warn("Blocked attempt to self-register as ADMIN, email={}", email);
            throw AuthException.adminSelfRegister();
        }

        if (userRepository.existsByEmail(email.toLowerCase(Locale.ROOT))) {
            log.warn("Registration failed – email already exists: {}", email);
            throw AuthException.emailTaken(email);
        }

        if (!STRONG_PASSWORD.matcher(password).matches()) {
            log.warn("Registration failed – weak password for email={}", email);
            throw AuthException.passwordWeak();
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

        // Issue email verification token
        issueVerificationToken(user);

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = refreshTokenService.createToken(user, null);

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
                    return AuthException.invalidCredentials();
                });

        if (!user.getIsActive()) {
            log.warn("Login failed – account deactivated, userId={}", user.getId());
            throw AuthException.accountDeactivated();
        }

        // --- Account lockout check ---
        if (user.getLockedUntil() != null && Instant.now().isBefore(user.getLockedUntil())) {
            log.warn("Login failed – account temporarily locked, userId={}, lockedUntil={}",
                    user.getId(), user.getLockedUntil());
            throw AuthException.accountLocked();
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= maxFailedAttempts) {
                user.setLockedUntil(Instant.now().plus(lockoutMinutes, ChronoUnit.MINUTES));
                log.warn("Account locked after {} failed attempts, userId={}", attempts, user.getId());
            } else {
                log.warn("Login failed – bad password for userId={}, failedAttempts={}", user.getId(), attempts);
            }
            userRepository.save(user);
            throw AuthException.invalidCredentials();
        }

        // --- Email verification check ---
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            log.warn("Login failed – email not verified, userId={}", user.getId());
            throw AuthException.emailNotVerified();
        }

        // Successful login — reset lockout state
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        log.info("Login successful userId={}, role={}", user.getId(), user.getRole());

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = refreshTokenService.createToken(user, null);

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
        if (updateData.getPreferredLocale() != null) {
            String locale = updateData.getPreferredLocale().toLowerCase(java.util.Locale.ROOT);
            if (!java.util.Set.of("en", "de", "tr").contains(locale)) {
                throw new IllegalArgumentException("Preferred locale must be one of: en, de, tr");
            }
            user.setPreferredLocale(locale);
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
                .orElseThrow(() -> AuthException.invalidToken());

        if (prt.isUsed()) {
            throw AuthException.tokenAlreadyUsed();
        }
        if (prt.isExpired()) {
            throw AuthException.tokenExpired();
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

    // ─── Email Verification ─────────────────────────────────────────

    private static final int VERIFICATION_EXPIRY_HOURS = 24;

    private void issueVerificationToken(User user) {
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String plainToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        String tokenHash = sha256(plainToken);

        EmailVerificationToken evt = EmailVerificationToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(Instant.now().plus(VERIFICATION_EXPIRY_HOURS, ChronoUnit.HOURS))
                .createdAt(Instant.now())
                .build();
        emailVerificationTokenRepository.save(evt);

        String verifyUrl = "https://sichrplace.com/verify-email?token=" + plainToken;
        emailService.sendEmail(
                user.getEmail(),
                "SichrPlace — Verify your email address",
                "Welcome to SichrPlace!\n\nPlease verify your email by clicking this link:\n"
                        + verifyUrl + "\n\nThis link expires in 24 hours."
        );

        log.info("Email verification token issued for userId={}", user.getId());
    }

    @Override
    public Map<String, String> verifyEmail(String token) {
        String tokenHash = sha256(token);

        EmailVerificationToken evt = emailVerificationTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> AuthException.invalidToken());

        if (evt.isUsed()) {
            throw AuthException.tokenAlreadyUsed();
        }
        if (evt.isExpired()) {
            throw AuthException.tokenExpired();
        }

        // Mark user as email-verified
        User user = evt.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        // Mark token as used
        evt.setUsedAt(Instant.now());
        emailVerificationTokenRepository.save(evt);

        log.info("Email verified for userId={}", user.getId());
        return Map.of("message", "Email verified successfully.");
    }

    @Override
    public Map<String, String> resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || Boolean.TRUE.equals(user.getEmailVerified())) {
            // Silent success to prevent enumeration
            return Map.of("message", "If the email exists and is unverified, a new link has been sent.");
        }

        issueVerificationToken(user);
        return Map.of("message", "If the email exists and is unverified, a new link has been sent.");
    }
}
