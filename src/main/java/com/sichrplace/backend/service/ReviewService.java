package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.CreateReviewRequest;
import com.sichrplace.backend.dto.ModerateReviewRequest;
import com.sichrplace.backend.dto.ReviewDto;
import com.sichrplace.backend.dto.ReviewStatsDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ReviewService {

    ReviewDto createReview(Long reviewerId, Long apartmentId, CreateReviewRequest request);

    ReviewDto updateReview(Long reviewerId, Long reviewId, CreateReviewRequest request);

    void deleteReview(Long userId, Long reviewId);

    Page<ReviewDto> getApprovedReviewsForApartment(Long apartmentId, Pageable pageable);

    Page<ReviewDto> getReviewsByReviewer(Long reviewerId, Pageable pageable);

    ReviewStatsDto getReviewStats(Long apartmentId);

    // Admin / Moderation
    Page<ReviewDto> getPendingReviews(Pageable pageable);

    ReviewDto moderateReview(Long adminId, Long reviewId, ModerateReviewRequest request);
}
