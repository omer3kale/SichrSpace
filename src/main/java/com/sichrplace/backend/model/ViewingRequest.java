package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "viewing_requests", indexes = {
        @Index(name = "idx_vr_tenant", columnList = "tenant_id"),
        @Index(name = "idx_vr_apartment", columnList = "apartment_id"),
        @Index(name = "idx_vr_status", columnList = "status"),
        @Index(name = "idx_vr_created_at", columnList = "created_at")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewingRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private User tenant;

    @Column(name = "proposed_date_time", nullable = false)
    private LocalDateTime proposedDateTime;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ViewingStatus status;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "confirmed_date_time")
    private LocalDateTime confirmedDateTime;

    @Column(name = "decline_reason")
    private String declineReason;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum ViewingStatus {
        PENDING, CONFIRMED, DECLINED, COMPLETED, CANCELLED
    }
}
