package com.sichrplace.backend.dto;

import lombok.*;

import java.util.List;

/**
 * Summary of a user's viewing credits: active pack (if any) + full history.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewingCreditSummaryDto {

    /** The active (usable) pack, null if none. */
    private ViewingCreditDto activePack;

    /** Total credits remaining across all active packs. */
    private int totalCreditsRemaining;

    /** Total credits ever used. */
    private long totalCreditsUsed;

    /** All packs (newest first). */
    private List<ViewingCreditDto> history;
}
