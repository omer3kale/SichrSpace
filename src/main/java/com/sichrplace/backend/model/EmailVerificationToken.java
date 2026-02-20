package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Stores email-verification tokens issued at registration.
 * Each token is single-use and time-limited (24 hours).
 * The token value stored here is a SHA-256 hash — the plain-text token
 * is only shown to the user once (in the verification email link).
 */
@Entity
@Table(name = "email_verification_tokens", indexes = {
        @Index(name = "idx_evt_token", columnList = "token_hash", unique = true),
        @Index(name = "idx_evt_user", columnList = "user_id"),
        @Index(name = "idx_evt_expires", columnList = "expires_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailVerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** SHA-256 hex hash of the random token sent to the user. */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isUsed() {
        return usedAt != null;
    }
}
