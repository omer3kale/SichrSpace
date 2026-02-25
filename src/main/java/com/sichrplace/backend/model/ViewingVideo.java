package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "viewing_videos", indexes = {
        @Index(name = "IX_viewing_videos_apartment", columnList = "apartment_id"),
        @Index(name = "IX_viewing_videos_viewing", columnList = "viewing_request_id"),
        @Index(name = "IX_viewing_videos_uploader", columnList = "uploaded_by"),
        @Index(name = "IX_viewing_videos_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewingVideo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viewing_request_id")
    private ViewingRequest viewingRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, length = 100)
    @Builder.Default
    private String contentType = "video/mp4";

    @Column(name = "file_size_bytes", nullable = false)
    private Long fileSizeBytes;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String notes;

    @Column(name = "duration_seconds")
    private Long durationSeconds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private VideoStatus status = VideoStatus.ACTIVE;

    @Column(name = "access_count", nullable = false)
    @Builder.Default
    private Integer accessCount = 0;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public void incrementAccessCount() {
        this.accessCount = (this.accessCount == null ? 0 : this.accessCount) + 1;
    }

    public enum VideoStatus {
        ACTIVE,
        DELETED
    }
}
