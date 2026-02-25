package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payment_transactions", indexes = {
        @Index(name = "idx_pt_provider_tx_id", columnList = "provider_transaction_id"),
        @Index(name = "idx_pt_reference", columnList = "reference"),
        @Index(name = "idx_pt_status", columnList = "status"),
        @Index(name = "idx_pt_created_at", columnList = "created_at")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "provider_transaction_id")
    private String providerTransactionId;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "EUR";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PaymentTransactionStatus status = PaymentTransactionStatus.CREATED;

    @Column(name = "failure_reason")
    private String failureReason;

    @Column(length = 255)
    private String reference;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    public enum PaymentTransactionStatus {
        CREATED, PENDING, COMPLETED, FAILED, REFUNDED
    }
}
