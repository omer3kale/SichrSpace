package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ApartmentMatchDto;
import com.sichrplace.backend.dto.ApplicantMatchDto;
import com.sichrplace.backend.service.SmartMatchingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * FTL-22 — Smart matching endpoints.
 * Tenant: personalised apartment recommendations.
 * Landlord: ranked applicant comparison for an apartment.
 */
@RestController
@RequestMapping("/api/matching")
@RequiredArgsConstructor
@Tag(name = "Smart Matching", description = "Personalised apartment recommendations")
@SecurityRequirement(name = "bearerAuth")
public class MatchingController {

    private final SmartMatchingService smartMatchingService;

    @GetMapping("/apartments-for-me")
    @PreAuthorize("hasRole('TENANT')")
    @Operation(summary = "Get personalised apartment recommendations for the authenticated tenant")
    public ResponseEntity<List<ApartmentMatchDto>> getApartmentsForMe(
            @RequestParam(defaultValue = "20") int limit) {
        Long tenantId = currentUserId();
        List<ApartmentMatchDto> matches = smartMatchingService.matchApartmentsForTenant(
                tenantId, Math.min(limit, 100));
        return ResponseEntity.ok(matches);
    }

    @GetMapping("/applicants/{apartmentId}")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Compare and rank applicants for an apartment (landlord view)")
    public ResponseEntity<List<ApplicantMatchDto>> compareApplicants(
            @PathVariable Long apartmentId) {
        Long landlordId = currentUserId();
        List<ApplicantMatchDto> ranked = smartMatchingService.compareApplicants(apartmentId, landlordId);
        return ResponseEntity.ok(ranked);
    }

    @GetMapping("/success-rate")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Matching success rate — accepted bookings / total recommended")
    public ResponseEntity<Map<String, Object>> matchingSuccessRate() {
        Long landlordId = currentUserId();
        Map<String, Object> stats = smartMatchingService.getMatchingSuccessRate(landlordId);
        return ResponseEntity.ok(stats);
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }
}
