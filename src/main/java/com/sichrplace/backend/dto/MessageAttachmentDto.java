package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.MessageAttachment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageAttachmentDto {
    private Long id;
    private Long messageId;
    private String filename;
    private String contentType;
    private Long sizeBytes;
    private String storageUrl;
    private Instant createdAt;

    public static MessageAttachmentDto fromEntity(MessageAttachment a) {
        return MessageAttachmentDto.builder()
                .id(a.getId())
                .messageId(a.getMessage().getId())
                .filename(a.getFilename())
                .contentType(a.getContentType())
                .sizeBytes(a.getSizeBytes())
                .storageUrl(a.getStorageUrl())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
