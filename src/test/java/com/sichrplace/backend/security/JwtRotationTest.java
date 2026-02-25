package com.sichrplace.backend.security;

import com.sichrplace.backend.model.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for JWT key-rotation grace-period in {@link JwtTokenProvider}.
 *
 * <p>When {@code app.jwtSecretPrevious} is configured, tokens signed with
 * the previous secret must remain valid until they naturally expire.
 * After the grace window the old secret is irrelevant.
 */
@DisplayName("JwtTokenProvider — key rotation")
class JwtRotationTest {

    private static final String CURRENT_SECRET  = "currentSecretKey0123456789abcdef0123456789abcdef";
    private static final String PREVIOUS_SECRET = "previousSecretKey0123456789abcdef0123456789abcde";
    private static final String UNRELATED_SECRET = "unrelatedSecretXXXXXX0123456789abcdef0123456789";

    private static User testUser() {
        return User.builder().id(42L).email("rotate@test.com").role(User.UserRole.TENANT).build();
    }

    @Test
    @DisplayName("token signed with current secret is accepted")
    void currentSecret_accepted() {
        JwtTokenProvider provider = new JwtTokenProvider(CURRENT_SECRET, "", 60_000L, 120_000L);
        String token = provider.generateAccessToken(testUser());

        assertTrue(provider.validateToken(token));
        assertEquals(42L, provider.getUserIdFromToken(token));
    }

    @Test
    @DisplayName("token signed with previous (old) secret is accepted during grace period")
    void previousSecret_acceptedDuringGrace() {
        // Simulate key rotation: old provider used PREVIOUS_SECRET
        JwtTokenProvider oldProvider = new JwtTokenProvider(PREVIOUS_SECRET, "", 60_000L, 120_000L);
        String oldToken = oldProvider.generateAccessToken(testUser());

        // New provider: current = CURRENT_SECRET, previous = PREVIOUS_SECRET (grace period)
        JwtTokenProvider rotatedProvider =
                new JwtTokenProvider(CURRENT_SECRET, PREVIOUS_SECRET, 60_000L, 120_000L);

        assertTrue(rotatedProvider.validateToken(oldToken),
                "Token signed with previous secret must be accepted during grace period");
        assertEquals(42L, rotatedProvider.getUserIdFromToken(oldToken));
    }

    @Test
    @DisplayName("token signed with unrelated secret is rejected even when previous is configured")
    void unrelatedSecret_rejected() {
        JwtTokenProvider attacker = new JwtTokenProvider(UNRELATED_SECRET, "", 60_000L, 120_000L);
        String forgedToken = attacker.generateAccessToken(testUser());

        JwtTokenProvider provider =
                new JwtTokenProvider(CURRENT_SECRET, PREVIOUS_SECRET, 60_000L, 120_000L);

        assertFalse(provider.validateToken(forgedToken),
                "Token from unrelated secret (neither current nor previous) must be rejected");
    }

    @Test
    @DisplayName("new token issued by rotated provider is accepted with current secret only")
    void newToken_isssuedWithCurrentSecret() {
        JwtTokenProvider provider =
                new JwtTokenProvider(CURRENT_SECRET, PREVIOUS_SECRET, 60_000L, 120_000L);
        String newToken = provider.generateAccessToken(testUser());

        // A verifier that knows only the current secret must accept it
        JwtTokenProvider currentOnly = new JwtTokenProvider(CURRENT_SECRET, "", 60_000L, 120_000L);
        assertTrue(currentOnly.validateToken(newToken));
    }
}
