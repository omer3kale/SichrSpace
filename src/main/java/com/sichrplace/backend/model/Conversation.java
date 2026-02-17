package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "conversations",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_conversation_participants_apartment",
                columnNames = {"apartment_id", "participant_1_id", "participant_2_id"}),
        indexes = {
                @Index(name = "idx_conv_p1", columnList = "participant_1_id"),
                @Index(name = "idx_conv_p2", columnList = "participant_2_id"),
                @Index(name = "idx_conv_apartment", columnList = "apartment_id"),
                @Index(name = "idx_conv_last_msg", columnList = "last_message_at")
        })
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id")
    private Apartment apartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_1_id", nullable = false)
    private User participant1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_2_id", nullable = false)
    private User participant2;

    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    /**
     * Returns true if the given userId is a participant of this conversation.
     */
    public boolean hasParticipant(Long userId) {
        return (participant1 != null && participant1.getId().equals(userId))
                || (participant2 != null && participant2.getId().equals(userId));
    }

    /**
     * Returns the other participant given one userId.
     */
    public User otherParticipant(Long userId) {
        if (participant1 != null && participant1.getId().equals(userId)) {
            return participant2;
        }
        return participant1;
    }
}
