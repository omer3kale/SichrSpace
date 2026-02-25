package com.sichrplace.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request body for the {@code POST /api/auth/refresh} endpoint.
 */
@Data
public class RefreshTokenRequest {

    @NotBlank(message = "Refresh token must not be blank")
    private String refreshToken;

    /** Optional device info forwarded from the client (will be truncated server-side). */
    private String deviceInfo;
}
