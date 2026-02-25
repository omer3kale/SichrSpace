package com.sichrplace.backend.controller;

import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.ApartmentMatchDto;
import com.sichrplace.backend.dto.ApartmentSearchCardDto;
import com.sichrplace.backend.dto.ApplicantMatchDto;
import com.sichrplace.backend.dto.PublicProfileDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.SmartMatchingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MatchingController.class)
@Import(GlobalExceptionHandler.class)
@DisplayName("MatchingController — FTL-22")
class MatchingControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private SmartMatchingService smartMatchingService;
    @MockBean private JwtTokenProvider jwtTokenProvider;

    private final UsernamePasswordAuthenticationToken tenantAuth =
            new UsernamePasswordAuthenticationToken(
                    30L, null, List.of(new SimpleGrantedAuthority("ROLE_TENANT")));

    private final UsernamePasswordAuthenticationToken landlordAuth =
            new UsernamePasswordAuthenticationToken(
                    20L, null, List.of(new SimpleGrantedAuthority("ROLE_LANDLORD")));

    @Nested
    @DisplayName("GET /api/matching/apartments-for-me")
    class ApartmentsForMe {

        @Test
        @DisplayName("200 — tenant gets personalised recommendations")
        void tenantGetsRecommendations() throws Exception {
            ApartmentMatchDto match = ApartmentMatchDto.builder()
                    .apartmentId(1L)
                    .score(85)
                    .reasons(List.of("Same city (Berlin)", "Non-smoker", "Available now"))
                    .card(ApartmentSearchCardDto.builder()
                            .id(1L).city("Berlin").pricePerMonth(BigDecimal.valueOf(800))
                            .build())
                    .build();

            when(smartMatchingService.matchApartmentsForTenant(eq(30L), eq(20)))
                    .thenReturn(List.of(match));

            mockMvc.perform(get("/api/matching/apartments-for-me")
                            .with(authentication(tenantAuth))
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].apartmentId").value(1))
                    .andExpect(jsonPath("$[0].score").value(85))
                    .andExpect(jsonPath("$[0].reasons[0]").value("Same city (Berlin)"))
                    .andExpect(jsonPath("$[0].card.city").value("Berlin"));
        }

        @Test
        @DisplayName("200 — custom limit parameter")
        void customLimitParameter() throws Exception {
            when(smartMatchingService.matchApartmentsForTenant(eq(30L), eq(5)))
                    .thenReturn(List.of());

            mockMvc.perform(get("/api/matching/apartments-for-me")
                            .param("limit", "5")
                            .with(authentication(tenantAuth))
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray());
        }

        @Test
        @DisplayName("200 — empty list when no matches")
        void emptyWhenNoMatches() throws Exception {
            when(smartMatchingService.matchApartmentsForTenant(eq(30L), eq(20)))
                    .thenReturn(List.of());

            mockMvc.perform(get("/api/matching/apartments-for-me")
                            .with(authentication(tenantAuth))
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        @DisplayName("403 — landlord access triggers SecurityException")
        void landlordDenied() throws Exception {
            when(smartMatchingService.matchApartmentsForTenant(eq(20L), anyInt()))
                    .thenThrow(new SecurityException("Only tenants can access matching"));

            mockMvc.perform(get("/api/matching/apartments-for-me")
                            .with(authentication(landlordAuth))
                            .with(csrf()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("401 — unauthenticated request")
        void unauthenticatedDenied() throws Exception {
            mockMvc.perform(get("/api/matching/apartments-for-me"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("limit capped at 100")
        void limitCappedAt100() throws Exception {
            when(smartMatchingService.matchApartmentsForTenant(eq(30L), eq(100)))
                    .thenReturn(List.of());

            mockMvc.perform(get("/api/matching/apartments-for-me")
                            .param("limit", "500")
                            .with(authentication(tenantAuth))
                            .with(csrf()))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("GET /api/matching/applicants/{apartmentId}")
    class CompareApplicants {

        @Test
        @DisplayName("200 — landlord sees ranked applicants")
        void landlordGetsRankedApplicants() throws Exception {
            ApplicantMatchDto match = ApplicantMatchDto.builder()
                    .bookingRequestId(30L)
                    .score(82)
                    .reasons(List.of("Budget fit", "Non-smoker"))
                    .publicProfile(PublicProfileDto.builder()
                            .id(30L).firstName("T").build())
                    .build();

            when(smartMatchingService.compareApplicants(100L, 20L))
                    .thenReturn(List.of(match));

            mockMvc.perform(get("/api/matching/applicants/100")
                            .with(authentication(landlordAuth))
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].bookingRequestId").value(30))
                    .andExpect(jsonPath("$[0].score").value(82));
        }
    }

    @Nested
    @DisplayName("GET /api/matching/success-rate")
    class SuccessRate {

        @Test
        @DisplayName("200 — landlord gets matching success rate")
        void landlordGetsSuccessRate() throws Exception {
            Map<String, Object> stats = new LinkedHashMap<>();
            stats.put("totalBookingRequests", 10L);
            stats.put("acceptedBookings", 3L);
            stats.put("successRate", 0.3);

            when(smartMatchingService.getMatchingSuccessRate(20L)).thenReturn(stats);

            mockMvc.perform(get("/api/matching/success-rate")
                            .with(authentication(landlordAuth))
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalBookingRequests").value(10))
                    .andExpect(jsonPath("$.acceptedBookings").value(3))
                    .andExpect(jsonPath("$.successRate").value(0.3));
        }
    }
}
