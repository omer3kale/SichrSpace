package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.ApartmentService;
import com.sichrplace.backend.service.GeocodingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MapsController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("MapsController — FTL-21")
class MapsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ApartmentService apartmentService;

    @MockBean
    private GeocodingService geocodingService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    // ── /api/maps/geocode ──

    @Test
    @DisplayName("GET /api/maps/geocode returns 200 with coordinates")
    void geocode_returns200() throws Exception {
        when(geocodingService.geocode("Aachen, Germany"))
                .thenReturn(new GeocodingService.GeoResult(50.7753, 6.0839, "Aachen, Germany"));

        mockMvc.perform(get("/api/maps/geocode").param("address", "Aachen, Germany"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").value(50.7753))
                .andExpect(jsonPath("$.longitude").value(6.0839))
                .andExpect(jsonPath("$.formattedAddress").value("Aachen, Germany"));
    }

    @Test
    @DisplayName("GET /api/maps/geocode returns 404 when address not found")
    void geocode_returns404() throws Exception {
        when(geocodingService.geocode("xyznonexistent")).thenReturn(null);

        mockMvc.perform(get("/api/maps/geocode").param("address", "xyznonexistent"))
                .andExpect(status().isNotFound());
    }

    // ── /api/maps/reverse-geocode ──

    @Test
    @DisplayName("GET /api/maps/reverse-geocode returns 200 with address")
    void reverseGeocode_returns200() throws Exception {
        when(geocodingService.reverseGeocode(52.52, 13.40)).thenReturn("Berlin, Germany");

        mockMvc.perform(get("/api/maps/reverse-geocode")
                        .param("lat", "52.52")
                        .param("lng", "13.40"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.formattedAddress").value("Berlin, Germany"));
    }

    @Test
    @DisplayName("GET /api/maps/reverse-geocode returns 404 on failure")
    void reverseGeocode_returns404() throws Exception {
        when(geocodingService.reverseGeocode(0.0, 0.0)).thenReturn(null);

        mockMvc.perform(get("/api/maps/reverse-geocode")
                        .param("lat", "0.0")
                        .param("lng", "0.0"))
                .andExpect(status().isNotFound());
    }

    // ── /api/maps/apartments/nearby ──

    @Test
    @DisplayName("GET /api/maps/apartments/nearby returns 200 with results")
    void nearbyApartments_returns200() throws Exception {
        ApartmentDto dto = ApartmentDto.builder()
                .id(10L)
                .title("Near Flat")
                .city("Aachen")
                .latitude(50.78)
                .longitude(6.08)
                .monthlyRent(BigDecimal.valueOf(600))
                .build();

        when(apartmentService.findNearbyApartments(eq(50.77), eq(6.08), eq(5.0), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dto)));

        mockMvc.perform(get("/api/maps/apartments/nearby")
                        .param("lat", "50.77")
                        .param("lng", "6.08")
                        .param("radiusKm", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(10))
                .andExpect(jsonPath("$.content[0].title").value("Near Flat"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("GET /api/maps/apartments/nearby uses default radius 10km")
    void nearbyApartments_defaultRadius() throws Exception {
        when(apartmentService.findNearbyApartments(eq(50.0), eq(6.0), eq(10.0), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/maps/apartments/nearby")
                        .param("lat", "50.0")
                        .param("lng", "6.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    @DisplayName("GET /api/maps/apartments/nearby returns 400 when lat/lng missing")
    void nearbyApartments_returns400_missingParams() throws Exception {
        mockMvc.perform(get("/api/maps/apartments/nearby"))
                .andExpect(status().isBadRequest());
    }
}
