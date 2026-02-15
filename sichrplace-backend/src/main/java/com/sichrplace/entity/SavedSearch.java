package com.sichrplace.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "saved_searches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SavedSearch {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    @NotBlank
    @Column(name = "search_criteria", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String searchCriteria; // JSON

    @Column(name = "alerts_enabled")
    @Builder.Default
    private Boolean alertsEnabled = true;

    @Size(max = 20)
    @Column(name = "alert_frequency", length = 20)
    @Builder.Default
    private String alertFrequency = "daily";

    @Column(name = "last_executed")
    private OffsetDateTime lastExecuted;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
