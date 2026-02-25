package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.ConversationReport;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationReportDto {
    private Long id;
    private Long conversationId;
    private Long reporterId;
    private String reporterName;
    private String reason;
    private String status;
    private Instant createdAt;
    private Instant resolvedAt;
    private Long resolvedById;
    private String resolvedByName;

    public static ConversationReportDto fromEntity(ConversationReport r) {
        var builder = ConversationReportDto.builder()
                .id(r.getId())
                .conversationId(r.getConversation().getId())
                .reporterId(r.getReporter().getId())
                .reporterName(r.getReporter().getFirstName() + " " + r.getReporter().getLastName())
                .reason(r.getReason())
                .status(r.getStatus().name())
                .createdAt(r.getCreatedAt())
                .resolvedAt(r.getResolvedAt());

        if (r.getResolvedBy() != null) {
            builder.resolvedById(r.getResolvedBy().getId())
                    .resolvedByName(r.getResolvedBy().getFirstName() + " " + r.getResolvedBy().getLastName());
        }

        return builder.build();
    }
}
