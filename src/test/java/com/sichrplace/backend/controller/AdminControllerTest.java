package com.sichrplace.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.AdminDashboardDto;
import com.sichrplace.backend.dto.ConversationReportDto;
import com.sichrplace.backend.dto.ReviewDto;
import com.sichrplace.backend.dto.SupportTicketDto;
import com.sichrplace.backend.dto.UserDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.AdminService;
import com.sichrplace.backend.service.ConversationReportService;
import com.sichrplace.backend.service.ReviewService;
import com.sichrplace.backend.service.SupportTicketService;
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

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
@Import(GlobalExceptionHandler.class)
@DisplayName("AdminController")
class AdminControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private AdminService adminService;
    @MockBean private ReviewService reviewService;
    @MockBean private ConversationReportService conversationReportService;
    @MockBean private SupportTicketService supportTicketService;
    @MockBean private JwtTokenProvider jwtTokenProvider;

    private UsernamePasswordAuthenticationToken adminAuth() {
        return new UsernamePasswordAuthenticationToken(
                1L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
    }

    private UsernamePasswordAuthenticationToken tenantAuth() {
        return new UsernamePasswordAuthenticationToken(
                2L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_TENANT"))
        );
    }

    @Test
    void getDashboard_asAdmin_returns200() throws Exception {
        when(adminService.getDashboard()).thenReturn(AdminDashboardDto.builder().totalUsers(10).build());

        mockMvc.perform(get("/api/admin/dashboard").with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").value(10));
    }

    @Test
    void getDashboard_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getDashboard_nonAdmin_returns403() throws Exception {
        when(adminService.getDashboard()).thenThrow(new SecurityException("Forbidden"));

        mockMvc.perform(get("/api/admin/dashboard").with(authentication(tenantAuth())))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void updateUserRole_asAdmin_returns200() throws Exception {
        when(adminService.updateUserRole(eq(1L), eq(5L), any()))
                .thenReturn(UserDto.builder().id(5L).role("LANDLORD").build());

        mockMvc.perform(patch("/api/admin/users/5/role")
                        .with(authentication(adminAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("role", "LANDLORD"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5));
    }

    @Test
    void updateUserRole_validationError_returns400() throws Exception {
        mockMvc.perform(patch("/api/admin/users/5/role")
                        .with(authentication(adminAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"));
    }

            @Test
            void getAllUsers_and_updateStatus_returns200() throws Exception {
            when(adminService.getAllUsers(any()))
                .thenReturn(new PageImpl<>(List.of(UserDto.builder().id(7L).email("u@x.com").build())));
            when(adminService.updateUserStatus(eq(1L), eq(7L), any()))
                .thenReturn(UserDto.builder().id(7L).isActive(false).build());

            mockMvc.perform(get("/api/admin/users").with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(7));

            mockMvc.perform(patch("/api/admin/users/7/status")
                    .with(authentication(adminAuth()))
                    .with(csrf())
                    .contentType("application/json")
                    .content(objectMapper.writeValueAsString(Map.of("status", "SUSPENDED", "reason", "policy"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7));
            }

            @Test
            void reviewModerationEndpoints_return200() throws Exception {
            when(reviewService.getPendingReviews(any()))
                .thenReturn(new PageImpl<>(List.of(ReviewDto.builder().id(9L).status("PENDING").build())));
            when(reviewService.moderateReview(eq(1L), eq(9L), any()))
                .thenReturn(ReviewDto.builder().id(9L).status("APPROVED").build());

            mockMvc.perform(get("/api/admin/reviews/pending").with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(9));

            mockMvc.perform(post("/api/admin/reviews/9/moderate")
                    .with(authentication(adminAuth()))
                    .with(csrf())
                    .contentType("application/json")
                    .content(objectMapper.writeValueAsString(Map.of("action", "APPROVED", "notes", "ok"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
            }

    @Test
    void getConversationReports_asAdmin_returns200() throws Exception {
        when(conversationReportService.getReports(eq(null), any()))
                .thenReturn(new PageImpl<>(List.of(
                        ConversationReportDto.builder()
                                .id(1L).conversationId(10L).reporterId(5L)
                                .reason("spam").status("PENDING").build())));

        mockMvc.perform(get("/api/admin/conversations/reports")
                        .with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].status").value("PENDING"));
    }

    @Test
    void getConversationReports_filterByStatus_returns200() throws Exception {
        when(conversationReportService.getReports(eq("PENDING"), any()))
                .thenReturn(new PageImpl<>(List.of(
                        ConversationReportDto.builder()
                                .id(1L).status("PENDING").build())));

        mockMvc.perform(get("/api/admin/conversations/reports")
                        .param("status", "PENDING")
                        .with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].status").value("PENDING"));
    }

    @Test
    void getConversationReports_nonAdmin_returns403() throws Exception {
        when(conversationReportService.getReports(eq(null), any()))
                .thenThrow(new SecurityException("Forbidden"));

        mockMvc.perform(get("/api/admin/conversations/reports")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateConversationReportStatus_asAdmin_returns200() throws Exception {
        when(conversationReportService.updateReportStatus(eq(1L), eq(5L), eq("REVIEWED")))
                .thenReturn(ConversationReportDto.builder()
                        .id(5L).status("REVIEWED").build());

        mockMvc.perform(patch("/api/admin/conversations/reports/5")
                        .with(authentication(adminAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("status", "REVIEWED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REVIEWED"));
    }

    @Test
    void updateConversationReportStatus_blankStatus_returns400() throws Exception {
        mockMvc.perform(patch("/api/admin/conversations/reports/5")
                        .with(authentication(adminAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("status", "  "))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateConversationReportStatus_nonAdmin_returns403() throws Exception {
        when(conversationReportService.updateReportStatus(eq(2L), eq(5L), eq("REVIEWED")))
                .thenThrow(new SecurityException("Forbidden"));

        mockMvc.perform(patch("/api/admin/conversations/reports/5")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("status", "REVIEWED"))))
                .andExpect(status().isForbidden());
    }

    // ── Support Ticket admin endpoints ──

    @Test
    @DisplayName("GET /api/admin/support/tickets returns 200 with page of tickets")
    void getSupportTickets_returns200() throws Exception {
        SupportTicketDto dto = SupportTicketDto.builder()
                .id(100L).userId(1L).subject("Help").message("Issue")
                .category("GENERAL").status("OPEN").build();

        when(supportTicketService.getAllTickets(eq(null), any()))
                .thenReturn(new PageImpl<>(List.of(dto)));

        mockMvc.perform(get("/api/admin/support/tickets")
                        .with(authentication(adminAuth()))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(100))
                .andExpect(jsonPath("$.content[0].status").value("OPEN"));
    }

    @Test
    @DisplayName("PATCH /api/admin/support/tickets/{id} responds to ticket")
    void respondToTicket_returns200() throws Exception {
        SupportTicketDto dto = SupportTicketDto.builder()
                .id(100L).userId(1L).subject("Help").message("Issue")
                .category("GENERAL").status("RESOLVED")
                .adminResponse("Fixed!").resolvedBy(1L).build();

        when(supportTicketService.respondToTicket(eq(100L), eq(1L), eq("Fixed!"), eq("RESOLVED")))
                .thenReturn(dto);

        mockMvc.perform(patch("/api/admin/support/tickets/100")
                        .with(authentication(adminAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("response", "Fixed!", "status", "RESOLVED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.adminResponse").value("Fixed!"));
    }

    @Test
    @DisplayName("PATCH /api/admin/support/tickets/{id} with blank response returns 400")
    void respondToTicket_blankResponse_returns400() throws Exception {
        mockMvc.perform(patch("/api/admin/support/tickets/100")
                        .with(authentication(adminAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("response", "", "status", "RESOLVED"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/admin/support/tickets with status filter returns 200")
    void getSupportTickets_withStatusFilter_returns200() throws Exception {
        SupportTicketDto dto = SupportTicketDto.builder()
                .id(200L).userId(2L).subject("Filter test").message("Testing")
                .category("GENERAL").status("OPEN").build();

        when(supportTicketService.getAllTickets(eq("OPEN"), any()))
                .thenReturn(new PageImpl<>(List.of(dto)));

        mockMvc.perform(get("/api/admin/support/tickets")
                        .param("status", "OPEN")
                        .with(authentication(adminAuth()))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].status").value("OPEN"));
    }
}
