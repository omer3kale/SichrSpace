package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDto {
    private Long id;
    private String type;
    private String title;
    private String message;
    private String relatedEntityType;
    private Long relatedEntityId;
    private Instant readAt;
    private String actionUrl;
    private String priority;
    private Instant createdAt;

    public static NotificationDto fromEntity(Notification n) {
        return NotificationDto.builder()
                .id(n.getId())
                .type(n.getType().name())
                .title(n.getTitle())
                .message(n.getMessage())
                .relatedEntityType(n.getRelatedEntityType())
                .relatedEntityId(n.getRelatedEntityId())
                .readAt(n.getReadAt())
                .actionUrl(n.getActionUrl())
                .priority(n.getPriority().name())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
