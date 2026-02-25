package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "viewing_credit_packs", indexes = {
        @Index(name = "idx_vcp_user", columnList = "user_id"),
        @Index(name = "idx_vcp_created_at", columnList = "created_at")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewingCreditPack {

    public static final int CREDITS_PER_PACK = 3;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "total_credits", nullable = false)
    @Builder.Default
    private int totalCredits = CREDITS_PER_PACK;

    @Column(name = "used_credits", nullable = false)
    @Builder.Default
    private int usedCredits = 0;

    /** The viewing request whose payment triggered this pack's creation. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_viewing_request_id")
    private ViewingRequest purchaseViewingRequest;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    // ── Convenience methods ──

    public int getCreditsRemaining() {
        return totalCredits - usedCredits;
    }

    public boolean hasCreditsRemaining() {
        return getCreditsRemaining() > 0;
    }

    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    public boolean isUsable() {
        return hasCreditsRemaining() && !isExpired();
    }

    public void useCredit() {
        if (!isUsable()) {
            throw new IllegalStateException("No usable credits remaining in this pack");
        }
        this.usedCredits++;
    }
}
