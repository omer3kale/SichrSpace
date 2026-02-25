package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "conversation_archives",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_conv_archive_user",
                columnNames = {"conversation_id", "user_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationArchive {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "archived_at", nullable = false)
    private Instant archivedAt;
}
