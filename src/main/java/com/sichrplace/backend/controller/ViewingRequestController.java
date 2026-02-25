package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ApiErrorResponse;
import com.sichrplace.backend.dto.CreatePaymentSessionRequest;
import com.sichrplace.backend.dto.CreateViewingRequestRequest;
import com.sichrplace.backend.dto.DeclineRequest;
import com.sichrplace.backend.dto.PaymentSessionDto;
import com.sichrplace.backend.dto.ViewingRequestDto;
import com.sichrplace.backend.dto.ViewingRequestStatsDto;
import com.sichrplace.backend.dto.ViewingRequestTransitionDto;
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
                ViewingRequestService.ViewingRequestStatus.valueOf(status.toUpperCase(java.util.Locale.ROOT));
        Page<ViewingRequestDto> response =
                viewingRequestService.getViewingRequestsByTenantPaged(userId, statusEnum, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/received")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Get all viewing requests received by the current landlord")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of received viewing requests"),
            @ApiResponse(responseCode = "403", description = "Not a landlord",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<List<ViewingRequestDto>> getReceivedViewingRequests() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        List<ViewingRequestDto> response = viewingRequestService.getViewingRequestsReceivedByLandlord(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/apartment/{apartmentId}")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Get viewing requests for a specific apartment")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of viewing requests"),
            @ApiResponse(responseCode = "403", description = "Not admin",
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
    @Operation(summary = "Get viewing requests for a specific apartment, paged")
    public ResponseEntity<Page<ViewingRequestDto>> getViewingRequestsByApartmentPaged(
            @PathVariable Long apartmentId,
            @RequestParam(defaultValue = "PENDING") String status,
            Pageable pageable) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        ViewingRequestService.ViewingRequestStatus statusEnum =
                ViewingRequestService.ViewingRequestStatus.valueOf(status.toUpperCase(java.util.Locale.ROOT));
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

    @GetMapping("/{id}/history")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get transition history for a viewing request")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Transition history"),
            @ApiResponse(responseCode = "403", description = "Not authorized to view this history",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Viewing request not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<List<ViewingRequestTransitionDto>> getTransitionHistory(
            @PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        List<ViewingRequestTransitionDto> response =
                viewingRequestService.getTransitionHistory(id, userId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark a confirmed viewing request as completed")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Viewing request completed"),
            @ApiResponse(responseCode = "403", description = "Not authorized",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Request is not in CONFIRMED state",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<ViewingRequestDto> completeViewingRequest(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        ViewingRequestDto response = viewingRequestService.completeViewingRequest(id, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/statistics")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get viewing request statistics for the current user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Statistics summary"),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<ViewingRequestStatsDto> getStatistics() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        ViewingRequestStatsDto response = viewingRequestService.getStatistics(userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/payments/session")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a payment session for a viewing request")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Payment session created"),
            @ApiResponse(responseCode = "400", description = "Viewing request not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Not authorized",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Payment not required for this request",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<PaymentSessionDto> createPaymentSession(
            @PathVariable Long id,
            @Valid @RequestBody CreatePaymentSessionRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        PaymentSessionDto response = viewingRequestService.createPaymentSession(id, userId, request.getProvider());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}/payments/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get payment status for a viewing request")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Payment status"),
            @ApiResponse(responseCode = "400", description = "Viewing request not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Not authorized",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<java.util.Map<String, String>> getPaymentStatus(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        String status = viewingRequestService.getPaymentStatus(id, userId);
        return ResponseEntity.ok(java.util.Map.of("status", status != null ? status : "NONE"));
    }

    // ── FTL-17: Admin-only listing of all viewing requests ──

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all viewing requests (admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "All viewing requests"),
            @ApiResponse(responseCode = "403", description = "Not admin",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<Page<ViewingRequestDto>> getAllViewingRequestsAdmin(
            @RequestParam(required = false) String status,
            Pageable pageable) {
        Page<ViewingRequestDto> result = viewingRequestService.getAllViewingRequestsAdmin(status, pageable);
        return ResponseEntity.ok(result);
    }
}
