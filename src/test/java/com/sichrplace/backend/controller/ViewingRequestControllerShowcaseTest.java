package com.sichrplace.backend.controller;

import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.CreatePaymentSessionRequest;
import com.sichrplace.backend.dto.CreateViewingRequestRequest;
import com.sichrplace.backend.dto.DeclineRequest;
import com.sichrplace.backend.dto.PaymentSessionDto;
import com.sichrplace.backend.dto.ViewingRequestDto;
import com.sichrplace.backend.dto.ViewingRequestStatsDto;
import com.sichrplace.backend.dto.ViewingRequestTransitionDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.ViewingRequestService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ViewingRequestController.class)
@Import(GlobalExceptionHandler.class)
@DisplayName("ViewingRequestController — Showcase Endpoints")
class ViewingRequestControllerShowcaseTest {

    @Autowired
    private MockMvc mockMvc;

        @Autowired
        private ObjectMapper objectMapper;

    @MockBean
    private ViewingRequestService viewingRequestService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

        private UsernamePasswordAuthenticationToken tenantAuth() {
                return new UsernamePasswordAuthenticationToken(
                                2L,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_TENANT"))
                );
        }

        private UsernamePasswordAuthenticationToken landlordAuth() {
                return new UsernamePasswordAuthenticationToken(
                                1L,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_LANDLORD"))
                );
        }

        private UsernamePasswordAuthenticationToken adminAuth() {
                return new UsernamePasswordAuthenticationToken(
                                3L,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                );
        }

    @Test
    @DisplayName("GET /api/viewing-requests/statistics returns stats summary")
    void getStatistics_success() throws Exception {
        ViewingRequestStatsDto stats = ViewingRequestStatsDto.builder()
                .totalRequests(5L)
                .pendingCount(1L)
                .confirmedCount(2L)
                .declinedCount(1L)
                .completedCount(1L)
                .cancelledCount(0L)
                .averageResponseTimeHours(2.5)
                .build();

        when(viewingRequestService.getStatistics(2L)).thenReturn(stats);

        mockMvc.perform(get("/api/viewing-requests/statistics").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRequests").value(5))
                .andExpect(jsonPath("$.confirmedCount").value(2))
                .andExpect(jsonPath("$.averageResponseTimeHours").value(2.5));
    }

    @Test
    @DisplayName("GET /api/viewing-requests/statistics without auth returns 401")
    void getStatistics_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/viewing-requests/statistics"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/viewing-requests returns 201")
    void createViewingRequest_created() throws Exception {
        ViewingRequestDto dto = ViewingRequestDto.builder()
                .id(70L)
                .status("PENDING")
                .message("Interested")
                .build();
        CreateViewingRequestRequest request = new CreateViewingRequestRequest();
        request.setApartmentId(100L);
        request.setProposedDateTime(LocalDateTime.now().plusDays(1));
        request.setMessage("Interested");

        when(viewingRequestService.createViewingRequest(eq(2L), any(CreateViewingRequestRequest.class))).thenReturn(dto);

        mockMvc.perform(post("/api/viewing-requests")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(70))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("POST /api/viewing-requests invalid body returns 400")
    void createViewingRequest_validationBadRequest() throws Exception {
        mockMvc.perform(post("/api/viewing-requests")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"));
    }

    @Test
    @DisplayName("GET /api/viewing-requests/{id} returns 404 when missing")
    void getViewingRequestById_notFound() throws Exception {
        when(viewingRequestService.getViewingRequestById(999L, 2L))
                .thenThrow(new IllegalArgumentException("Viewing request not found"));

        mockMvc.perform(get("/api/viewing-requests/999").with(authentication(tenantAuth())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Viewing request not found"));
    }

    @Test
    @DisplayName("GET /api/viewing-requests/{id} returns 200")
    void getViewingRequestById_success() throws Exception {
        when(viewingRequestService.getViewingRequestById(50L, 2L))
                .thenReturn(ViewingRequestDto.builder().id(50L).status("PENDING").build());

        mockMvc.perform(get("/api/viewing-requests/50").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50));
    }

    @Test
    @DisplayName("GET /api/viewing-requests/my returns tenant list")
    void getMyViewingRequests_success() throws Exception {
        when(viewingRequestService.getViewingRequestsByTenant(2L))
                .thenReturn(List.of(ViewingRequestDto.builder().id(12L).status("PENDING").build()));

        mockMvc.perform(get("/api/viewing-requests/my").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(12));
    }

    @Test
    @DisplayName("GET /api/viewing-requests/my/paged returns 200")
    void getMyViewingRequestsPaged_success() throws Exception {
        ViewingRequestDto dto = ViewingRequestDto.builder().id(10L).status("PENDING").build();
        when(viewingRequestService.getViewingRequestsByTenantPaged(eq(2L), eq(ViewingRequestService.ViewingRequestStatus.PENDING), any()))
                .thenReturn(new PageImpl<>(List.of(dto)));

        mockMvc.perform(get("/api/viewing-requests/my/paged")
                        .param("status", "PENDING")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(10));
    }

    @Test
    @DisplayName("GET /api/viewing-requests/my/paged bad status returns 400")
    void getMyViewingRequestsPaged_badStatus() throws Exception {
        mockMvc.perform(get("/api/viewing-requests/my/paged")
                        .param("status", "not-a-status")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/viewing-requests/apartment/{id} returns 200 for admin — FTL-17")
    void getViewingRequestsByApartment_success() throws Exception {
        ViewingRequestDto dto = ViewingRequestDto.builder().id(33L).status("PENDING").build();
        when(viewingRequestService.getViewingRequestsByApartment(100L, 3L)).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/viewing-requests/apartment/100").with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(33));
    }

    @Test
    @DisplayName("GET /api/viewing-requests/apartment/{id}/paged returns 200 for admin — FTL-17")
    void getViewingRequestsByApartmentPaged_success() throws Exception {
        when(viewingRequestService.getViewingRequestsByApartmentPaged(eq(100L), eq(3L), eq(ViewingRequestService.ViewingRequestStatus.PENDING), any()))
                .thenReturn(new PageImpl<>(List.of(ViewingRequestDto.builder().id(34L).status("PENDING").build())));

        mockMvc.perform(get("/api/viewing-requests/apartment/100/paged")
                        .param("status", "PENDING")
                        .with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(34));
    }

    @Test
    @DisplayName("GET /api/viewing-requests/apartment/{id} forbidden for tenant — FTL-17")
    void getViewingRequestsByApartment_forbiddenForTenant() throws Exception {
        when(viewingRequestService.getViewingRequestsByApartment(100L, 2L))
                .thenThrow(new SecurityException("Not authorized to view requests for this apartment"));

        mockMvc.perform(get("/api/viewing-requests/apartment/100").with(authentication(tenantAuth())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/viewing-requests/apartment/{id} forbidden for landlord — FTL-17")
    void getViewingRequestsByApartment_forbiddenForLandlord() throws Exception {
        when(viewingRequestService.getViewingRequestsByApartment(100L, 1L))
                .thenThrow(new SecurityException("Not authorized to view requests for this apartment"));

        mockMvc.perform(get("/api/viewing-requests/apartment/100").with(authentication(landlordAuth())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/viewing-requests/{id}/confirm returns 200")
    void confirmViewingRequest_success() throws Exception {
        ViewingRequestDto dto = ViewingRequestDto.builder().id(50L).status("CONFIRMED").build();
        when(viewingRequestService.confirmViewingRequest(50L, 1L)).thenReturn(dto);

        mockMvc.perform(put("/api/viewing-requests/50/confirm").with(authentication(landlordAuth())).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    @DisplayName("PUT /api/viewing-requests/{id}/decline returns 200")
    void declineViewingRequest_success() throws Exception {
        ViewingRequestDto dto = ViewingRequestDto.builder().id(50L).status("DECLINED").declineReason("busy").build();
        DeclineRequest request = new DeclineRequest();
        request.setReason("busy");
        when(viewingRequestService.declineViewingRequest(50L, 1L, "busy")).thenReturn(dto);

        mockMvc.perform(put("/api/viewing-requests/50/decline")
                        .with(authentication(landlordAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DECLINED"));
    }

    @Test
    @DisplayName("PUT /api/viewing-requests/{id}/cancel returns 204")
    void cancelViewingRequest_noContent() throws Exception {
        mockMvc.perform(put("/api/viewing-requests/50/cancel")
                        .with(authentication(tenantAuth()))
                        .with(csrf()))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
    }

    @Test
    @DisplayName("GET /api/viewing-requests/{id}/history returns 200")
    void getTransitionHistory_success() throws Exception {
        ViewingRequestTransitionDto transition = ViewingRequestTransitionDto.builder()
                .id(1L)
                .toStatus("PENDING")
                .reason("Created")
                .build();
        when(viewingRequestService.getTransitionHistory(50L, 2L)).thenReturn(List.of(transition));

        mockMvc.perform(get("/api/viewing-requests/50/history").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].toStatus").value("PENDING"));
    }

    @Test
    @DisplayName("PUT /api/viewing-requests/{id}/complete returns COMPLETED request")
    void completeViewingRequest_success() throws Exception {
        ViewingRequestDto dto = ViewingRequestDto.builder()
                .id(50L)
                .status("COMPLETED")
                .proposedDateTime(LocalDateTime.of(2026, 2, 20, 14, 0))
                .build();

        when(viewingRequestService.completeViewingRequest(50L, 2L)).thenReturn(dto);

        mockMvc.perform(put("/api/viewing-requests/50/complete").with(authentication(tenantAuth())).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    @DisplayName("PUT /api/viewing-requests/{id}/complete returns 409 for invalid state")
    void completeViewingRequest_conflict() throws Exception {
        when(viewingRequestService.completeViewingRequest(50L, 2L))
                .thenThrow(new IllegalStateException("Only CONFIRMED requests can be marked as completed (current: PENDING)"));

        mockMvc.perform(put("/api/viewing-requests/50/complete").with(authentication(tenantAuth())).with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Only CONFIRMED requests can be marked as completed (current: PENDING)"));
    }

    @Test
    @DisplayName("PUT /api/viewing-requests/{id}/complete returns 403 for unauthorized user")
    void completeViewingRequest_forbidden() throws Exception {
        when(viewingRequestService.completeViewingRequest(50L, 2L))
                .thenThrow(new SecurityException("Not authorized to complete this viewing request"));

        mockMvc.perform(put("/api/viewing-requests/50/complete").with(authentication(tenantAuth())).with(csrf()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Not authorized to complete this viewing request"));
    }

    @Test
    @DisplayName("PUT /api/viewing-requests/{id}/complete returns 404 when request missing")
    void completeViewingRequest_notFound() throws Exception {
        when(viewingRequestService.completeViewingRequest(999L, 2L))
                .thenThrow(new IllegalArgumentException("Viewing request not found"));

        mockMvc.perform(put("/api/viewing-requests/999/complete").with(authentication(tenantAuth())).with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Viewing request not found"));
    }

    @Test
    @DisplayName("PUT /api/viewing-requests/{id}/complete returns 401 without auth")
    void completeViewingRequest_withoutAuth() throws Exception {
        mockMvc.perform(put("/api/viewing-requests/50/complete").with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    // ── Payment Session endpoints ──

    @Test
    @DisplayName("POST /api/viewing-requests/{id}/payments/session returns 201")
    void createPaymentSession_success() throws Exception {
        PaymentSessionDto session = PaymentSessionDto.builder()
                .transactionId(10L)
                .provider("PAYPAL")
                .status("CREATED")
                .redirectUrl("https://payments.example.test/10")
                .build();

        when(viewingRequestService.createPaymentSession(50L, 2L, "PAYPAL")).thenReturn(session);

        CreatePaymentSessionRequest request = new CreatePaymentSessionRequest("PAYPAL");

        mockMvc.perform(post("/api/viewing-requests/50/payments/session")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.transactionId").value(10))
                .andExpect(jsonPath("$.provider").value("PAYPAL"))
                .andExpect(jsonPath("$.status").value("CREATED"))
                .andExpect(jsonPath("$.redirectUrl").value("https://payments.example.test/10"));
    }

    @Test
    @DisplayName("POST /api/viewing-requests/{id}/payments/session returns 409 when payment not required")
    void createPaymentSession_notRequired() throws Exception {
        when(viewingRequestService.createPaymentSession(50L, 2L, "PAYPAL"))
                .thenThrow(new IllegalStateException("Payment is not required for this viewing request"));

        CreatePaymentSessionRequest request = new CreatePaymentSessionRequest("PAYPAL");

        mockMvc.perform(post("/api/viewing-requests/50/payments/session")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Payment is not required for this viewing request"));
    }

    @Test
    @DisplayName("POST /api/viewing-requests/{id}/payments/session returns 404 when not found")
    void createPaymentSession_notFound() throws Exception {
        when(viewingRequestService.createPaymentSession(999L, 2L, "PAYPAL"))
                .thenThrow(new IllegalArgumentException("Viewing request not found"));

        CreatePaymentSessionRequest request = new CreatePaymentSessionRequest("PAYPAL");

        mockMvc.perform(post("/api/viewing-requests/999/payments/session")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Viewing request not found"));
    }

    @Test
    @DisplayName("POST /api/viewing-requests/{id}/payments/session returns 403 for non-tenant")
    void createPaymentSession_forbidden() throws Exception {
        when(viewingRequestService.createPaymentSession(50L, 2L, "PAYPAL"))
                .thenThrow(new SecurityException("Not authorized to create a payment session for this viewing request"));

        CreatePaymentSessionRequest request = new CreatePaymentSessionRequest("PAYPAL");

        mockMvc.perform(post("/api/viewing-requests/50/payments/session")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Not authorized to create a payment session for this viewing request"));
    }

    @Test
    @DisplayName("POST /api/viewing-requests/{id}/payments/session returns 401 without auth")
    void createPaymentSession_unauthenticated() throws Exception {
        CreatePaymentSessionRequest request = new CreatePaymentSessionRequest("PAYPAL");

        mockMvc.perform(post("/api/viewing-requests/50/payments/session")
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/viewing-requests/{id}/payments/session returns 400 for blank provider")
    void createPaymentSession_blankProvider() throws Exception {
        mockMvc.perform(post("/api/viewing-requests/50/payments/session")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"provider\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/viewing-requests/{id}/payments/status returns 200 with status")
    void getPaymentStatus_success() throws Exception {
        when(viewingRequestService.getPaymentStatus(50L, 2L)).thenReturn("COMPLETED");

        mockMvc.perform(get("/api/viewing-requests/50/payments/status").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    @DisplayName("GET /api/viewing-requests/{id}/payments/status returns NONE when no transaction")
    void getPaymentStatus_none() throws Exception {
        when(viewingRequestService.getPaymentStatus(50L, 2L)).thenReturn(null);

        mockMvc.perform(get("/api/viewing-requests/50/payments/status").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NONE"));
    }

    @Test
    @DisplayName("GET /api/viewing-requests/{id}/payments/status returns 403 for non-participant")
    void getPaymentStatus_forbidden() throws Exception {
        when(viewingRequestService.getPaymentStatus(50L, 2L))
                .thenThrow(new SecurityException("Not authorized to view payment status for this viewing request"));

        mockMvc.perform(get("/api/viewing-requests/50/payments/status").with(authentication(tenantAuth())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/viewing-requests/{id}/payments/status returns 401 without auth")
    void getPaymentStatus_unauthenticated() throws Exception {
        mockMvc.perform(get("/api/viewing-requests/50/payments/status"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/viewing-requests/{id}/payments/status returns 200 for landlord")
    void getPaymentStatus_landlordAccess() throws Exception {
        when(viewingRequestService.getPaymentStatus(50L, 1L)).thenReturn("PENDING");

        mockMvc.perform(get("/api/viewing-requests/50/payments/status").with(authentication(landlordAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    // ── FTL-15: questions & attentionPoints round-trip ──

    @Test
    @DisplayName("POST /api/viewing-requests with questions & attentionPoints returns them — FTL-15")
    void createViewingRequest_withQuestionsAndAttentionPoints() throws Exception {
        ViewingRequestDto responseDto = ViewingRequestDto.builder()
                .id(70L).status("PENDING")
                .questions("Is the balcony north-facing?")
                .attentionPoints("Wheelchair access needed")
                .build();
        when(viewingRequestService.createViewingRequest(eq(2L), any(CreateViewingRequestRequest.class)))
                .thenReturn(responseDto);

        String body = """
                {
                  "apartmentId": 100,
                  "proposedDateTime": "2026-07-01T10:00:00",
                  "message": "Hello",
                  "questions": "Is the balcony north-facing?",
                  "attentionPoints": "Wheelchair access needed"
                }
                """;

        mockMvc.perform(post("/api/viewing-requests")
                        .with(authentication(tenantAuth())).with(csrf())
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.questions").value("Is the balcony north-facing?"))
                .andExpect(jsonPath("$.attentionPoints").value("Wheelchair access needed"));
    }

    // ── FTL-17: Admin-only listing ──

    @Test
    @DisplayName("GET /api/viewing-requests/admin/all returns 200 for admin — FTL-17")
    void adminGetAllViewingRequests_success() throws Exception {
        when(viewingRequestService.getAllViewingRequestsAdmin(eq(null), any()))
                .thenReturn(new PageImpl<>(List.of(
                        ViewingRequestDto.builder().id(80L).status("PENDING").build(),
                        ViewingRequestDto.builder().id(81L).status("CONFIRMED").build()
                )));

        mockMvc.perform(get("/api/viewing-requests/admin/all")
                        .with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2));
    }

    @Test
    @DisplayName("GET /api/viewing-requests/admin/all with status filter — FTL-17")
    void adminGetAllViewingRequests_filteredByStatus() throws Exception {
        when(viewingRequestService.getAllViewingRequestsAdmin(eq("PENDING"), any()))
                .thenReturn(new PageImpl<>(List.of(
                        ViewingRequestDto.builder().id(80L).status("PENDING").build()
                )));

        mockMvc.perform(get("/api/viewing-requests/admin/all")
                        .param("status", "PENDING")
                        .with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].status").value("PENDING"));
    }

    @Test
    @DisplayName("GET /api/viewing-requests/admin/all forbidden for landlord — FTL-17")
    void adminGetAllViewingRequests_landlordForbidden() throws Exception {
        when(viewingRequestService.getAllViewingRequestsAdmin(eq(null), any()))
                .thenThrow(new SecurityException("Only admins can list all viewing requests"));

        mockMvc.perform(get("/api/viewing-requests/admin/all")
                        .with(authentication(landlordAuth())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/viewing-requests/admin/all forbidden for tenant — FTL-17")
    void adminGetAllViewingRequests_tenantForbidden() throws Exception {
        when(viewingRequestService.getAllViewingRequestsAdmin(eq(null), any()))
                .thenThrow(new SecurityException("Only admins can list all viewing requests"));

        mockMvc.perform(get("/api/viewing-requests/admin/all")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isForbidden());
    }
}
