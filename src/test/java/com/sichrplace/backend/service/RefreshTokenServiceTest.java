package com.sichrplace.backend.service;

import com.sichrplace.backend.model.RefreshToken;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link RefreshTokenServiceImpl}.
 *
 * <p>Includes a SHA-256 helper that mirrors the private method in the impl
 * to construct expected token hashes in test scenarios.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RefreshTokenService")
class RefreshTokenServiceTest {

    @Mock private RefreshTokenRepository refreshTokenRepository;
    @InjectMocks private RefreshTokenServiceImpl service;

    private User user;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "refreshTokenExpirationDays", 14L);
        user = User.builder().id(5L).email("refresh@test.com").role(User.UserRole.TENANT).build();
    }

    // ── SHA-256 helper (mirrors the private impl method) ─────────────────

    static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    // ── createToken ──────────────────────────────────────────────────────

    @Test
    @DisplayName("createToken persists SHA-256 hash of the raw token (not the raw token itself)")
    void createToken_storesHashNotRaw() {
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> {
            RefreshToken rt = inv.getArgument(0);
            rt.setId(1L);
            return rt;
        });

        String raw = service.createToken(user, "Mozilla/5.0");

        assertNotNull(raw, "raw token must be returned to the caller");
        assertFalse(raw.isBlank());

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        RefreshToken saved = captor.getValue();

        assertNotEquals(raw, saved.getTokenHash(), "stored value must be the hash, not the raw token");
        assertEquals(sha256(raw), saved.getTokenHash(), "stored hash must equal SHA-256 of raw token");
        assertEquals(5L, saved.getUserId());
        assertNull(saved.getRevokedAt(), "newly created token must not be revoked");
    }

    // ── rotateToken ──────────────────────────────────────────────────────

    @Test
    @DisplayName("rotateToken revokes old token and returns a new distinct raw token")
    void rotateToken_revokesOldAndIssuesNew() {
        String rawOld = "old-raw-token-uuid";
        RefreshToken existing = new RefreshToken();
        existing.setId(10L);
        existing.setUserId(5L);
        existing.setTokenHash(sha256(rawOld));
        existing.setExpiresAt(Instant.now().plusSeconds(3600));

        when(refreshTokenRepository.findByTokenHash(sha256(rawOld))).thenReturn(Optional.of(existing));
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String rawNew = service.rotateToken(rawOld, "device");

        assertNotNull(rawNew);
        assertNotEquals(rawOld, rawNew, "rotation must produce a different token");
        assertNotNull(existing.getRevokedAt(), "old token must be marked revoked after rotation");
    }

    // ── revokeToken ──────────────────────────────────────────────────────

    @Test
    @DisplayName("revokeToken sets revokedAt on the matching token (soft delete)")
    void revokeToken_marksRevoked() {
        String raw = "to-revoke-token";
        RefreshToken rt = new RefreshToken();
        rt.setId(2L);
        rt.setUserId(5L);
        rt.setTokenHash(sha256(raw));
        rt.setExpiresAt(Instant.now().plusSeconds(3600));

        when(refreshTokenRepository.findByTokenHash(sha256(raw))).thenReturn(Optional.of(rt));
        when(refreshTokenRepository.save(any())).thenReturn(rt);

        service.revokeToken(raw);

        assertNotNull(rt.getRevokedAt(), "revokedAt must be set after revokeToken()");
        verify(refreshTokenRepository).save(rt);
    }

    // ── revokeAllForUser ─────────────────────────────────────────────────

    @Test
    @DisplayName("revokeAllForUser delegates to repository bulk update")
    void revokeAllForUser_callsBulkUpdate() {
        when(refreshTokenRepository.revokeAllForUser(eq(5L), any())).thenReturn(3);

        service.revokeAllForUser(5L);

        verify(refreshTokenRepository).revokeAllForUser(eq(5L), any(Instant.class));
    }

    // ── guard: expired token ─────────────────────────────────────────────

    @Test
    @DisplayName("rotateToken with expired token throws IllegalArgumentException")
    void rotateToken_expiredToken_throws() {
        String raw = "expired-raw-token";
        RefreshToken expired = new RefreshToken();
        expired.setTokenHash(sha256(raw));
        expired.setUserId(5L);
        expired.setExpiresAt(Instant.now().minusSeconds(10)); // already expired

        when(refreshTokenRepository.findByTokenHash(sha256(raw))).thenReturn(Optional.of(expired));

        assertThrows(IllegalArgumentException.class,
                () -> service.rotateToken(raw, null),
                "Expired token must throw IllegalArgumentException");
    }

    // ── getUserIdFromToken ───────────────────────────────────────────────

    @Test
    @DisplayName("getUserIdFromToken returns userId from a valid token")
    void getUserIdFromToken_returnsCorrectUser() {
        String raw = "valid-user-token";
        RefreshToken rt = new RefreshToken();
        rt.setUserId(7L);
        rt.setTokenHash(sha256(raw));
        rt.setExpiresAt(Instant.now().plusSeconds(3600));

        when(refreshTokenRepository.findByTokenHash(sha256(raw))).thenReturn(Optional.of(rt));

        assertEquals(7L, service.getUserIdFromToken(raw));
    }

    // ── pruneExcessTokens ────────────────────────────────────────────────

    @Test
    @DisplayName("createToken revokes oldest active token when active count reaches MAX_TOKENS_PER_USER (10)")
    void createToken_prunesExcessWhenAtMax() {
        // Simulate 10 active tokens (= MAX_TOKENS_PER_USER) so prune path is entered
        when(refreshTokenRepository.countActiveByUserId(eq(5L), any(Instant.class))).thenReturn(10L);

        // Two non-expired tokens; olderToken has an earlier createdAt
        RefreshToken olderToken = new RefreshToken();
        olderToken.setId(98L);
        olderToken.setUserId(5L);
        olderToken.setExpiresAt(Instant.now().plusSeconds(3600));
        olderToken.setCreatedAt(Instant.now().minusSeconds(7200)); // created 2 hours ago

        RefreshToken newerToken = new RefreshToken();
        newerToken.setId(99L);
        newerToken.setUserId(5L);
        newerToken.setExpiresAt(Instant.now().plusSeconds(3600));
        newerToken.setCreatedAt(Instant.now().minusSeconds(1800)); // created 30 min ago

        when(refreshTokenRepository.findByUserIdAndRevokedAtIsNull(5L))
                .thenReturn(List.of(olderToken, newerToken));
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.createToken(user, "new-device");

        // The oldest token must have been revoked by the pruning logic
        assertNotNull(olderToken.getRevokedAt(),
                "Oldest token must be revoked when active count >= MAX_TOKENS_PER_USER");
        assertNull(newerToken.getRevokedAt(), "Newer token must NOT be revoked");
    }

    // ── requireValid — token-reuse detection ─────────────────────────────

    @Test
    @DisplayName("rotateToken with an already-revoked token triggers reuse detection: revokeAll + throw IAE")
    void rotateToken_reuseDetected_revokesAllAndThrows() {
        String raw = "already-revoked-raw-token";
        RefreshToken revoked = new RefreshToken();
        revoked.setId(50L);
        revoked.setUserId(5L);
        revoked.setTokenHash(sha256(raw));
        revoked.setExpiresAt(Instant.now().plusSeconds(3600));
        revoked.setRevokedAt(Instant.now().minusSeconds(60)); // already revoked

        when(refreshTokenRepository.findByTokenHash(sha256(raw))).thenReturn(Optional.of(revoked));
        when(refreshTokenRepository.revokeAllForUser(eq(5L), any(Instant.class))).thenReturn(1);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.rotateToken(raw, null),
                "Reusing a revoked token must throw IllegalArgumentException");
        assertTrue(ex.getMessage().toLowerCase().contains("revoked"),
                "Exception message must mention 'revoked'");
        verify(refreshTokenRepository).revokeAllForUser(eq(5L), any(Instant.class));
    }

    // ── truncate ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("createToken truncates deviceInfo longer than 500 chars to exactly 500 chars")
    void createToken_longDeviceInfo_truncated() {
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String longDevice = "D".repeat(600); // 600 chars, must be truncated to 500
        service.createToken(user, longDevice);

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        // save() is called: once for pruning (if triggered) and once for the new token
        verify(refreshTokenRepository, atLeastOnce()).save(captor.capture());
        // The LAST saved entity is the new token
        RefreshToken saved = captor.getAllValues().get(captor.getAllValues().size() - 1);
        assertNotNull(saved.getDeviceInfo());
        assertEquals(500, saved.getDeviceInfo().length(),
                "deviceInfo must be truncated to exactly 500 chars");
    }

    // ── revokeToken with non-existent token ──────────────────────────────

    @Test
    @DisplayName("revokeToken with unknown token → no-op (ifPresent no match)")
    void revokeToken_unknownToken_noOp() {
        String raw = "unknown-token";
        when(refreshTokenRepository.findByTokenHash(sha256(raw))).thenReturn(Optional.empty());

        // Should not throw — just silently does nothing
        assertDoesNotThrow(() -> service.revokeToken(raw));
        verify(refreshTokenRepository, never()).save(any());
    }

    // ── null deviceInfo ──────────────────────────────────────────────────

    @Test
    @DisplayName("createToken with null deviceInfo stores null (truncate null → null)")
    void createToken_nullDeviceInfo() {
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> {
            RefreshToken rt = inv.getArgument(0);
            rt.setId(2L);
            return rt;
        });

        String raw = service.createToken(user, null);
        assertNotNull(raw);

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository, atLeastOnce()).save(captor.capture());
        RefreshToken saved = captor.getAllValues().get(captor.getAllValues().size() - 1);
        assertNull(saved.getDeviceInfo(), "null deviceInfo should remain null after truncate");
    }

    // ── prune with all-expired tokens ────────────────────────────────────

    @Test
    @DisplayName("prune when all tokens are expired → min() returns empty, no revocation")
    void prune_allTokensExpired_noOp() {
        when(refreshTokenRepository.countActiveByUserId(eq(5L), any(Instant.class))).thenReturn(10L);

        RefreshToken expired1 = new RefreshToken();
        expired1.setId(80L);
        expired1.setUserId(5L);
        expired1.setExpiresAt(Instant.now().minusSeconds(100)); // expired
        expired1.setCreatedAt(Instant.now().minusSeconds(7200));

        RefreshToken expired2 = new RefreshToken();
        expired2.setId(81L);
        expired2.setUserId(5L);
        expired2.setExpiresAt(Instant.now().minusSeconds(50)); // expired
        expired2.setCreatedAt(Instant.now().minusSeconds(3600));

        when(refreshTokenRepository.findByUserIdAndRevokedAtIsNull(5L))
                .thenReturn(List.of(expired1, expired2));
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.createToken(user, "device");

        // Prune should not revoke any expired token — filter(!isExpired) removes them all
        assertNull(expired1.getRevokedAt());
        assertNull(expired2.getRevokedAt());
    }
}
