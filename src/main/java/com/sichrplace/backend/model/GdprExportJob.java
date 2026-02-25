package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * Tracks GDPR "right to data portability" export requests.
 * <p>Status flow: QUEUED → PROCESSING → READY → EXPIRED (gc job)
 * or QUEUED/PROCESSING → FAILED
 */
@Entity
@Table(name = "gdpr_export_jobs", indexes = {
        @Index(name = "idx_gdpr_export_user", columnList = "user_id"),
        @Index(name = "idx_gdpr_export_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
public class GdprExportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 20)
    private String status = "QUEUED";

    /** One-time download token handed to the user. */
    @Column(name = "download_token", unique = true, length = 128)
    private String downloadToken;

    /** When the download link expires (set once status → READY). */
    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @CreatedDate
    @Column(name = "requested_at", updatable = false)
    private Instant requestedAt;

    public enum Status {
        QUEUED, PROCESSING, READY, EXPIRED, FAILED
    }
}
