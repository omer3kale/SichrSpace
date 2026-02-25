package com.sichrplace.backend.service;

/**
 * FTL-21 — Geocoding service abstraction.
 * <p>
 * Wraps an external geocoding provider (e.g. Google Maps) behind a clean interface
 * so the rest of the application never depends on a specific provider SDK.
 */
public interface GeocodingService {

    /**
     * Geocode an address string to latitude/longitude.
     *
     * @param address the human-readable address
     * @return coordinates, or {@code null} if geocoding fails or address is unresolvable
     */
    GeoResult geocode(String address);

    /**
     * Reverse-geocode coordinates to an address string.
     *
     * @param latitude  WGS-84 latitude
     * @param longitude WGS-84 longitude
     * @return formatted address, or {@code null} if reverse-geocoding fails
     */
    String reverseGeocode(double latitude, double longitude);

    /** Simple holder for geocoding results. */
    record GeoResult(double latitude, double longitude, String formattedAddress) {}
}
