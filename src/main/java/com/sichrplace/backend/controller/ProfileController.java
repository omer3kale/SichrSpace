package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ApiErrorResponse;
import com.sichrplace.backend.dto.ProfileDto;
import com.sichrplace.backend.dto.ProfileRequest;
import com.sichrplace.backend.dto.PublicProfileDto;
import com.sichrplace.backend.service.FileStorageService;
import com.sichrplace.backend.service.ProfileService;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
@Tag(name = "Profiles", description = "Profile management: own profile (FTL-05/06) and public view (FTL-07)")
public class ProfileController {

    private final ProfileService profileService;
    private final FileStorageService fileStorageService;

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );
    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

    // ─── FTL-05 / FTL-06 ─────────────────────────────────────────────

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get the authenticated user's full profile including personality/habits and completionPercentage")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Full profile returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<ProfileDto> getMyProfile() {
        Long userId = authenticatedUserId();
        return ResponseEntity.ok(profileService.getMyProfile(userId));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update the authenticated user's profile (partial update — only non-null fields applied)")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Profile updated"),
            @ApiResponse(responseCode = "400", description = "Validation error",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<ProfileDto> updateMyProfile(@Valid @RequestBody ProfileRequest request) {
        Long userId = authenticatedUserId();
        return ResponseEntity.ok(profileService.updateMyProfile(userId, request));
    }

    // ─── FTL-07 ──────────────────────────────────────────────────────

    @GetMapping("/{userId}/public")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get a limited, privacy-safe public profile for another user")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Limited profile returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "User not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<PublicProfileDto> getPublicProfile(@PathVariable Long userId) {
        return ResponseEntity.ok(profileService.getPublicProfile(userId));
    }

    // ─── Profile Image Upload ────────────────────────────────────────

    @PostMapping(value = "/me/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload a profile image (JPEG, PNG, WebP, GIF; max 5 MB)")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Image uploaded, profile updated"),
            @ApiResponse(responseCode = "400", description = "Invalid file type or size",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<?> uploadProfileImage(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file provided"));
        }
        if (!ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "Invalid file type. Allowed: JPEG, PNG, WebP, GIF"));
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "File too large. Maximum size is 5 MB"));
        }

        Long userId = authenticatedUserId();
        String storagePath = fileStorageService.store(file, "profile-images");
        String imageUrl = "/api/profiles/me/image/" + storagePath.substring(storagePath.lastIndexOf('/') + 1);
        ProfileDto updated = profileService.updateProfileImage(userId, imageUrl);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/me/image/{filename}")
    @Operation(summary = "Serve a profile image by filename")
    public ResponseEntity<Resource> serveProfileImage(@PathVariable String filename) {
        Resource resource = fileStorageService.load("profile-images/" + filename);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(resource);
    }

    @DeleteMapping("/me/image")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Remove the authenticated user's profile image")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ProfileDto> deleteProfileImage() {
        Long userId = authenticatedUserId();
        return ResponseEntity.ok(profileService.updateProfileImage(userId, null));
    }

    // ─── util ────────────────────────────────────────────────────────

    private Long authenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }
}
