package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.MessageReaction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageReactionDto {
    private Long id;
    private Long messageId;
    private Long userId;
    private String userName;
    private String emojiCode;
    private Instant createdAt;

    public static MessageReactionDto fromEntity(MessageReaction r) {
        return MessageReactionDto.builder()
                .id(r.getId())
                .messageId(r.getMessage().getId())
                .userId(r.getUser().getId())
                .userName(r.getUser().getFirstName() + " " + r.getUser().getLastName())
                .emojiCode(r.getEmojiCode())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
