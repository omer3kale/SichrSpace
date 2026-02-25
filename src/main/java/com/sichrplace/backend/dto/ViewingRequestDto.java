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
    private String questions;
    private String attentionPoints;
    private String status;
    private LocalDateTime respondedAt;
    private LocalDateTime confirmedDateTime;
    private String declineReason;
    private Instant createdAt;
    private Instant updatedAt;
    private Boolean paymentRequired;
    private String paymentStatus;
    private Long videoId;
    private boolean hasVideo;

    public static ViewingRequestDto fromEntity(ViewingRequest request) {
        String tenantName = request.getTenant().getFirstName() + " " + request.getTenant().getLastName();
        String paymentStatus = request.getPaymentTransaction() != null
                ? request.getPaymentTransaction().getStatus().name()
                : null;
        return ViewingRequestDto.builder()
                .id(request.getId())
                .apartmentId(request.getApartment().getId())
                .apartmentTitle(request.getApartment().getTitle())
                .tenantId(request.getTenant().getId())
                .tenantName(tenantName)
                .proposedDateTime(request.getProposedDateTime())
                .message(request.getMessage())
                .questions(request.getQuestions())
                .attentionPoints(request.getAttentionPoints())
                .status(request.getStatus().name())
                .respondedAt(request.getRespondedAt())
                .confirmedDateTime(request.getConfirmedDateTime())
                .declineReason(request.getDeclineReason())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .paymentRequired(request.isPaymentRequired())
                .paymentStatus(paymentStatus)
                .videoId(request.getVideo() != null ? request.getVideo().getId() : null)
                .hasVideo(request.getVideo() != null)
                .build();
    }
}
