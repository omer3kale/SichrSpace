package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ApplicantMatchDto;
import com.sichrplace.backend.dto.BookingRequestDto;
import com.sichrplace.backend.dto.CreateBookingRequestRequest;
import com.sichrplace.backend.dto.DeclineRequest;
import com.sichrplace.backend.service.BookingRequestService;
import com.sichrplace.backend.service.SmartMatchingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Booking Requests", description = "Tenant booking-request operations")
@SecurityRequirement(name = "bearerAuth")
public class BookingRequestController {

    private final BookingRequestService bookingRequestService;
    private final SmartMatchingService smartMatchingService;

    // ── Tenant endpoints ──

    @PostMapping("/api/apartments/{apartmentId}/booking-requests")
    @PreAuthorize("hasRole('TENANT')")
    @Operation(summary = "Create a booking request for an apartment")
    public ResponseEntity<BookingRequestDto> createBookingRequest(
            @PathVariable Long apartmentId,
            @Valid @RequestBody CreateBookingRequestRequest request) {
        Long userId = currentUserId();
        BookingRequestDto dto = bookingRequestService.createBookingRequest(apartmentId, userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping("/api/tenant/booking-requests")
    @PreAuthorize("hasRole('TENANT')")
    @Operation(summary = "List current tenant's booking requests")
    public ResponseEntity<List<BookingRequestDto>> getMyBookingRequests() {
        return ResponseEntity.ok(bookingRequestService.getBookingRequestsByTenant(currentUserId()));
    }

    // ── Landlord endpoints ──

    @GetMapping("/api/landlord/booking-requests")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "List incoming booking requests for all landlord apartments")
    public ResponseEntity<List<BookingRequestDto>> getLandlordBookingRequests() {
        return ResponseEntity.ok(bookingRequestService.getBookingRequestsByLandlord(currentUserId()));
    }

    @GetMapping("/api/landlord/apartments/{apartmentId}/booking-requests")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "List booking requests for a specific apartment")
    public ResponseEntity<List<BookingRequestDto>> getBookingRequestsByApartment(
            @PathVariable Long apartmentId) {
        return ResponseEntity.ok(
                bookingRequestService.getBookingRequestsByApartment(apartmentId, currentUserId()));
    }

    @PutMapping("/api/landlord/booking-requests/{id}/accept")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Accept a submitted booking request")
    public ResponseEntity<BookingRequestDto> acceptBookingRequest(@PathVariable Long id) {
        return ResponseEntity.ok(bookingRequestService.acceptBookingRequest(id, currentUserId()));
    }

    @PutMapping("/api/landlord/booking-requests/{id}/decline")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Decline a submitted booking request")
    public ResponseEntity<BookingRequestDto> declineBookingRequest(
            @PathVariable Long id,
            @Valid @RequestBody DeclineRequest request) {
        return ResponseEntity.ok(
                bookingRequestService.declineBookingRequest(id, currentUserId(), request.getReason()));
    }

    // ── FTL-14: Applicant comparison ──

    @GetMapping("/api/landlord/apartments/{apartmentId}/booking-requests/compare")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Compare and rank applicants for an apartment")
    public ResponseEntity<List<ApplicantMatchDto>> compareApplicants(
            @PathVariable Long apartmentId) {
        return ResponseEntity.ok(smartMatchingService.compareApplicants(apartmentId, currentUserId()));
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }
}
