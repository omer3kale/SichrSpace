package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "viewing_request_transitions", indexes = {
        @Index(name = "idx_vrt_request", columnList = "viewing_request_id"),
        @Index(name = "idx_vrt_changed_at", columnList = "changed_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewingRequestTransition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viewing_request_id", nullable = false)
    private ViewingRequest viewingRequest;

    @Column(name = "from_status", length = 20)
    private String fromStatus;

    @Column(name = "to_status", length = 20, nullable = false)
    private String toStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by", nullable = false)
    private User changedBy;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @Column(length = 500)
    private String reason;
}
