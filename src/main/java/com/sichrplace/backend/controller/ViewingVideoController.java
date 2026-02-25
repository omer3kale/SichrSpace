package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.*;
import com.sichrplace.backend.service.ViewingVideoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;

@RestController
@RequestMapping("/api/videos")
@RequiredArgsConstructor
@Tag(name = "Viewing Videos", description = "Dissolving video management for property viewings")
@SecurityRequirement(name = "bearerAuth")
public class ViewingVideoController {

    private final ViewingVideoService viewingVideoService;

    // ─── Upload ───────────────────────────────────────────────────────────────────

    @PostMapping(value = "/upload/{apartmentId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Upload a viewing video for an apartment")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Video uploaded"),
            @ApiResponse(responseCode = "400", description = "Invalid file or request",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Not apartment owner",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<ViewingVideoDto> uploadVideo(
            @PathVariable Long apartmentId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "notes", required = false) String notes,
            @RequestParam(value = "viewingRequestId", required = false) Long viewingRequestId) {
        Long userId = getCurrentUserId();
        ViewingVideoDto response = viewingVideoService.uploadVideo(
                userId, apartmentId, viewingRequestId, title, notes, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ─── Send to Tenant ───────────────────────────────────────────────────────────

    @PostMapping("/{videoId}/send")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Send a dissolving video link to a tenant")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Video link sent"),
            @ApiResponse(responseCode = "404", description = "Video or tenant not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Not video owner",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<VideoAccessLinkDto> sendVideoToTenant(
            @PathVariable Long videoId,
            @Valid @RequestBody VideoSendRequest request) {
        Long userId = getCurrentUserId();
        VideoAccessLinkDto response = viewingVideoService.sendVideoToTenant(
                videoId, request.getTenantId(), userId);
        return ResponseEntity.ok(response);
    }

    // ─── Stream (public, token-authenticated) ─────────────────────────────────────

    @GetMapping("/stream/{token}")
    @Operation(summary = "Stream a video via dissolving link token (no auth required)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Video stream"),
            @ApiResponse(responseCode = "400", description = "Invalid or expired token",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "410", description = "Video no longer available",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<Resource> streamVideo(
            @PathVariable String token,
            HttpServletRequest request) {
        String ipHash = hashIp(request.getRemoteAddr());
        String userAgent = request.getHeader("User-Agent");

        Resource videoResource = viewingVideoService.streamVideo(token, ipHash, userAgent);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("video/mp4"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                // Prevent download
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate")
                .body(videoResource);
    }

    // ─── Watch Time Analytics (public, token-authenticated) ───────────────────────

    @PostMapping("/analytics")
    @Operation(summary = "Record watch time analytics via beacon (no auth required)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Watch time recorded"),
            @ApiResponse(responseCode = "400", description = "Invalid token",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<Void> recordWatchTime(@Valid @RequestBody VideoAnalyticsRequest request) {
        viewingVideoService.recordWatchTime(request.getToken(), request.getWatchDurationSeconds());
        return ResponseEntity.noContent().build();
    }

    // ─── Get Video by ID ──────────────────────────────────────────────────────────

    @GetMapping("/{videoId}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Get video details with access links")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Video details"),
            @ApiResponse(responseCode = "404", description = "Video not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<ViewingVideoDto> getVideoById(@PathVariable Long videoId) {
        Long userId = getCurrentUserId();
        ViewingVideoDto response = viewingVideoService.getVideoById(videoId, userId);
        return ResponseEntity.ok(response);
    }

    // ─── List by Viewing Request ──────────────────────────────────────────────────

    @GetMapping("/viewing-request/{viewingRequestId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List videos for a viewing request")
    public ResponseEntity<List<ViewingVideoDto>> getVideosByViewingRequest(
            @PathVariable Long viewingRequestId) {
        Long userId = getCurrentUserId();
        List<ViewingVideoDto> response = viewingVideoService.getVideosByViewingRequest(viewingRequestId, userId);
        return ResponseEntity.ok(response);
    }

    // ─── List by Apartment ────────────────────────────────────────────────────────

    @GetMapping("/apartment/{apartmentId}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "List all videos for an apartment (owner only)")
    public ResponseEntity<Page<ViewingVideoDto>> getVideosByApartment(
            @PathVariable Long apartmentId, Pageable pageable) {
        Long userId = getCurrentUserId();
        Page<ViewingVideoDto> response = viewingVideoService.getVideosByApartment(apartmentId, userId, pageable);
        return ResponseEntity.ok(response);
    }

    // ─── Delete ───────────────────────────────────────────────────────────────────

    @DeleteMapping("/{videoId}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Delete a video and revoke all access links")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Video deleted"),
            @ApiResponse(responseCode = "404", description = "Video not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<Void> deleteVideo(@PathVariable Long videoId) {
        Long userId = getCurrentUserId();
        viewingVideoService.deleteVideo(videoId, userId);
        return ResponseEntity.noContent().build();
    }

    // ─── Revoke Link ──────────────────────────────────────────────────────────────

    @PostMapping("/links/{linkId}/revoke")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Revoke a specific access link")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Link revoked"),
            @ApiResponse(responseCode = "404", description = "Link not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<Void> revokeLink(@PathVariable Long linkId) {
        Long userId = getCurrentUserId();
        viewingVideoService.revokeLink(linkId, userId);
        return ResponseEntity.noContent().build();
    }

    // ─── Access Logs ──────────────────────────────────────────────────────────────

    @GetMapping("/{videoId}/logs")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Get access logs for a video")
    public ResponseEntity<List<VideoAccessLogDto>> getAccessLogs(@PathVariable Long videoId) {
        Long userId = getCurrentUserId();
        List<VideoAccessLogDto> response = viewingVideoService.getAccessLogs(videoId, userId);
        return ResponseEntity.ok(response);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────────

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }

    private String hashIp(String ipAddress) {
        if (ipAddress == null) return "unknown";
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(ipAddress.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            return "hash-error";
        }
    }
}
