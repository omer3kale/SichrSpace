package com.sichrplace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * FTL-23 — Public-facing feature flags response.
 * Each flag key maps to a boolean indicating whether the feature is active.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeatureFlagsDto {

    private Map<String, Boolean> flags;
}
