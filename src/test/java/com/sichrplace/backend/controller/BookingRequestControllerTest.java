package com.sichrplace.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.ApplicantMatchDto;
import com.sichrplace.backend.dto.BookingRequestDto;
import com.sichrplace.backend.dto.CreateBookingRequestRequest;
import com.sichrplace.backend.dto.PublicProfileDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.BookingRequestService;
import com.sichrplace.backend.service.SmartMatchingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BookingRequestController.class)
@Import(GlobalExceptionHandler.class)
@DisplayName("BookingRequestController — FTL-13/14")
class BookingRequestControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private BookingRequestService bookingRequestService;
    @MockBean private SmartMatchingService smartMatchingService;
    @MockBean private JwtTokenProvider jwtTokenProvider;

    // ── auth helpers ──

    private UsernamePasswordAuthenticationToken tenantAuth() {
        return new UsernamePasswordAuthenticationToken(
                2L, null, List.of(new SimpleGrantedAuthority("ROLE_TENANT")));
    }

    private UsernamePasswordAuthenticationToken landlordAuth() {
        return new UsernamePasswordAuthenticationToken(
                1L, null, List.of(new SimpleGrantedAuthority("ROLE_LANDLORD")));
    }

    private UsernamePasswordAuthenticationToken adminAuth() {
        return new UsernamePasswordAuthenticationToken(
                99L, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    // ── sample DTOs ──

    private BookingRequestDto sampleDto() {
        return BookingRequestDto.builder()
                .id(10L).apartmentId(100L).apartmentTitle("Nice flat")
                .tenantId(2L).tenantName("Jane Doe").landlordId(1L)
                .preferredMoveIn(LocalDate.of(2026, 6, 1))
                .status("SUBMITTED")
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }

    private CreateBookingRequestRequest validRequest() {
        return CreateBookingRequestRequest.builder()
                .preferredMoveIn(LocalDate.of(2026, 6, 1))
                .reasonType("WORK")
                .payer("MYSELF")
                .detailedReason("New job in Berlin")
                .build();
    }

    // ── Tenant endpoints ──

    @Nested
    @DisplayName("POST /api/apartments/{id}/booking-requests")
    class CreateBookingRequest {

        @Test
        @DisplayName("tenant → 201 Created")
        void tenantCreates201() throws Exception {
            when(bookingRequestService.createBookingRequest(eq(100L), eq(2L), any(CreateBookingRequestRequest.class)))
                    .thenReturn(sampleDto());

            mockMvc.perform(post("/api/apartments/100/booking-requests")
                            .with(authentication(tenantAuth())).with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest())))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(10))
                    .andExpect(jsonPath("$.status").value("SUBMITTED"));
        }

        @Test
        @DisplayName("landlord → 403 Forbidden")
        void landlordForbidden() throws Exception {
            when(bookingRequestService.createBookingRequest(eq(100L), eq(1L), any(CreateBookingRequestRequest.class)))
                    .thenThrow(new SecurityException("Only tenants can create booking requests"));

            mockMvc.perform(post("/api/apartments/100/booking-requests")
                            .with(authentication(landlordAuth())).with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest())))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("missing preferredMoveIn → 400")
        void missingMoveIn400() throws Exception {
            CreateBookingRequestRequest bad = CreateBookingRequestRequest.builder().build();

            mockMvc.perform(post("/api/apartments/100/booking-requests")
                            .with(authentication(tenantAuth())).with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(bad)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET /api/tenant/booking-requests")
    class TenantList {

        @Test
        @DisplayName("tenant → 200 + list")
        void tenantGetsList() throws Exception {
            when(bookingRequestService.getBookingRequestsByTenant(2L))
                    .thenReturn(List.of(sampleDto()));

            mockMvc.perform(get("/api/tenant/booking-requests")
                            .with(authentication(tenantAuth())))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].tenantId").value(2));
        }

        @Test
        @DisplayName("landlord → 403")
        void landlordForbidden() throws Exception {
            when(bookingRequestService.getBookingRequestsByTenant(1L))
                    .thenThrow(new SecurityException("Only tenants can view their own booking requests"));

            mockMvc.perform(get("/api/tenant/booking-requests")
                            .with(authentication(landlordAuth())))
                    .andExpect(status().isForbidden());
        }
    }

    // ── Landlord endpoints ──

    @Nested
    @DisplayName("GET /api/landlord/booking-requests")
    class LandlordList {

        @Test
        @DisplayName("landlord → 200")
        void landlordGets200() throws Exception {
            when(bookingRequestService.getBookingRequestsByLandlord(1L))
                    .thenReturn(List.of(sampleDto()));

            mockMvc.perform(get("/api/landlord/booking-requests")
                            .with(authentication(landlordAuth())))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));
        }

        @Test
        @DisplayName("tenant → 403")
        void tenantForbidden() throws Exception {
            when(bookingRequestService.getBookingRequestsByLandlord(2L))
                    .thenThrow(new SecurityException("Only landlords can view incoming booking requests"));

            mockMvc.perform(get("/api/landlord/booking-requests")
                            .with(authentication(tenantAuth())))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("GET /api/landlord/apartments/{id}/booking-requests")
    class ByApartment {

        @Test
        @DisplayName("landlord → 200 + filtered list")
        void landlordGetsByApartment() throws Exception {
            when(bookingRequestService.getBookingRequestsByApartment(100L, 1L))
                    .thenReturn(List.of(sampleDto()));

            mockMvc.perform(get("/api/landlord/apartments/100/booking-requests")
                            .with(authentication(landlordAuth())))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].apartmentId").value(100));
        }
    }

    @Nested
    @DisplayName("PUT accept/decline")
    class AcceptDecline {

        @Test
        @DisplayName("accept → 200 + updated status")
        void acceptReturns200() throws Exception {
            BookingRequestDto accepted = sampleDto();
            accepted.setStatus("ACCEPTED");

            when(bookingRequestService.acceptBookingRequest(10L, 1L)).thenReturn(accepted);

            mockMvc.perform(put("/api/landlord/booking-requests/10/accept")
                            .with(authentication(landlordAuth())).with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ACCEPTED"));
        }

        @Test
        @DisplayName("decline → 200 + decline reason")
        void declineReturns200() throws Exception {
            BookingRequestDto declined = sampleDto();
            declined.setStatus("DECLINED");
            declined.setDeclineReason("Not suitable");

            when(bookingRequestService.declineBookingRequest(eq(10L), eq(1L), eq("Not suitable")))
                    .thenReturn(declined);

            mockMvc.perform(put("/api/landlord/booking-requests/10/decline")
                            .with(authentication(landlordAuth())).with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"reason\":\"Not suitable\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("DECLINED"))
                    .andExpect(jsonPath("$.declineReason").value("Not suitable"));
        }

        @Test
        @DisplayName("tenant cannot accept → 403")
        void tenantCannotAccept() throws Exception {
            when(bookingRequestService.acceptBookingRequest(10L, 2L))
                    .thenThrow(new SecurityException("Only landlords can accept booking requests"));

            mockMvc.perform(put("/api/landlord/booking-requests/10/accept")
                            .with(authentication(tenantAuth())).with(csrf()))
                    .andExpect(status().isForbidden());
        }
    }

    // ── FTL-14: Compare ──

    @Nested
    @DisplayName("GET /api/landlord/apartments/{id}/booking-requests/compare")
    class Compare {

        @Test
        @DisplayName("landlord → 200 + ranked list")
        void compareReturnsRankedList() throws Exception {
            ApplicantMatchDto match = ApplicantMatchDto.builder()
                    .bookingRequestId(10L).score(75)
                    .reasons(List.of("Non-smoker", "Move-in date within availability"))
                    .publicProfile(PublicProfileDto.builder()
                            .firstName("Jane").build())
                    .build();

            when(smartMatchingService.compareApplicants(100L, 1L))
                    .thenReturn(List.of(match));

            mockMvc.perform(get("/api/landlord/apartments/100/booking-requests/compare")
                            .with(authentication(landlordAuth())))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].score").value(75))
                    .andExpect(jsonPath("$[0].publicProfile.firstName").value("Jane"));
        }

        @Test
        @DisplayName("tenant → 403")
        void tenantForbidden() throws Exception {
            when(smartMatchingService.compareApplicants(100L, 2L))
                    .thenThrow(new SecurityException("Only landlords can compare applicants"));

            mockMvc.perform(get("/api/landlord/apartments/100/booking-requests/compare")
                            .with(authentication(tenantAuth())))
                    .andExpect(status().isForbidden());
        }
    }
}
