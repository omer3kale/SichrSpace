package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.BookingRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingRequestDto {

    private Long id;
    private Long apartmentId;
    private String apartmentTitle;
    private Long tenantId;
    private String tenantName;
    private Long landlordId;

    private LocalDate preferredMoveIn;
    private LocalDate preferredMoveOut;
    private boolean wouldExtendLater;

    private String adultsJson;
    private String childrenJson;
    private String petsJson;

    private String reasonType;
    private String institution;
    private String payer;
    private String detailedReason;

    private String status;
    private String declineReason;
    private Instant createdAt;
    private Instant updatedAt;

    public static BookingRequestDto fromEntity(BookingRequest br) {
        return BookingRequestDto.builder()
                .id(br.getId())
                .apartmentId(br.getApartment().getId())
                .apartmentTitle(br.getApartment().getTitle())
                .tenantId(br.getTenant().getId())
                .tenantName(br.getTenant().getFirstName() + " " + br.getTenant().getLastName())
                .landlordId(br.getLandlord().getId())
                .preferredMoveIn(br.getPreferredMoveIn())
                .preferredMoveOut(br.getPreferredMoveOut())
                .wouldExtendLater(br.isWouldExtendLater())
                .adultsJson(br.getAdultsJson())
                .childrenJson(br.getChildrenJson())
                .petsJson(br.getPetsJson())
                .reasonType(br.getReasonType() != null ? br.getReasonType().name() : null)
                .institution(br.getInstitution())
                .payer(br.getPayer() != null ? br.getPayer().name() : null)
                .detailedReason(br.getDetailedReason())
                .status(br.getStatus().name())
                .declineReason(br.getDeclineReason())
                .createdAt(br.getCreatedAt())
                .updatedAt(br.getUpdatedAt())
                .build();
    }
}
