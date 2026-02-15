package com.sichrplace.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank @Size(max = 50)
    @Column(nullable = false, length = 50)
    private String type;

    @NotBlank @Size(max = 200)
    @Column(nullable = false, length = 200)
    private String title;

    @NotBlank
    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String message;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    @Builder.Default
    private String data = "{}"; // JSON

    @Column(name = "action_url", columnDefinition = "NVARCHAR(MAX)")
    private String actionUrl;

    @Size(max = 20) @Column(length = 20)
    @Builder.Default
    private String priority = "normal";

    @Column(name = "is_read")
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "read_at")
    private OffsetDateTime readAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
