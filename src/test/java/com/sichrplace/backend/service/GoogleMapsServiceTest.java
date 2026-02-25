package com.sichrplace.backend.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("GoogleMapsService — FTL-21")
class GoogleMapsServiceTest {

    // ── Helper: build a service wired with a mock RestClient ──

    private RestClient.Builder mockBuilderReturning(Map<String, Object> response) {
        RestClient restClient = mock(RestClient.class);
        RestClient.RequestHeadersUriSpec<?> uriSpec = mock(RestClient.RequestHeadersUriSpec.class);
        RestClient.RequestHeadersSpec<?> headersSpec = mock(RestClient.RequestHeadersSpec.class);
        RestClient.ResponseSpec responseSpec = mock(RestClient.ResponseSpec.class);

        when(restClient.get()).thenReturn((RestClient.RequestHeadersUriSpec) uriSpec);
        when(uriSpec.uri(anyString())).thenReturn((RestClient.RequestHeadersSpec) headersSpec);
        when(headersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(Map.class)).thenReturn(response);

        RestClient.Builder builder = mock(RestClient.Builder.class);
        when(builder.build()).thenReturn(restClient);
        return builder;
    }

    private RestClient.Builder mockBuilderThrowing(RuntimeException ex) {
        RestClient restClient = mock(RestClient.class);
        RestClient.RequestHeadersUriSpec<?> uriSpec = mock(RestClient.RequestHeadersUriSpec.class);
        RestClient.RequestHeadersSpec<?> headersSpec = mock(RestClient.RequestHeadersSpec.class);
        RestClient.ResponseSpec responseSpec = mock(RestClient.ResponseSpec.class);

        when(restClient.get()).thenReturn((RestClient.RequestHeadersUriSpec) uriSpec);
        when(uriSpec.uri(anyString())).thenReturn((RestClient.RequestHeadersSpec) headersSpec);
        when(headersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(Map.class)).thenThrow(ex);

        RestClient.Builder builder = mock(RestClient.Builder.class);
        when(builder.build()).thenReturn(restClient);
        return builder;
    }

    private Map<String, Object> googleOkResponse(double lat, double lng, String formatted) {
        return Map.of(
                "status", "OK",
                "results", List.of(
                        Map.of(
                                "formatted_address", formatted,
                                "geometry", Map.of("location", Map.of("lat", lat, "lng", lng))
                        )
                )
        );
    }

    // ── Disabled-service tests ──

    @Test
    @DisplayName("disabled when API key is blank")
    void disabled_whenApiKeyBlank() {
        GoogleMapsService svc = new GoogleMapsService("", true, RestClient.builder());
        assertFalse(svc.isEnabled());
        assertNull(svc.geocode("Berlin, Germany"));
        assertNull(svc.reverseGeocode(52.52, 13.40));
    }

    @Test
    @DisplayName("disabled when enabled=false even with valid key")
    void disabled_whenEnabledFalse() {
        GoogleMapsService svc = new GoogleMapsService("someKey", false, RestClient.builder());
        assertFalse(svc.isEnabled());
        assertNull(svc.geocode("Berlin"));
    }

    @Test
    @DisplayName("enabled when key present and enabled=true")
    void enabled_whenKeyPresent() {
        GoogleMapsService svc = new GoogleMapsService("testKey", true, RestClient.builder());
        assertTrue(svc.isEnabled());
    }

    // ── geocode() tests ──

    @Test
    @DisplayName("geocode returns GeoResult on OK response")
    void geocode_returnsGeoResult() {
        Map<String, Object> response = googleOkResponse(50.7753, 6.0839, "Aachen, Germany");
        GoogleMapsService svc = new GoogleMapsService("key", true, mockBuilderReturning(response));

        GeocodingService.GeoResult result = svc.geocode("Aachen");

        assertNotNull(result);
        assertEquals(50.7753, result.latitude(), 0.0001);
        assertEquals(6.0839, result.longitude(), 0.0001);
        assertEquals("Aachen, Germany", result.formattedAddress());
    }

    @Test
    @DisplayName("geocode returns null on null/blank address")
    void geocode_returnsNull_nullAddress() {
        GoogleMapsService svc = new GoogleMapsService("key", true, RestClient.builder());
        assertNull(svc.geocode(null));
        assertNull(svc.geocode("   "));
    }

    @Test
    @DisplayName("geocode returns null on ZERO_RESULTS status")
    void geocode_returnsNull_zeroResults() {
        Map<String, Object> response = Map.of("status", "ZERO_RESULTS", "results", List.of());
        GoogleMapsService svc = new GoogleMapsService("key", true, mockBuilderReturning(response));

        assertNull(svc.geocode("xyznonexistent"));
    }

    @Test
    @DisplayName("geocode returns null on API error (fail-soft)")
    void geocode_returnsNull_onException() {
        GoogleMapsService svc = new GoogleMapsService("key", true,
                mockBuilderThrowing(new RuntimeException("Connection refused")));

        assertNull(svc.geocode("Berlin"));
    }

    @Test
    @DisplayName("geocode returns null when response is null")
    void geocode_returnsNull_nullResponse() {
        GoogleMapsService svc = new GoogleMapsService("key", true, mockBuilderReturning(null));
        assertNull(svc.geocode("Berlin"));
    }

    // ── reverseGeocode() tests ──

    @Test
    @DisplayName("reverseGeocode returns formatted address")
    void reverseGeocode_returnsAddress() {
        Map<String, Object> response = googleOkResponse(52.52, 13.40, "Berlin, Germany");
        GoogleMapsService svc = new GoogleMapsService("key", true, mockBuilderReturning(response));

        String address = svc.reverseGeocode(52.52, 13.40);

        assertEquals("Berlin, Germany", address);
    }

    @Test
    @DisplayName("reverseGeocode returns null on error (fail-soft)")
    void reverseGeocode_returnsNull_onException() {
        GoogleMapsService svc = new GoogleMapsService("key", true,
                mockBuilderThrowing(new RuntimeException("timeout")));

        assertNull(svc.reverseGeocode(52.52, 13.40));
    }

    @Test
    @DisplayName("reverseGeocode returns null when disabled")
    void reverseGeocode_returnsNull_whenDisabled() {
        GoogleMapsService svc = new GoogleMapsService("", true, RestClient.builder());
        assertNull(svc.reverseGeocode(52.52, 13.40));
    }
}
