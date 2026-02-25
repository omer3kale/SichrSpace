package com.sichrplace.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.dto.CreateSupportTicketRequest;
import com.sichrplace.backend.dto.SupportTicketDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.SupportTicketService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SupportTicketController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("SupportTicketController")
class SupportTicketControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private SupportTicketService supportTicketService;
    @MockBean private JwtTokenProvider jwtTokenProvider;

    private UsernamePasswordAuthenticationToken tenantAuth() {
        return new UsernamePasswordAuthenticationToken(
                "1", null,
                List.of(new SimpleGrantedAuthority("ROLE_TENANT")));
    }

    @Test
    @DisplayName("POST /api/support/tickets creates ticket and returns 201")
    void createTicket_returns201() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(tenantAuth());

        SupportTicketDto dto = SupportTicketDto.builder()
                .id(100L).userId(1L).subject("Need help")
                .message("Issue details").category("GENERAL").status("OPEN")
                .createdAt(Instant.now()).build();

        when(supportTicketService.createTicket(eq(1L), any(CreateSupportTicketRequest.class)))
                .thenReturn(dto);

        CreateSupportTicketRequest request = CreateSupportTicketRequest.builder()
                .subject("Need help").message("Issue details").build();

        mockMvc.perform(post("/api/support/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.subject").value("Need help"))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    @DisplayName("GET /api/support/tickets returns my tickets")
    void getMyTickets_returns200() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(tenantAuth());

        SupportTicketDto dto = SupportTicketDto.builder()
                .id(100L).userId(1L).subject("Help")
                .message("Issue").category("GENERAL").status("OPEN")
                .createdAt(Instant.now()).build();

        when(supportTicketService.getMyTickets(1L)).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/support/tickets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(100))
                .andExpect(jsonPath("$[0].status").value("OPEN"));
    }
}
