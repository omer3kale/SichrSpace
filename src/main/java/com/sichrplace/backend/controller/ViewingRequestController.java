package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ApiErrorResponse;
import com.sichrplace.backend.dto.CreateViewingRequestRequest;
import com.sichrplace.backend.dto.DeclineRequest;
import com.sichrplace.backend.dto.ViewingRequestDto;
import com.sichrplace.backend.service.ViewingRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/viewing-requests")
@RequiredArgsConstructor
@Tag(name = "Viewing Requests", description = "Viewing request operations")
@SecurityRequirement(name = "bearerAuth")
public class ViewingRequestController {

    private final ViewingRequestService viewingRequestService;

    @PostMapping
    @PreAuthorize("hasRole('TENANT')")
    @Operation(summary = "Create a new viewing request")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Viewing request created"),
            @ApiResponse(responseCode = "400", description = "Validation error or bad request",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Forbidden – not a tenant",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<ViewingRequestDto> createViewingRequest(
            @Valid @RequestBody CreateViewingRequestRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        ViewingRequestDto response = viewingRequestService.createViewingRequest(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get a viewing request by ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Viewing request details"),
            @ApiResponse(responseCode = "403", description = "Not authorized to view this request",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Viewing request not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<ViewingRequestDto> getViewingRequestById(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        ViewingRequestDto response = viewingRequestService.getViewingRequestById(id, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all viewing requests for the current user (tenant)")
    public ResponseEntity<List<ViewingRequestDto>> getMyViewingRequests() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        List<ViewingRequestDto> response = viewingRequestService.getViewingRequestsByTenant(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my/paged")
    @PreAuthorize("hasRole('TENANT')")
    @Operation(summary = "Get viewing requests for the current tenant (paged)")
    public ResponseEntity<Page<ViewingRequestDto>> getMyViewingRequestsPaged(
            @RequestParam(defaultValue = "PENDING") String status,
            Pageable pageable) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        ViewingRequestService.ViewingRequestStatus statusEnum =
                ViewingRequestService.ViewingRequestStatus.valueOf(status.toUpperCase());
        Page<ViewingRequestDto> response =
                viewingRequestService.getViewingRequestsByTenantPaged(userId, statusEnum, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/apartment/{apartmentId}")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Get viewing requests for a specific apartment")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of viewing requests"),
            @ApiResponse(responseCode = "403", description = "Not the apartment owner",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Apartment not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<List<ViewingRequestDto>> getViewingRequestsByApartment(
            @PathVariable Long apartmentId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        List<ViewingRequestDto> response =
                viewingRequestService.getViewingRequestsByApartment(apartmentId, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/apartment/{apartmentId}/paged")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Get viewing requests for a specific apartment (paged)")
    public ResponseEntity<Page<ViewingRequestDto>> getViewingRequestsByApartmentPaged(
            @PathVariable Long apartmentId,
            @RequestParam(defaultValue = "PENDING") String status,
            Pageable pageable) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        ViewingRequestService.ViewingRequestStatus statusEnum =
                ViewingRequestService.ViewingRequestStatus.valueOf(status.toUpperCase());
        Page<ViewingRequestDto> response =
                viewingRequestService.getViewingRequestsByApartmentPaged(apartmentId, userId, statusEnum, pageable);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/confirm")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Confirm a viewing request")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Viewing request confirmed"),
            @ApiResponse(responseCode = "403", description = "Not the apartment owner",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Request is not in PENDING state",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<ViewingRequestDto> confirmViewingRequest(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        ViewingRequestDto response = viewingRequestService.confirmViewingRequest(id, userId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/decline")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Decline a viewing request")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Viewing request declined"),
            @ApiResponse(responseCode = "403", description = "Not the apartment owner",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Request is not in PENDING state",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<ViewingRequestDto> declineViewingRequest(
            @PathVariable Long id,
            @Valid @RequestBody DeclineRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        ViewingRequestDto response =
                viewingRequestService.declineViewingRequest(id, userId, request.getReason());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasRole('TENANT')")
    @Operation(summary = "Cancel a viewing request")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Viewing request cancelled"),
            @ApiResponse(responseCode = "403", description = "Not the request owner",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Request cannot be cancelled in current state",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<Void> cancelViewingRequest(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        viewingRequestService.cancelViewingRequest(id, userId);
        return ResponseEntity.noContent().build();
    }
}
