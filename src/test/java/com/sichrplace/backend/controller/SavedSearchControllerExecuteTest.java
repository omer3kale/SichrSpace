package com.sichrplace.backend.controller;

import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.SavedSearchService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SavedSearchController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
@DisplayName("SavedSearchController — Execute Saved Search")
class SavedSearchControllerExecuteTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SavedSearchService savedSearchService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setAuth() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of())
        );
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("POST /api/saved-searches/{id}/execute returns paged apartments")
    void executeSavedSearch_success() throws Exception {
        ApartmentDto apt = ApartmentDto.builder()
                .id(200L)
                .title("Cozy Berlin Flat")
                .city("Berlin")
                .build();
        Page<ApartmentDto> page = new PageImpl<>(List.of(apt), PageRequest.of(0, 20), 1);

        when(savedSearchService.executeSavedSearch(eq(10L), eq(1L), any()))
                .thenReturn(page);

        mockMvc.perform(post("/api/saved-searches/10/execute?page=0&size=20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(200))
                .andExpect(jsonPath("$.content[0].title").value("Cozy Berlin Flat"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("POST /api/saved-searches/{id}/execute returns 403 for non-owner")
    void executeSavedSearch_forbidden() throws Exception {
        when(savedSearchService.executeSavedSearch(eq(10L), eq(1L), any()))
                .thenThrow(new SecurityException("Not authorized to execute this saved search"));

        mockMvc.perform(post("/api/saved-searches/10/execute"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Not authorized to execute this saved search"));
    }

    @Test
    @DisplayName("POST /api/saved-searches/{id}/execute returns 404 when search not found")
    void executeSavedSearch_notFound() throws Exception {
        when(savedSearchService.executeSavedSearch(eq(999L), eq(1L), any()))
                .thenThrow(new IllegalArgumentException("Saved search not found"));

        mockMvc.perform(post("/api/saved-searches/999/execute"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Saved search not found"));
    }

    @Test
    @DisplayName("POST /api/saved-searches/{id}/execute returns 400 for invalid filter json")
    void executeSavedSearch_invalidFilterJson() throws Exception {
        when(savedSearchService.executeSavedSearch(eq(10L), eq(1L), any()))
                .thenThrow(new IllegalArgumentException("Invalid filter_json in saved search"));

        mockMvc.perform(post("/api/saved-searches/10/execute"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid filter_json in saved search"));
    }
}
