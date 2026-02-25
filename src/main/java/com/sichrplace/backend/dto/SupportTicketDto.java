package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.SupportTicket;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportTicketDto {

    private Long id;
    private Long userId;
    private String subject;
    private String message;
    private String category;
    private String status;
    private String adminResponse;
    private Long resolvedBy;
    private Instant createdAt;
    private Instant updatedAt;

    public static SupportTicketDto fromEntity(SupportTicket ticket) {
        return SupportTicketDto.builder()
                .id(ticket.getId())
                .userId(ticket.getUser().getId())
                .subject(ticket.getSubject())
                .message(ticket.getMessage())
                .category(ticket.getCategory().name())
                .status(ticket.getStatus().name())
                .adminResponse(ticket.getAdminResponse())
                .resolvedBy(ticket.getResolvedBy())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .build();
    }
}
