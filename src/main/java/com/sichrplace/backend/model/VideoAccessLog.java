package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "video_access_logs", indexes = {
        @Index(name = "IX_video_logs_link", columnList = "link_id"),
        @Index(name = "IX_video_logs_video", columnList = "video_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoAccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "link_id", nullable = false)
    private VideoAccessLink link;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private ViewingVideo video;

    @Column(name = "ip_address_hash", length = 128)
    private String ipAddressHash;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "accessed_at", nullable = false)
    @Builder.Default
    private Instant accessedAt = Instant.now();

    @Column(name = "watch_duration_seconds")
    private Long watchDurationSeconds;
}
