package com.sichrplace.backend.service;

import com.sichrplace.backend.model.RefreshToken;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.RefreshTokenRepository;
import lombok.SneakyThrows;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class RefreshTokenServiceImpl implements RefreshTokenService {

    /** Maximum active tokens per user (oldest are silently pruned on overflow). */
    private static final int MAX_TOKENS_PER_USER = 10;

    @Value("${app.refreshTokenExpirationDays:14}")
    private long refreshTokenExpirationDays;

    private final RefreshTokenRepository refreshTokenRepository;

    public RefreshTokenServiceImpl(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    @Override
    @Transactional
    public String createToken(User user, String deviceInfo) {
        pruneExcessTokens(user.getId());

        String rawToken = UUID.randomUUID().toString();
        RefreshToken entity = new RefreshToken();
        entity.setUserId(user.getId());
        entity.setTokenHash(sha256(rawToken));
        entity.setExpiresAt(Instant.now().plus(refreshTokenExpirationDays, ChronoUnit.DAYS));
        entity.setDeviceInfo(truncate(deviceInfo, 500));
        refreshTokenRepository.save(entity);
        return rawToken;
    }

    @Override
    @Transactional
    public String rotateToken(String rawToken, String deviceInfo) {
        RefreshToken current = requireValid(rawToken);

        // Revoke the consumed token immediately
        current.setRevokedAt(Instant.now());
        refreshTokenRepository.save(current);

        // Issue replacement
        String newRaw = UUID.randomUUID().toString();
        RefreshToken replacement = new RefreshToken();
        replacement.setUserId(current.getUserId());
        replacement.setTokenHash(sha256(newRaw));
        replacement.setExpiresAt(Instant.now().plus(refreshTokenExpirationDays, ChronoUnit.DAYS));
        replacement.setDeviceInfo(truncate(deviceInfo, 500));
        refreshTokenRepository.save(replacement);

        return newRaw;
    }

    @Override
    @Transactional
    public void revokeToken(String rawToken) {
        refreshTokenRepository.findByTokenHash(sha256(rawToken))
                .ifPresent(t -> {
                    t.setRevokedAt(Instant.now());
                    refreshTokenRepository.save(t);
                });
    }

    @Override
    @Transactional
    public void revokeAllForUser(Long userId) {
        refreshTokenRepository.revokeAllForUser(userId, Instant.now());
    }

    @Override
    @Transactional(readOnly = true)
    public Long getUserIdFromToken(String rawToken) {
        return requireValid(rawToken).getUserId();
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private RefreshToken requireValid(String rawToken) {
        RefreshToken token = refreshTokenRepository.findByTokenHash(sha256(rawToken))
                .orElseThrow(() -> new IllegalArgumentException("Refresh token not found"));

        if (token.isRevoked()) {
            // Token reuse detected — revoke everything for this user
            refreshTokenRepository.revokeAllForUser(token.getUserId(), Instant.now());
            throw new IllegalArgumentException("Refresh token has been revoked; all sessions invalidated");
        }

        if (token.isExpired()) {
            throw new IllegalArgumentException("Refresh token has expired");
        }

        return token;
    }

    /**
     * Delete oldest tokens once the active count exceeds {@link #MAX_TOKENS_PER_USER}.
     * This prevents unbounded growth when a user logs in from many devices.
     */
    private void pruneExcessTokens(Long userId) {
        long active = refreshTokenRepository.countActiveByUserId(userId, Instant.now());
        if (active >= MAX_TOKENS_PER_USER) {
            // Revoke the oldest active token for this user
            refreshTokenRepository.findByUserIdAndRevokedAtIsNull(userId)
                    .stream()
                    .filter(t -> !t.isExpired())
                    .min((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                    .ifPresent(oldest -> {
                        oldest.setRevokedAt(Instant.now());
                        refreshTokenRepository.save(oldest);
                    });
        }
    }

    @SneakyThrows(java.security.NoSuchAlgorithmException.class)
    private static String sha256(String input) {
        return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8)));
    }

    private static String truncate(String value, int maxLength) {
        if (value == null) return null;
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
