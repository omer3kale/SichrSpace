package com.sichrplace.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateSupportTicketRequest {

    @NotBlank(message = "Subject is required")
    @Size(max = 255, message = "Subject must be at most 255 characters")
    private String subject;

    @NotBlank(message = "Message is required")
    @Size(max = 5000, message = "Message must be at most 5000 characters")
    private String message;

    /** Optional: GENERAL, PAYMENT, LISTING, ACCOUNT, VIEWING, BOOKING, TECHNICAL */
    private String category;
}
