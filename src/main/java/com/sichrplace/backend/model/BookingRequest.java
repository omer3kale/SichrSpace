package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;

/**
 * A tenant's application to book (rent) an apartment.
 *
 * <p>Lifecycle: DRAFT → SUBMITTED → ACCEPTED | DECLINED.
 */
@Entity
@Table(name = "booking_requests", indexes = {
        @Index(name = "idx_br_tenant", columnList = "tenant_id"),
        @Index(name = "idx_br_apartment", columnList = "apartment_id"),
        @Index(name = "idx_br_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private User tenant;

    /** Landlord who owns the apartment — denormalised for fast queries. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "landlord_id", nullable = false)
    private User landlord;

    // ── Move-in preferences ──

    @Column(name = "preferred_move_in")
    private LocalDate preferredMoveIn;

    @Column(name = "preferred_move_out")
    private LocalDate preferredMoveOut;

    @Column(name = "would_extend_later")
    @Builder.Default
    private boolean wouldExtendLater = false;

    // ── Occupants ──

    /** JSON list of {name, relationToApplicant} value objects. */
    @Column(columnDefinition = "TEXT")
    private String adultsJson;

    /** JSON list of ageCategory enums: INFANT, CHILD, TEENAGER. */
    @Column(columnDefinition = "TEXT")
    private String childrenJson;

    /** JSON list of petType enums. */
    @Column(columnDefinition = "TEXT")
    private String petsJson;

    // ── Reason for moving ──

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_type")
    private ReasonType reasonType;

    @Column
    private String institution;

    @Enumerated(EnumType.STRING)
    private BookingPayer payer;

    @Column(name = "detailed_reason", columnDefinition = "TEXT")
    private String detailedReason;

    // ── Status ──

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BookingStatus status = BookingStatus.SUBMITTED;

    @Column(name = "decline_reason")
    private String declineReason;

    // ── Audit ──

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    // ── Enums ──

    public enum BookingStatus {
        DRAFT, SUBMITTED, ACCEPTED, DECLINED
    }

    public enum ReasonType {
        WORK, STUDY, TEMPORARY_STAY, APPRENTICESHIP, INTERNSHIP
    }

    public enum BookingPayer {
        MYSELF, FAMILY, SCHOLARSHIP, COMPANY
    }

    public enum AgeCategory {
        INFANT, CHILD, TEENAGER
    }

    public enum PetType {
        DOG, CAT, BIRD, FISH, RODENT, REPTILE, OTHER
    }
}
