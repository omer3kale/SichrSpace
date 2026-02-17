package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.dto.ApiErrorResponse;
import com.sichrplace.backend.dto.CreateApartmentRequest;
import com.sichrplace.backend.service.ApartmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/apartments")
@RequiredArgsConstructor
@Tag(name = "Apartments", description = "Apartment listing operations")
public class ApartmentController {

    private final ApartmentService apartmentService;

    @PostMapping
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Create a new apartment listing")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Apartment created"),
            @ApiResponse(responseCode = "400", description = "Validation error",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Forbidden – not a landlord",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<ApartmentDto> createApartment(@Valid @RequestBody CreateApartmentRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        ApartmentDto response = apartmentService.createApartment(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "List available apartments with optional filters", security = {})
    @ApiResponse(responseCode = "200", description = "Paginated list of apartments")
    public ResponseEntity<Page<ApartmentDto>> getAllApartments(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer minBedrooms,
            @RequestParam(required = false) Double minSize,
            @RequestParam(required = false) Boolean furnished,
            @RequestParam(required = false) Boolean petFriendly,
            Pageable pageable) {
        Page<ApartmentDto> response = apartmentService.searchApartments(
                city, minPrice, maxPrice, minBedrooms, minSize, furnished, petFriendly, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get apartment details by ID", security = {})
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Apartment details"),
            @ApiResponse(responseCode = "404", description = "Apartment not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<ApartmentDto> getApartmentById(@PathVariable Long id) {
        ApartmentDto response = apartmentService.getApartmentById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/owner/listings")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Get apartments owned by the current user")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<List<ApartmentDto>> getMyApartments() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        List<ApartmentDto> response = apartmentService.getApartmentsByOwner(userId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Update an apartment listing")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Apartment updated"),
            @ApiResponse(responseCode = "403", description = "Not the apartment owner",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Apartment not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<ApartmentDto> updateApartment(
            @PathVariable Long id,
            @Valid @RequestBody CreateApartmentRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        ApartmentDto response = apartmentService.updateApartment(id, userId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Delete an apartment listing")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Apartment deleted"),
            @ApiResponse(responseCode = "403", description = "Not the apartment owner",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Apartment not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<Void> deleteApartment(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        apartmentService.deleteApartment(id, userId);
        return ResponseEntity.noContent().build();
    }
}
