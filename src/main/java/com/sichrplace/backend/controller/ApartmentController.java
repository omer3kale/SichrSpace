package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.dto.ApartmentSearchCardDto;
import com.sichrplace.backend.dto.ApiErrorResponse;
import com.sichrplace.backend.dto.CreateApartmentRequest;
import com.sichrplace.backend.service.ApartmentService;
import com.sichrplace.backend.service.FileStorageService;
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
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/apartments")
@RequiredArgsConstructor
@Tag(name = "Apartments", description = "Apartment listing operations")
public class ApartmentController {

    private final ApartmentService apartmentService;
    private final FileStorageService fileStorageService;

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");
    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

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

    // ─── FTL-09/10/11: Advanced search → card DTO ─────────────────

    @GetMapping("/search")
    @Operation(summary = "Search apartments with basic + advanced filters, returning compact card DTOs", security = {})
    @ApiResponse(responseCode = "200", description = "Paginated search results (card view)")
    public ResponseEntity<Page<ApartmentSearchCardDto>> searchApartments(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate moveInDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate moveOutDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate earliestMoveIn,
            @RequestParam(required = false) Boolean flexibleTimeslot,
            @RequestParam(required = false) BigDecimal priceMin,
            @RequestParam(required = false) BigDecimal priceMax,
            @RequestParam(required = false) String priceType,
            @RequestParam(required = false) String propertyType,
            @RequestParam(required = false) Integer rooms,
            @RequestParam(required = false) Integer singleBeds,
            @RequestParam(required = false) Integer doubleBeds,
            @RequestParam(required = false) String furnishedStatus,
            @RequestParam(required = false) Boolean petFriendly,
            @RequestParam(required = false) Boolean excludeExchangeOffer,
            @RequestParam(required = false) Boolean hasWifi,
            @RequestParam(required = false) Boolean hasWashingMachine,
            @RequestParam(required = false) Boolean hasElevator,
            @RequestParam(required = false) Boolean hasDishwasher,
            @RequestParam(required = false) Boolean hasAirConditioning,
            @RequestParam(required = false) Boolean hasParking,
            Pageable pageable) {
        Page<ApartmentSearchCardDto> result = apartmentService.searchApartmentCards(
                city, district, moveInDate, moveOutDate, earliestMoveIn, flexibleTimeslot,
                priceMin, priceMax, priceType,
                propertyType, rooms, singleBeds, doubleBeds, furnishedStatus,
                petFriendly, excludeExchangeOffer,
                hasWifi, hasWashingMachine, hasElevator, hasDishwasher, hasAirConditioning, hasParking,
                pageable);
        return ResponseEntity.ok(result);
    }

    // ─── Legacy list ─────────────────────────────────────────────────

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

    // ─── Apartment Image Upload ──────────────────────────────────────

    @PostMapping(value = "/images/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('LANDLORD') or hasRole('ADMIN')")
    @Operation(summary = "Upload apartment images (JPEG, PNG, WebP, GIF; max 5 MB each)")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Images uploaded, URLs returned"),
            @ApiResponse(responseCode = "400", description = "Invalid file type or size"),
            @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    public ResponseEntity<?> uploadApartmentImages(@RequestParam("files") MultipartFile[] files) {
        if (files == null || files.length == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "No files provided"));
        }
        List<String> urls = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            if (!ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
                return ResponseEntity.badRequest().body(Map.of("error",
                        "Invalid file type for " + file.getOriginalFilename() + ". Allowed: JPEG, PNG, WebP, GIF"));
            }
            if (file.getSize() > MAX_IMAGE_SIZE) {
                return ResponseEntity.badRequest().body(Map.of("error",
                        "File " + file.getOriginalFilename() + " is too large. Maximum size is 5 MB"));
            }
            String storagePath = fileStorageService.store(file, "apartment-images");
            String filename = storagePath.substring(storagePath.lastIndexOf('/') + 1);
            urls.add("/api/apartments/images/" + filename);
        }
        return ResponseEntity.ok(Map.of("urls", urls));
    }

    @GetMapping("/images/{filename}")
    @Operation(summary = "Serve an apartment image by filename", security = {})
    public ResponseEntity<Resource> serveApartmentImage(@PathVariable String filename) {
        Resource resource = fileStorageService.load("apartment-images/" + filename);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(resource);
    }
}
