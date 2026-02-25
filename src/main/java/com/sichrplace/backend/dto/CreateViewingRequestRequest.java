package com.sichrplace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateViewingRequestRequest {
    @NotNull(message = "Apartment ID is required")
    private Long apartmentId;

    @NotNull(message = "Proposed date/time is required")
    @FutureOrPresent(message = "Proposed date/time must be in the future")
    private LocalDateTime proposedDateTime;

    @Size(max = 1000, message = "Message must not exceed 1000 characters")
    private String message;

    /** Optional open-ended questions for the landlord/company. */
    @Size(max = 2000, message = "Questions must not exceed 2000 characters")
    private String questions;

    /** Points the tenant wants to pay special attention to during the viewing. */
    @Size(max = 2000, message = "Attention points must not exceed 2000 characters")
    private String attentionPoints;
}
