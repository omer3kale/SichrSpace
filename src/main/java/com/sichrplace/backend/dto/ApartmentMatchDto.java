package com.sichrplace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * FTL-22 — A scored apartment recommendation for a tenant.
 * Score 0–100, higher is better. Includes human-readable reasons.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApartmentMatchDto {

    private Long apartmentId;
    private int score;
    private List<String> reasons;

    /** Compact card data for the matched apartment. */
    private ApartmentSearchCardDto card;
}
