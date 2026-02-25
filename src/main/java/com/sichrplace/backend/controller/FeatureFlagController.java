package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.FeatureFlagsDto;
import com.sichrplace.backend.service.FeatureFlagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FTL-23 — Public feature-flags endpoint.
 * Returns a map of feature keys → booleans so the frontend can conditionally show/hide UI.
 */
@RestController
@RequestMapping("/api/feature-flags")
@RequiredArgsConstructor
@Tag(name = "Feature Flags", description = "Platform feature toggles")
public class FeatureFlagController {

    private final FeatureFlagService featureFlagService;

    @GetMapping
    @Operation(summary = "Get all feature flags (public)")
    public ResponseEntity<FeatureFlagsDto> getFlags() {
        return ResponseEntity.ok(featureFlagService.getFlags());
    }
}
