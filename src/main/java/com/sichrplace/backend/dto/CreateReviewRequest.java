package com.sichrplace.backend.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateReviewRequest {

    private Long apartmentId;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must not exceed 5")
    private Integer rating;

    @NotBlank(message = "Title is required")
    @Size(min = 3, max = 100, message = "Title must be between 3 and 100 characters")
    private String title;

    @NotBlank(message = "Comment is required")
    @Size(min = 10, max = 2000, message = "Comment must be between 10 and 2000 characters")
    private String comment;

    @Size(max = 1000, message = "Pros must not exceed 1000 characters")
    private String pros;

    @Size(max = 1000, message = "Cons must not exceed 1000 characters")
    private String cons;

    private Boolean wouldRecommend;

    @Min(value = 1, message = "Landlord rating must be at least 1")
    @Max(value = 5, message = "Landlord rating must not exceed 5")
    private Integer landlordRating;

    @Min(value = 1, message = "Location rating must be at least 1")
    @Max(value = 5, message = "Location rating must not exceed 5")
    private Integer locationRating;

    @Min(value = 1, message = "Value rating must be at least 1")
    @Max(value = 5, message = "Value rating must not exceed 5")
    private Integer valueRating;
}
