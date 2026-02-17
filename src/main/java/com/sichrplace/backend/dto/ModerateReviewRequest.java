package com.sichrplace.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModerateReviewRequest {

    @NotBlank(message = "Action is required (APPROVED or REJECTED)")
    @Pattern(regexp = "APPROVED|REJECTED", message = "Action must be APPROVED or REJECTED")
    private String action;

    @Size(max = 1000, message = "Notes must not exceed 1000 characters")
    private String notes;
}
