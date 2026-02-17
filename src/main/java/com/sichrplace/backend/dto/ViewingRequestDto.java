package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.ViewingRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewingRequestDto {
    private Long id;
    private Long apartmentId;
    private String apartmentTitle;
    private Long tenantId;
    private String tenantName;
    private LocalDateTime proposedDateTime;
    private String message;
    private String status;
    private LocalDateTime respondedAt;
    private LocalDateTime confirmedDateTime;
    private String declineReason;
    private Instant createdAt;
    private Instant updatedAt;

    public static ViewingRequestDto fromEntity(ViewingRequest request) {
        String tenantName = request.getTenant().getFirstName() + " " + request.getTenant().getLastName();
        return ViewingRequestDto.builder()
                .id(request.getId())
                .apartmentId(request.getApartment().getId())
                .apartmentTitle(request.getApartment().getTitle())
                .tenantId(request.getTenant().getId())
                .tenantName(tenantName)
                .proposedDateTime(request.getProposedDateTime())
                .message(request.getMessage())
                .status(request.getStatus().name())
                .respondedAt(request.getRespondedAt())
                .confirmedDateTime(request.getConfirmedDateTime())
                .declineReason(request.getDeclineReason())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }
}
