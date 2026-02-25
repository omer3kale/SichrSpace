package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ApiErrorResponse;
import com.sichrplace.backend.dto.ConsentRequest;
import com.sichrplace.backend.dto.GdprExportResponse;
import com.sichrplace.backend.model.GdprConsentLog;
import com.sichrplace.backend.service.GdprService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gdpr")
@RequiredArgsConstructor
@Tag(name = "GDPR", description = "Data portability, erasure, and consent endpoints (GDPR Art. 7, 17, 20)")
public class GdprController {

    private final GdprService gdprService;

    // -----------------------------------------------------------------------
    // Data export (Art. 20)
    // -----------------------------------------------------------------------

    @PostMapping("/me/export")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Queue a personal data export", description = "Creates an async export job. Poll /status to check readiness.")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Export job queued"),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<GdprExportResponse> requestExport() {
        Long userId = authenticatedUserId();
        GdprExportResponse response = gdprService.queueExport(userId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/me/export/{jobId}/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Check the status of a data export job")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Export job status"),
            @ApiResponse(responseCode = "404", description = "Job not found or not owned by caller",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<GdprExportResponse> getExportStatus(@PathVariable Long jobId) {
        Long userId = authenticatedUserId();
        GdprExportResponse response = gdprService.getExportStatus(jobId, userId);
        return ResponseEntity.ok(response);
    }

    // -----------------------------------------------------------------------
    // Right to erasure (Art. 17)
    // -----------------------------------------------------------------------

    @DeleteMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Request deletion of all personal data",
            description = "Deactivates the account immediately; full purge runs within 30 days.")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Deletion scheduled"),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<Map<String, String>> requestDeletion() {
        Long userId = authenticatedUserId();
        gdprService.requestDeletion(userId);
        return ResponseEntity.ok(Map.of(
                "message", "Account deactivated. All personal data will be permanently deleted within 30 days."));
    }

    // -----------------------------------------------------------------------
    // Consent management (Art. 7)
    // -----------------------------------------------------------------------

    @PostMapping("/consent")
    @Operation(summary = "Record a consent decision", description = "Can be called before or after login.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Consent recorded"),
            @ApiResponse(responseCode = "400", description = "Validation error",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<Void> recordConsent(@Valid @RequestBody ConsentRequest request,
                                              HttpServletRequest httpRequest) {
        Long userId = optionalAuthenticatedUserId();
        String ipHash = sha256(remoteAddr(httpRequest));
        String uaHash = sha256(httpRequest.getHeader("User-Agent"));
        gdprService.logConsent(userId, request, ipHash, uaHash);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/consent-history")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Retrieve full consent history for the authenticated user")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Consent log"),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<List<GdprConsentLog>> getConsentHistory() {
        Long userId = authenticatedUserId();
        return ResponseEntity.ok(gdprService.getConsentHistory(userId));
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private Long authenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }

    private Long optionalAuthenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return (Long) auth.getPrincipal();
    }

    private static String remoteAddr(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }

    @SneakyThrows(java.security.NoSuchAlgorithmException.class)
    private static String sha256(String input) {
        if (input == null) return null;
        return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8)));
    }
}
