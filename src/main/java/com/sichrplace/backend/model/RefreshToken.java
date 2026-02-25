package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * Persistent refresh token for secure session management.
 *
 * <p>Only the SHA-256 hash of the raw token is stored — the raw value is
 * returned to the client at creation time and never persisted.
 *
 * <p>Token lifecycle:
 * <ol>
 *   <li>Login / Register → insert a new row with {@code revoked_at = null}</li>
 *   <li>Refresh → insert a new row, set {@code revoked_at} on the old row (rotation)</li>
 *   <li>Logout → set {@code revoked_at} on all rows for the user</li>
 *   <li>Cleanup job (future) → delete expired + revoked rows older than 30 days</li>
 * </ol>
 */
@Entity
@Table(
    name = "refresh_tokens",
    indexes = {
        @Index(name = "idx_refresh_user_id", columnList = "user_id"),
        @Index(name = "idx_refresh_expires",  columnList = "expires_at")
    },
    uniqueConstraints = @UniqueConstraint(name = "uq_refresh_token_hash", columnNames = "token_hash")
)
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FK to users.id — denormalized (no @ManyToOne) to avoid lazy-load side-effects. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** SHA-256 hex of the raw opaque token (64 chars). */
    @Column(name = "token_hash", nullable = false, length = 64, unique = true)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /** Non-null when the token has been used or explicitly revoked. */
    @Column(name = "revoked_at")
    private Instant revokedAt;

    /** Truncated User-Agent for device tracking (optional). */
    @Column(name = "device_info", length = 500)
    private String deviceInfo;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // ── helpers ─────────────────────────────────────────────────────────────

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public boolean isValid() {
        return !isExpired() && !isRevoked();
    }
}
