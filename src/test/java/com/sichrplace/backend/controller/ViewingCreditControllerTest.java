package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ViewingCreditDto;
import com.sichrplace.backend.dto.ViewingCreditSummaryDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.ViewingCreditService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ViewingCreditController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("ViewingCreditController")
class ViewingCreditControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private ViewingCreditService viewingCreditService;
    @MockBean private JwtTokenProvider jwtTokenProvider;

    private UsernamePasswordAuthenticationToken tenantAuth() {
        return new UsernamePasswordAuthenticationToken(
                "1",   // name = userId
                null,
                List.of(new SimpleGrantedAuthority("ROLE_TENANT"))
        );
    }

    @Test
    @DisplayName("GET /api/viewing-credits/me returns credit summary")
    void getMyCreditSummary_returns200() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(tenantAuth());

        ViewingCreditDto activePack = ViewingCreditDto.builder()
                .packId(10L).totalCredits(3).usedCredits(1).creditsRemaining(2)
                .createdAt(Instant.now()).expired(false)
                .purchaseViewingRequestId(100L).build();

        ViewingCreditSummaryDto summary = ViewingCreditSummaryDto.builder()
                .activePack(activePack)
                .totalCreditsRemaining(2)
                .totalCreditsUsed(4)
                .history(List.of(activePack))
                .build();

        when(viewingCreditService.getCreditSummary(1L)).thenReturn(summary);

        mockMvc.perform(get("/api/viewing-credits/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCreditsRemaining").value(2))
                .andExpect(jsonPath("$.totalCreditsUsed").value(4))
                .andExpect(jsonPath("$.activePack.packId").value(10))
                .andExpect(jsonPath("$.activePack.creditsRemaining").value(2))
                .andExpect(jsonPath("$.history").isArray())
                .andExpect(jsonPath("$.history.length()").value(1));
    }

    @Test
    @DisplayName("GET /api/viewing-credits/me with no packs returns empty summary")
    void getMyCreditSummary_noPacks() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(tenantAuth());

        ViewingCreditSummaryDto summary = ViewingCreditSummaryDto.builder()
                .activePack(null)
                .totalCreditsRemaining(0)
                .totalCreditsUsed(0)
                .history(List.of())
                .build();

        when(viewingCreditService.getCreditSummary(1L)).thenReturn(summary);

        mockMvc.perform(get("/api/viewing-credits/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCreditsRemaining").value(0))
                .andExpect(jsonPath("$.activePack").isEmpty());
    }

    @Test
    @DisplayName("GET /api/viewing-credits/me/has-credit returns true when active")
    void hasActiveCredit_true() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(tenantAuth());

        when(viewingCreditService.hasActiveCredit(1L)).thenReturn(true);

        mockMvc.perform(get("/api/viewing-credits/me/has-credit"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(true));
    }

    @Test
    @DisplayName("GET /api/viewing-credits/me/has-credit returns false when none")
    void hasActiveCredit_false() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(tenantAuth());

        when(viewingCreditService.hasActiveCredit(1L)).thenReturn(false);

        mockMvc.perform(get("/api/viewing-credits/me/has-credit"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(false));
    }
}
