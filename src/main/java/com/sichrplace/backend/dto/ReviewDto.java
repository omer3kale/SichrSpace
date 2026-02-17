package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.ApartmentReview;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewDto {
    private Long id;
    private Long apartmentId;
    private String apartmentTitle;
    private Long reviewerId;
    private String reviewerName;
    private Integer rating;
    private String title;
    private String comment;
    private String pros;
    private String cons;
    private Boolean wouldRecommend;
    private Integer landlordRating;
    private Integer locationRating;
    private Integer valueRating;
    private String status;
    private String moderationNotes;
    private Instant createdAt;
    private Instant updatedAt;

    public static ReviewDto fromEntity(ApartmentReview review) {
        String reviewerName = review.getReviewer().getFirstName() + " " + review.getReviewer().getLastName();
        return ReviewDto.builder()
                .id(review.getId())
                .apartmentId(review.getApartment().getId())
                .apartmentTitle(review.getApartment().getTitle())
                .reviewerId(review.getReviewer().getId())
                .reviewerName(reviewerName)
                .rating(review.getRating())
                .title(review.getTitle())
                .comment(review.getComment())
                .pros(review.getPros())
                .cons(review.getCons())
                .wouldRecommend(review.getWouldRecommend())
                .landlordRating(review.getLandlordRating())
                .locationRating(review.getLocationRating())
                .valueRating(review.getValueRating())
                .status(review.getStatus().name())
                .moderationNotes(review.getModerationNotes())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}
