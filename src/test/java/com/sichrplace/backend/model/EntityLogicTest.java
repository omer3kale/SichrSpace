package com.sichrplace.backend.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for custom logic in entity classes.
 * Verifies isExpired() / isUsed() helpers on PasswordResetToken
 * and EmailVerificationToken.
 */
@DisplayName("Entity — custom logic")
class EntityLogicTest {

    // ─── PasswordResetToken ─────────────────────────────────────────

    @Test
    @DisplayName("PasswordResetToken.isExpired → false when in future")
    void prt_notExpired() {
        PasswordResetToken prt = PasswordResetToken.builder()
                .expiresAt(Instant.now().plus(30, ChronoUnit.MINUTES))
                .build();
        assertFalse(prt.isExpired());
    }

    @Test
    @DisplayName("PasswordResetToken.isExpired → true when in past")
    void prt_expired() {
        PasswordResetToken prt = PasswordResetToken.builder()
                .expiresAt(Instant.now().minus(1, ChronoUnit.MINUTES))
                .build();
        assertTrue(prt.isExpired());
    }

    @Test
    @DisplayName("PasswordResetToken.isUsed → false when usedAt is null")
    void prt_notUsed() {
        PasswordResetToken prt = PasswordResetToken.builder()
                .usedAt(null)
                .build();
        assertFalse(prt.isUsed());
    }

    @Test
    @DisplayName("PasswordResetToken.isUsed → true when usedAt is set")
    void prt_used() {
        PasswordResetToken prt = PasswordResetToken.builder()
                .usedAt(Instant.now())
                .build();
        assertTrue(prt.isUsed());
    }

    // ─── EmailVerificationToken ─────────────────────────────────────

    @Test
    @DisplayName("EmailVerificationToken.isExpired → false when in future")
    void evt_notExpired() {
        EmailVerificationToken evt = EmailVerificationToken.builder()
                .expiresAt(Instant.now().plus(12, ChronoUnit.HOURS))
                .build();
        assertFalse(evt.isExpired());
    }

    @Test
    @DisplayName("EmailVerificationToken.isExpired → true when in past")
    void evt_expired() {
        EmailVerificationToken evt = EmailVerificationToken.builder()
                .expiresAt(Instant.now().minus(1, ChronoUnit.MINUTES))
                .build();
        assertTrue(evt.isExpired());
    }

    @Test
    @DisplayName("EmailVerificationToken.isUsed → false when usedAt is null")
    void evt_notUsed() {
        EmailVerificationToken evt = EmailVerificationToken.builder()
                .usedAt(null)
                .build();
        assertFalse(evt.isUsed());
    }

    @Test
    @DisplayName("EmailVerificationToken.isUsed → true when usedAt is set")
    void evt_used() {
        EmailVerificationToken evt = EmailVerificationToken.builder()
                .usedAt(Instant.now())
                .build();
        assertTrue(evt.isUsed());
    }
}
