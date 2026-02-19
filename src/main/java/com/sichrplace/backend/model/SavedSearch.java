package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "saved_searches", indexes = {
        @Index(name = "idx_ss_user", columnList = "user_id"),
        @Index(name = "idx_ss_active", columnList = "is_active")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_ss_user_name", columnNames = {"user_id", "name"})
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedSearch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(name = "filter_json", columnDefinition = "VARCHAR(MAX)", nullable = false)
    private String filterJson;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "last_matched_at")
    private Instant lastMatchedAt;

    @Column(name = "match_count", nullable = false)
    @Builder.Default
    private Integer matchCount = 0;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;
}
