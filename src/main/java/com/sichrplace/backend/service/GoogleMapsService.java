package com.sichrplace.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * FTL-21 — Google Maps Geocoding API integration.
 * <p>
 * Uses the Google Geocoding REST API via Spring 6 {@link RestClient}.
 * Fails softly: if the API key is missing or the call fails, methods return {@code null}
 * rather than throwing, so apartment creation/update is never blocked by a Maps outage.
 */
@Slf4j
@Service
public class GoogleMapsService implements GeocodingService {

    private static final String GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

    private final String apiKey;
    private final boolean enabled;
    private final RestClient restClient;

    public GoogleMapsService(
            @Value("${google.maps.api-key:}") String apiKey,
            @Value("${google.maps.geocoding.enabled:true}") boolean enabled,
            RestClient.Builder restClientBuilder) {
        this.apiKey = apiKey;
        this.enabled = enabled && apiKey != null && !apiKey.isBlank();
        this.restClient = restClientBuilder.build();

        if (!this.enabled) {
            log.warn("Google Maps geocoding DISABLED — GOOGLE_MAPS_API_KEY not set or geocoding.enabled=false");
        } else {
            log.info("Google Maps geocoding enabled");
        }
    }

    @Override
    public GeoResult geocode(String address) {
        if (!enabled || address == null || address.isBlank()) return null;

        try {
            String url = GEOCODE_URL
                    + "?address=" + URLEncoder.encode(address, StandardCharsets.UTF_8)
                    + "&key=" + apiKey;

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(Map.class);

            return extractFirstResult(response);
        } catch (Exception e) {
            log.error("Geocode failed for address='{}': {}", address, e.getMessage());
            return null;
        }
    }

    @Override
    public String reverseGeocode(double latitude, double longitude) {
        if (!enabled) return null;

        try {
            String url = GEOCODE_URL
                    + "?latlng=" + latitude + "," + longitude
                    + "&key=" + apiKey;

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(Map.class);

            GeoResult result = extractFirstResult(response);
            return result != null ? result.formattedAddress() : null;
        } catch (Exception e) {
            log.error("Reverse-geocode failed for ({}, {}): {}", latitude, longitude, e.getMessage());
            return null;
        }
    }

    /** Returns whether the service is configured and active. */
    public boolean isEnabled() {
        return enabled;
    }

    // ── internal helpers ──

    @SuppressWarnings("unchecked")
    private GeoResult extractFirstResult(Map<String, Object> response) {
        if (response == null) return null;

        String status = (String) response.get("status");
        if (!"OK".equals(status)) {
            log.debug("Geocoding API returned status={}", status);
            return null;
        }

        List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
        if (results == null || results.isEmpty()) return null;

        Map<String, Object> first = results.get(0);
        String formattedAddress = (String) first.get("formatted_address");

        Map<String, Object> geometry = (Map<String, Object>) first.get("geometry");
        if (geometry == null) return null;

        Map<String, Object> location = (Map<String, Object>) geometry.get("location");
        if (location == null) return null;

        double lat = ((Number) location.get("lat")).doubleValue();
        double lng = ((Number) location.get("lng")).doubleValue();

        return new GeoResult(lat, lng, formattedAddress);
    }
}
