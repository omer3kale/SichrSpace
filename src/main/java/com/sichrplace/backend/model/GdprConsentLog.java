package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Immutable audit log of a user's consent decisions (GDPR Art. 7).
 * Rows are never updated; new rows are appended for every change.
 */
@Entity
@Table(name = "gdpr_consent_log", indexes = {
        @Index(name = "idx_gdpr_consent_user", columnList = "user_id"),
        @Index(name = "idx_gdpr_consent_type", columnList = "consent_type")
})
@Data
@NoArgsConstructor
public class GdprConsentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Null when consent was given before the user had an account. */
    @Column(name = "user_id")
    private Long userId;

    /** Non-null for pre-registration consent flows. */
    @Column(name = "anon_session_id", length = 128)
    private String anonSessionId;

    /** e.g. "MARKETING", "ANALYTICS", "NECESSARY" */
    @Column(name = "consent_type", nullable = false, length = 50)
    private String consentType;

    /** {@code true} = granted, {@code false} = withdrawn. */
    @Column(nullable = false)
    private boolean granted;

    /** SHA-256 of client IP — PII-safe. */
    @Column(name = "ip_hash", length = 64)
    private String ipHash;

    /** SHA-256 of User-Agent — PII-safe. */
    @Column(name = "user_agent_hash", length = 64)
    private String userAgentHash;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt = Instant.now();
}
