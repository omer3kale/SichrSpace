package com.sichrplace.backend.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeclineRequest {
    @Size(max = 1000, message = "Decline reason must not exceed 1000 characters")
    private String reason;
}
