package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "message_reactions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_reaction_msg_user_emoji",
                        columnNames = {"message_id", "user_id", "emoji_code"})
        },
        indexes = {
                @Index(name = "idx_reaction_message", columnList = "message_id")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "emoji_code", nullable = false, length = 64)
    private String emojiCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
