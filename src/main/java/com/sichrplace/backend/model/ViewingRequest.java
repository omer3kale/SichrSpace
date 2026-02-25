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

    /** FTL-15: optional open-ended questions from the tenant. */
    @Column(columnDefinition = "TEXT")
    private String questions;

    /** FTL-15: points the tenant wants to pay attention to during viewing. */
    @Column(name = "attention_points", columnDefinition = "TEXT")
    private String attentionPoints;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ViewingStatus status;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "confirmed_date_time")
    private LocalDateTime confirmedDateTime;

    @Column(name = "decline_reason")
    private String declineReason;

    @Column(name = "payment_required", nullable = false)
    @Builder.Default
    private boolean paymentRequired = false;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "payment_transaction_id")
    private PaymentTransaction paymentTransaction;

    @OneToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "video_id")
    private ViewingVideo video;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    // ---- payment convenience methods ----

    /**
     * Returns true when no payment is needed, or the linked transaction is COMPLETED.
     */
    public boolean isPaid() {
        return !paymentRequired
                || (paymentTransaction != null
                    && paymentTransaction.getStatus() == PaymentTransaction.PaymentTransactionStatus.COMPLETED);
    }

    /**
     * Returns true when a payment transaction exists and is still in progress (CREATED or PENDING).
     */
    public boolean isPaymentInProgress() {
        if (paymentTransaction == null) return false;
        return paymentTransaction.getStatus() == PaymentTransaction.PaymentTransactionStatus.CREATED
                || paymentTransaction.getStatus() == PaymentTransaction.PaymentTransactionStatus.PENDING;
    }

    /**
     * Returns true when the linked payment transaction has been refunded.
     */
    public boolean isRefunded() {
        return paymentTransaction != null
                && paymentTransaction.getStatus() == PaymentTransaction.PaymentTransactionStatus.REFUNDED;
    }

    public enum ViewingStatus {
        PENDING, CONFIRMED, DECLINED, COMPLETED, CANCELLED
    }
}
