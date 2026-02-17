package com.sichrplace.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateConversationRequest {

    @NotNull(message = "Participant ID is required")
    private Long participantId;

    private Long apartmentId;

    @Size(max = 5000, message = "Message must not exceed 5000 characters")
    private String initialMessage;
}
