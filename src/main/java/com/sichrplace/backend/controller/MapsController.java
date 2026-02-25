package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.service.ApartmentService;
import com.sichrplace.backend.service.GeocodingService;
import com.sichrplace.backend.service.GoogleMapsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * FTL-21 — Maps &amp; geolocation endpoints.
 */
@RestController
@RequestMapping("/api/maps")
@RequiredArgsConstructor
@Tag(name = "Maps & Geolocation", description = "Geocoding and nearby apartment search")
public class MapsController {

    private final ApartmentService apartmentService;
    private final GeocodingService geocodingService;

    @GetMapping("/geocode")
    @Operation(summary = "Geocode an address to coordinates (demo/testing)", security = {})
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Geocode result"),
            @ApiResponse(responseCode = "404", description = "Address could not be geocoded")
    })
    public ResponseEntity<Map<String, Object>> geocode(@RequestParam String address) {
        GeocodingService.GeoResult result = geocodingService.geocode(address);
        if (result == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of(
                "latitude", result.latitude(),
                "longitude", result.longitude(),
                "formattedAddress", result.formattedAddress()
        ));
    }

    @GetMapping("/reverse-geocode")
    @Operation(summary = "Reverse-geocode coordinates to an address", security = {})
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Formatted address"),
            @ApiResponse(responseCode = "404", description = "Coordinates could not be resolved")
    })
    public ResponseEntity<Map<String, String>> reverseGeocode(
            @RequestParam double lat, @RequestParam double lng) {
        String address = geocodingService.reverseGeocode(lat, lng);
        if (address == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("formattedAddress", address));
    }

    @GetMapping("/apartments/nearby")
    @Operation(summary = "Find available apartments near a location", security = {})
    @ApiResponse(responseCode = "200", description = "Paginated list of nearby apartments")
    public ResponseEntity<Page<ApartmentDto>> nearbyApartments(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "10") double radiusKm,
            Pageable pageable) {
        Page<ApartmentDto> result = apartmentService.findNearbyApartments(lat, lng, radiusKm, pageable);
        return ResponseEntity.ok(result);
    }
}
