package com.sichrplace.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request body for {@code POST /api/gdpr/consent}.
 */
@Data
public class ConsentRequest {

    /** e.g. "MARKETING", "ANALYTICS" */
    @NotBlank(message = "consentType must not be blank")
    private String consentType;

    /** {@code true} = user gives consent, {@code false} = user withdraws consent. */
    private boolean granted;

    /** Optional anonymous session id for pre-account flows. */
    private String anonSessionId;
}
