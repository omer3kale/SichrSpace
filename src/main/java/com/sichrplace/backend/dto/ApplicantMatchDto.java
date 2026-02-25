package com.sichrplace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Represents a ranked applicant comparison for a landlord reviewing booking requests.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicantMatchDto {

    private Long bookingRequestId;
    private int score;
    private List<String> reasons;

    /** Limited public profile of the applicant tenant. */
    private PublicProfileDto publicProfile;
}
