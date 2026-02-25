package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "video_access_links", indexes = {
        @Index(name = "IX_video_links_video", columnList = "video_id"),
        @Index(name = "IX_video_links_token_hash", columnList = "token_hash"),
        @Index(name = "IX_video_links_expires", columnList = "expires_at"),
        @Index(name = "IX_video_links_recipient", columnList = "recipient_id")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoAccessLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private ViewingVideo video;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(name = "recipient_email", nullable = false, length = 255)
    private String recipientEmail;

    @Column(name = "token_hash", nullable = false, length = 128)
    private String tokenHash;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;

    @Column(name = "view_count", nullable = false)
    @Builder.Default
    private Integer viewCount = 0;

    @Column(name = "first_viewed_at")
    private Instant firstViewedAt;

    @Column(name = "last_viewed_at")
    private Instant lastViewedAt;

    @Column(name = "total_watch_time_seconds", nullable = false)
    @Builder.Default
    private Long totalWatchTimeSeconds = 0L;

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isActive() {
        return !revoked && !isExpired();
    }

    public void recordView(long watchDurationSeconds) {
        Instant now = Instant.now();
        this.viewCount = (this.viewCount == null ? 0 : this.viewCount) + 1;
        if (this.firstViewedAt == null) {
            this.firstViewedAt = now;
        }
        this.lastViewedAt = now;
        this.totalWatchTimeSeconds = (this.totalWatchTimeSeconds == null ? 0L : this.totalWatchTimeSeconds)
                + watchDurationSeconds;
    }
}
