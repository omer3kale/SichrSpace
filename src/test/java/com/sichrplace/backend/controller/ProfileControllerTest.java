package com.sichrplace.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.ProfileDto;
import com.sichrplace.backend.dto.ProfileRequest;
import com.sichrplace.backend.dto.PublicProfileDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.ProfileService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller-layer tests for ProfileController (FTL-05/06/07).
 */
@WebMvcTest(ProfileController.class)
@Import(GlobalExceptionHandler.class)
@DisplayName("ProfileController")
class ProfileControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private ProfileService profileService;
    @MockBean private JwtTokenProvider jwtTokenProvider;

    private UsernamePasswordAuthenticationToken tenantAuth() {
        return new UsernamePasswordAuthenticationToken(1L, null,
                List.of(new SimpleGrantedAuthority("ROLE_TENANT")));
    }

    @Test
    @DisplayName("GET /api/profiles/me → 200 with full profile")
    void getMyProfile_200() throws Exception {
        ProfileDto dto = ProfileDto.builder()
                .id(1L).email("a@b.com").role("TENANT")
                .firstName("Alice").completionPercentage(42)
                .build();
        when(profileService.getMyProfile(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/profiles/me")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completionPercentage").value(42))
                .andExpect(jsonPath("$.firstName").value("Alice"));
    }

    @Test
    @DisplayName("PUT /api/profiles/me → 200 with updated profile")
    void updateMyProfile_200() throws Exception {
        ProfileRequest req = ProfileRequest.builder()
                .hobbies("reading").smokingStatus("NON_SMOKER").build();

        ProfileDto dto = ProfileDto.builder()
                .id(1L).email("a@b.com").role("TENANT")
                .hobbies("reading").smokingStatus("NON_SMOKER")
                .completionPercentage(25)
                .build();
        when(profileService.updateMyProfile(eq(1L), any())).thenReturn(dto);

        mockMvc.perform(put("/api/profiles/me")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hobbies").value("reading"))
                .andExpect(jsonPath("$.smokingStatus").value("NON_SMOKER"));
    }

    @Test
    @DisplayName("GET /api/profiles/{userId}/public → 200 with limited fields")
    void getPublicProfile_200() throws Exception {
        PublicProfileDto dto = PublicProfileDto.builder()
                .id(2L).firstName("Bob").role("LANDLORD")
                .companyName("Wohnraum GmbH").build();
        when(profileService.getPublicProfile(2L)).thenReturn(dto);

        mockMvc.perform(get("/api/profiles/2/public")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Bob"))
                .andExpect(jsonPath("$.companyName").value("Wohnraum GmbH"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.phone").doesNotExist());
    }
}
