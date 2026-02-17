package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notif_user", columnList = "user_id"),
        @Index(name = "idx_notif_read_at", columnList = "read_at"),
        @Index(name = "idx_notif_type", columnList = "type"),
        @Index(name = "idx_notif_created_at", columnList = "created_at")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "related_entity_type", length = 50)
    private String relatedEntityType;

    @Column(name = "related_entity_id")
    private Long relatedEntityId;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "action_url")
    private String actionUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private NotificationPriority priority = NotificationPriority.NORMAL;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    public enum NotificationType {
        VIEWING_REQUEST,
        VIEWING_APPROVED,
        VIEWING_REJECTED,
        NEW_MESSAGE,
        FAVORITE_APARTMENT_UPDATED,
        REVIEW_SUBMITTED,
        REVIEW_MODERATED,
        SAVED_SEARCH_ALERT,
        SYSTEM_ANNOUNCEMENT,
        BOOKING_CONFIRMED,
        BOOKING_CANCELLED,
        PAYMENT_SUCCESS,
        PAYMENT_FAILED,
        APARTMENT_APPROVED,
        APARTMENT_REJECTED,
        GDPR_REQUEST_COMPLETED,
        ACCOUNT_UPDATE
    }

    public enum NotificationPriority {
        LOW, NORMAL, HIGH, URGENT
    }
}
