package com.sichrplace.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.dto.CreateSavedSearchRequest;
import com.sichrplace.backend.dto.SavedSearchDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.SavedSearchService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SavedSearchController.class)
@Import(GlobalExceptionHandler.class)
@DisplayName("SavedSearchController")
class SavedSearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SavedSearchService savedSearchService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    private UsernamePasswordAuthenticationToken userAuth() {
        return new UsernamePasswordAuthenticationToken(1L, null, List.of(new SimpleGrantedAuthority("ROLE_TENANT")));
    }

    @Test
    void create_and_list_and_get_and_toggle_and_delete_paths() throws Exception {
        CreateSavedSearchRequest request = CreateSavedSearchRequest.builder().name("Berlin").filterJson("{\"city\":\"Berlin\"}").build();
        SavedSearchDto dto = SavedSearchDto.builder().id(10L).name("Berlin").build();

        when(savedSearchService.createSavedSearch(eq(1L), any(CreateSavedSearchRequest.class))).thenReturn(dto);
        when(savedSearchService.getSavedSearchesByUser(1L)).thenReturn(List.of(dto));
        when(savedSearchService.getSavedSearchById(10L, 1L)).thenReturn(dto);
        when(savedSearchService.toggleActive(10L, 1L)).thenReturn(SavedSearchDto.builder().id(10L).isActive(false).build());

        mockMvc.perform(post("/api/saved-searches")
                        .with(authentication(userAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10));

        mockMvc.perform(get("/api/saved-searches").with(authentication(userAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10));

        mockMvc.perform(get("/api/saved-searches/10").with(authentication(userAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10));

        mockMvc.perform(put("/api/saved-searches/10/toggle").with(authentication(userAuth())).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(false));

        mockMvc.perform(delete("/api/saved-searches/10").with(authentication(userAuth())).with(csrf()))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
    }

    @Test
    void create_validation400_and_unauthorized401() throws Exception {
        mockMvc.perform(post("/api/saved-searches")
                        .with(authentication(userAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/saved-searches")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CreateSavedSearchRequest.builder().name("X").filterJson("{}").build())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void execute_saved_search_success_empty_forbidden_notfound_invalidFilter_unauthorized() throws Exception {
        when(savedSearchService.executeSavedSearch(eq(10L), eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of(ApartmentDto.builder().id(5L).title("Flat").build())));

        mockMvc.perform(post("/api/saved-searches/10/execute").with(authentication(userAuth())).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(5));

        when(savedSearchService.executeSavedSearch(eq(11L), eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of()));
        mockMvc.perform(post("/api/saved-searches/11/execute").with(authentication(userAuth())).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(0));

        when(savedSearchService.executeSavedSearch(eq(12L), eq(1L), any()))
                .thenThrow(new SecurityException("Not authorized to execute this saved search"));
        mockMvc.perform(post("/api/saved-searches/12/execute").with(authentication(userAuth())).with(csrf()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Not authorized to execute this saved search"));

        when(savedSearchService.executeSavedSearch(eq(13L), eq(1L), any()))
                .thenThrow(new IllegalArgumentException("Saved search not found"));
        mockMvc.perform(post("/api/saved-searches/13/execute").with(authentication(userAuth())).with(csrf()))
                .andExpect(status().isNotFound());

        when(savedSearchService.executeSavedSearch(eq(14L), eq(1L), any()))
                .thenThrow(new IllegalArgumentException("Invalid filter_json in saved search"));
        mockMvc.perform(post("/api/saved-searches/14/execute").with(authentication(userAuth())).with(csrf()))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/saved-searches/10/execute").with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void get_toggle_delete_forbidden_or_notfound() throws Exception {
        when(savedSearchService.getSavedSearchById(99L, 1L)).thenThrow(new IllegalArgumentException("Saved search not found"));
        mockMvc.perform(get("/api/saved-searches/99").with(authentication(userAuth())))
                .andExpect(status().isNotFound());

        when(savedSearchService.toggleActive(88L, 1L)).thenThrow(new SecurityException("Not the search owner"));
        mockMvc.perform(put("/api/saved-searches/88/toggle").with(authentication(userAuth())).with(csrf()))
                .andExpect(status().isForbidden());

        doThrow(new IllegalArgumentException("Saved search not found")).when(savedSearchService).deleteSavedSearch(77L, 1L);
        mockMvc.perform(delete("/api/saved-searches/77").with(authentication(userAuth())).with(csrf()))
                .andExpect(status().isNotFound());
    }
}
