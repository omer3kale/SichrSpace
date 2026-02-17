package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.Message;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageDto {
    private Long id;
    private Long conversationId;
    private Long senderId;
    private String senderName;
    private String senderImageUrl;
    private String content;
    private String messageType;
    private Boolean readByRecipient;
    private Instant readAt;
    private String fileUrl;
    private String fileName;
    private Integer fileSize;
    private Boolean isDeleted;
    private Instant editedAt;
    private Instant createdAt;

    public static MessageDto fromEntity(Message m) {
        return MessageDto.builder()
                .id(m.getId())
                .conversationId(m.getConversation().getId())
                .senderId(m.getSender().getId())
                .senderName(m.getSender().getFirstName() + " " + m.getSender().getLastName())
                .senderImageUrl(m.getSender().getProfileImageUrl())
                .content(m.getIsDeleted() ? "[Message deleted]" : m.getContent())
                .messageType(m.getMessageType().name())
                .readByRecipient(m.getReadByRecipient())
                .readAt(m.getReadAt())
                .fileUrl(m.getIsDeleted() ? null : m.getFileUrl())
                .fileName(m.getIsDeleted() ? null : m.getFileName())
                .fileSize(m.getFileSize())
                .isDeleted(m.getIsDeleted())
                .editedAt(m.getEditedAt())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
