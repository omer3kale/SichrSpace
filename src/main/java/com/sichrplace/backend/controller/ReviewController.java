package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.CreateReviewRequest;
import com.sichrplace.backend.dto.ModerateReviewRequest;
import com.sichrplace.backend.dto.ReviewDto;
import com.sichrplace.backend.dto.ReviewStatsDto;
import com.sichrplace.backend.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Tag(name = "Reviews", description = "Apartment reviews and ratings")
public class ReviewController {

    private final ReviewService reviewService;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }

    // ── Public Endpoints ──

    @GetMapping("/apartment/{apartmentId}")
    @Operation(summary = "Get approved reviews for an apartment (public)")
    public ResponseEntity<Page<ReviewDto>> getApartmentReviews(
            @PathVariable Long apartmentId, Pageable pageable) {
        return ResponseEntity.ok(reviewService.getApprovedReviewsForApartment(apartmentId, pageable));
    }

    @GetMapping("/apartment/{apartmentId}/stats")
    @Operation(summary = "Get review statistics for an apartment (public)")
    public ResponseEntity<ReviewStatsDto> getReviewStats(@PathVariable Long apartmentId) {
        return ResponseEntity.ok(reviewService.getReviewStats(apartmentId));
    }

    // ── Authenticated Endpoints ──

    @PostMapping("/apartment/{apartmentId}")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Submit a review for an apartment")
    public ResponseEntity<ReviewDto> createReview(
            @PathVariable Long apartmentId,
            @Valid @RequestBody CreateReviewRequest request) {
        ReviewDto dto = reviewService.createReview(getCurrentUserId(), apartmentId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @RequestMapping(path = "/{reviewId}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Update your review (resets to pending)")
    public ResponseEntity<ReviewDto> updateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody CreateReviewRequest request) {
        return ResponseEntity.ok(reviewService.updateReview(getCurrentUserId(), reviewId, request));
    }

    @DeleteMapping("/{reviewId}")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Delete your review")
    public ResponseEntity<Void> deleteReview(@PathVariable Long reviewId) {
        reviewService.deleteReview(getCurrentUserId(), reviewId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get reviews submitted by current user")
    public ResponseEntity<Page<ReviewDto>> getMyReviews(Pageable pageable) {
        return ResponseEntity.ok(reviewService.getReviewsByReviewer(getCurrentUserId(), pageable));
    }

    // ── Admin Moderation ──

    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get pending reviews (admin only)")
    public ResponseEntity<Page<ReviewDto>> getPendingReviews(Pageable pageable) {
        return ResponseEntity.ok(reviewService.getPendingReviews(pageable));
    }

    @PostMapping("/{reviewId}/moderate")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Approve or reject a review (admin only)")
    public ResponseEntity<ReviewDto> moderateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody ModerateReviewRequest request) {
        return ResponseEntity.ok(reviewService.moderateReview(getCurrentUserId(), reviewId, request));
    }
}
