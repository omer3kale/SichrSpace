package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.CreateReviewRequest;
import com.sichrplace.backend.dto.ModerateReviewRequest;
import com.sichrplace.backend.dto.ReviewDto;
import com.sichrplace.backend.dto.ReviewStatsDto;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.ApartmentReview;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.ApartmentReviewRepository;
import com.sichrplace.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ApartmentReviewRepository reviewRepository;
    private final ApartmentRepository apartmentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public ReviewDto createReview(Long reviewerId, Long apartmentId, CreateReviewRequest request) {
        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        // Prevent landlord from reviewing own apartment
        if (apartment.getOwner().getId().equals(reviewerId)) {
            throw new IllegalStateException("Cannot review your own apartment");
        }

        // Prevent duplicate reviews
        if (reviewRepository.existsByApartmentIdAndReviewerId(apartmentId, reviewerId)) {
            throw new IllegalStateException("You have already reviewed this apartment");
        }

        ApartmentReview review = new ApartmentReview();
        review.setApartment(apartment);
        review.setReviewer(reviewer);
        review.setRating(request.getRating());
        review.setTitle(request.getTitle());
        review.setComment(request.getComment());
        review.setLandlordRating(request.getLandlordRating());
        review.setLocationRating(request.getLocationRating());
        review.setValueRating(request.getValueRating());
        review.setStatus(ApartmentReview.ReviewStatus.PENDING);

        ApartmentReview saved = reviewRepository.save(review);
        log.info("User {} created review for apartment {} (pending moderation)", reviewerId, apartmentId);

        // Notify admins about pending review
        notificationService.createNotification(
                null, // no specific user — admin broadcast handled by null check
                com.sichrplace.backend.model.Notification.NotificationType.REVIEW_SUBMITTED,
                "New Review Pending",
                "A new review for \"" + apartment.getTitle() + "\" requires moderation.",
                com.sichrplace.backend.model.Notification.NotificationPriority.NORMAL,
                "/admin/reviews"
        );

        return ReviewDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public ReviewDto updateReview(Long reviewerId, Long reviewId, CreateReviewRequest request) {
        ApartmentReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));

        if (!review.getReviewer().getId().equals(reviewerId)) {
            throw new SecurityException("Not authorized to edit this review");
        }

        review.setRating(request.getRating());
        review.setTitle(request.getTitle());
        review.setComment(request.getComment());
        review.setLandlordRating(request.getLandlordRating());
        review.setLocationRating(request.getLocationRating());
        review.setValueRating(request.getValueRating());
        // Reset to pending after edit
        review.setStatus(ApartmentReview.ReviewStatus.PENDING);
        review.setModerationNotes(null);
        review.setModeratedBy(null);

        ApartmentReview saved = reviewRepository.save(review);
        log.info("User {} updated review {} (reset to pending)", reviewerId, reviewId);
        return ReviewDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public void deleteReview(Long userId, Long reviewId) {
        ApartmentReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));

        if (!review.getReviewer().getId().equals(userId)) {
            throw new SecurityException("Not authorized to delete this review");
        }

        reviewRepository.delete(review);
        log.info("User {} deleted review {}", userId, reviewId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewDto> getApprovedReviewsForApartment(Long apartmentId, Pageable pageable) {
        return reviewRepository.findByApartmentIdAndStatus(
                apartmentId, ApartmentReview.ReviewStatus.APPROVED, pageable
        ).map(ReviewDto::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewDto> getReviewsByReviewer(Long reviewerId, Pageable pageable) {
        return reviewRepository.findByReviewerId(reviewerId, pageable)
                .map(ReviewDto::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewStatsDto getReviewStats(Long apartmentId) {
        long totalReviews = reviewRepository.findByApartmentIdAndStatus(
                apartmentId, ApartmentReview.ReviewStatus.APPROVED,
                Pageable.unpaged()).getTotalElements();

        if (totalReviews == 0) {
            return ReviewStatsDto.builder()
                    .apartmentId(apartmentId)
                    .averageRating(0.0)
                    .totalReviews(0)
                    .fiveStarCount(0)
                    .fourStarCount(0)
                    .threeStarCount(0)
                    .twoStarCount(0)
                    .oneStarCount(0)
                    .averageLandlordRating(0.0)
                    .averageLocationRating(0.0)
                    .averageValueRating(0.0)
                    .build();
        }

        Double avgRating = reviewRepository.findAverageRatingByApartmentId(apartmentId);
        Double avgLandlord = reviewRepository.findAverageLandlordRatingByApartmentId(apartmentId);
        Double avgLocation = reviewRepository.findAverageLocationRatingByApartmentId(apartmentId);
        Double avgValue = reviewRepository.findAverageValueRatingByApartmentId(apartmentId);

        return ReviewStatsDto.builder()
                .apartmentId(apartmentId)
                .averageRating(avgRating != null ? avgRating : 0.0)
                .totalReviews((int) totalReviews)
                .fiveStarCount((int) reviewRepository.countByApartmentIdAndRating(apartmentId, 5))
                .fourStarCount((int) reviewRepository.countByApartmentIdAndRating(apartmentId, 4))
                .threeStarCount((int) reviewRepository.countByApartmentIdAndRating(apartmentId, 3))
                .twoStarCount((int) reviewRepository.countByApartmentIdAndRating(apartmentId, 2))
                .oneStarCount((int) reviewRepository.countByApartmentIdAndRating(apartmentId, 1))
                .averageLandlordRating(avgLandlord != null ? avgLandlord : 0.0)
                .averageLocationRating(avgLocation != null ? avgLocation : 0.0)
                .averageValueRating(avgValue != null ? avgValue : 0.0)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewDto> getPendingReviews(Pageable pageable) {
        return reviewRepository.findByStatus(ApartmentReview.ReviewStatus.PENDING, pageable)
                .map(ReviewDto::fromEntity);
    }

    @Override
    @Transactional
    public ReviewDto moderateReview(Long adminId, Long reviewId, ModerateReviewRequest request) {
        ApartmentReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));

        ApartmentReview.ReviewStatus newStatus = ApartmentReview.ReviewStatus.valueOf(request.getAction());
        review.setStatus(newStatus);
        review.setModerationNotes(request.getNotes());
        review.setModeratedBy(admin);

        ApartmentReview saved = reviewRepository.save(review);
        log.info("Admin {} moderated review {} → {}", adminId, reviewId, newStatus);

        // Notify the reviewer
        String notifTitle = newStatus == ApartmentReview.ReviewStatus.APPROVED
                ? "Review Approved" : "Review Rejected";
        String notifMessage = newStatus == ApartmentReview.ReviewStatus.APPROVED
                ? "Your review has been approved and is now visible."
                : "Your review was not approved. " +
                  (request.getNotes() != null ? "Reason: " + request.getNotes() : "");

        notificationService.createNotification(
                review.getReviewer().getId(),
                com.sichrplace.backend.model.Notification.NotificationType.REVIEW_MODERATED,
                notifTitle, notifMessage,
                com.sichrplace.backend.model.Notification.NotificationPriority.NORMAL,
                "/my-reviews"
        );

        return ReviewDto.fromEntity(saved);
    }
}
