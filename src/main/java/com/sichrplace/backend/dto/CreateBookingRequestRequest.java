package com.sichrplace.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateBookingRequestRequest {

    @NotNull(message = "Preferred move-in date is required")
    private LocalDate preferredMoveIn;

    private LocalDate preferredMoveOut;

    private boolean wouldExtendLater;

    /** JSON array of adults: [{name, relationToApplicant}]. */
    @Size(max = 5000, message = "Adults JSON must not exceed 5000 characters")
    private String adultsJson;

    /** JSON array of children age categories. */
    @Size(max = 2000, message = "Children JSON must not exceed 2000 characters")
    private String childrenJson;

    /** JSON array of pet types. */
    @Size(max = 2000, message = "Pets JSON must not exceed 2000 characters")
    private String petsJson;

    /** WORK, STUDY, TEMPORARY_STAY, APPRENTICESHIP, INTERNSHIP */
    private String reasonType;

    @Size(max = 255, message = "Institution must not exceed 255 characters")
    private String institution;

    /** MYSELF, FAMILY, SCHOLARSHIP, COMPANY */
    private String payer;

    @Size(max = 5000, message = "Detailed reason must not exceed 5000 characters")
    private String detailedReason;
}
