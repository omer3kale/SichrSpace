package com.sichrplace.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "gdpr_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GdprRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    @Column(name = "request_type", nullable = false, length = 50)
    private String requestType;

    @Column(length = 20)
    @Builder.Default
    private String status = "pending";

    @Column(name = "response_data", columnDefinition = "NVARCHAR(MAX)")
    private String responseData; // JSON

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
