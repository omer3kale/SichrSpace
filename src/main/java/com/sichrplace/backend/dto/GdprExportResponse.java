package com.sichrplace.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Response body for GDPR export endpoints.
 */
@Data
@Builder
public class GdprExportResponse {

    private Long jobId;
    private Long userId;
    private String status;
    private String downloadToken;
    private Instant expiresAt;
    private Instant completedAt;
    private Instant requestedAt;
}
