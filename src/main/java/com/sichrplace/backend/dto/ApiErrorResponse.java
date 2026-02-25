package com.sichrplace.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiErrorResponse {
    private int status;
    private String error;
    private String message;
    /** Machine-readable error code for client-side error handling, e.g. USER_EMAIL_ALREADY_EXISTS, DB_DEADLOCK. */
    private String errorCode;
    private String path;
    private Instant timestamp;
    private Map<String, String> fieldErrors;
}
