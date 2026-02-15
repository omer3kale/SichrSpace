package com.sichrplace.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "reviews", uniqueConstraints = @UniqueConstraint(columnNames = {"apartment_id", "user_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viewing_request_id")
    private ViewingRequest viewingRequest;

    @Min(1) @Max(5)
    @Column(nullable = false)
    private Integer rating;

    @NotBlank @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String title;

    @NotBlank
    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String comment;

    @Size(max = 20) @Column(length = 20)
    @Builder.Default
    private String status = "pending";

    @Column(name = "moderation_note", columnDefinition = "NVARCHAR(MAX)")
    private String moderationNote;

    @Column(name = "moderated_at")
    private OffsetDateTime moderatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "moderated_by")
    private User moderatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
