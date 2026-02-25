package com.sichrplace.backend.controller;

import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.FeatureFlagsDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.FeatureFlagService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FeatureFlagController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
@DisplayName("FeatureFlagController — FTL-23")
class FeatureFlagControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private FeatureFlagService featureFlagService;
    @MockBean private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("200 — returns all flags (public, no auth required)")
    void returnsFlagsPublicly() throws Exception {
        Map<String, Boolean> flags = new LinkedHashMap<>();
        flags.put("smartMatching", true);
        flags.put("securePayments", true);
        flags.put("googleMaps", false);
        flags.put("chat", true);

        when(featureFlagService.getFlags())
                .thenReturn(FeatureFlagsDto.builder().flags(flags).build());

        mockMvc.perform(get("/api/feature-flags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flags.smartMatching").value(true))
                .andExpect(jsonPath("$.flags.securePayments").value(true))
                .andExpect(jsonPath("$.flags.googleMaps").value(false))
                .andExpect(jsonPath("$.flags.chat").value(true));
    }

    @Test
    @DisplayName("200 — accessible without authentication")
    void noAuthRequired() throws Exception {
        when(featureFlagService.getFlags())
                .thenReturn(FeatureFlagsDto.builder().flags(Map.of()).build());

        // No authentication provided — should still return 200
        mockMvc.perform(get("/api/feature-flags"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("200 — returns empty flags map")
    void emptyFlags() throws Exception {
        when(featureFlagService.getFlags())
                .thenReturn(FeatureFlagsDto.builder().flags(Map.of()).build());

        mockMvc.perform(get("/api/feature-flags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flags").isEmpty());
    }
}
