package com.sichrplace.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.dto.ApartmentSearchCardDto;
import com.sichrplace.backend.dto.CreateApartmentRequest;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.ApartmentService;
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

import java.math.BigDecimal;
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

@WebMvcTest(ApartmentController.class)
@Import(GlobalExceptionHandler.class)
@DisplayName("ApartmentController")
class ApartmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ApartmentService apartmentService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    private UsernamePasswordAuthenticationToken landlordAuth() {
        return new UsernamePasswordAuthenticationToken(1L, null, List.of(new SimpleGrantedAuthority("ROLE_LANDLORD")));
    }

    private UsernamePasswordAuthenticationToken tenantAuth() {
        return new UsernamePasswordAuthenticationToken(2L, null, List.of(new SimpleGrantedAuthority("ROLE_TENANT")));
    }

    private CreateApartmentRequest validRequest() {
        return CreateApartmentRequest.builder()
                .title("Center Flat")
                .city("Berlin")
                .monthlyRent(new BigDecimal("1200"))
                .build();
    }

    @Test
    void create_returns201() throws Exception {
        when(apartmentService.createApartment(eq(1L), any(CreateApartmentRequest.class)))
                .thenReturn(ApartmentDto.builder().id(10L).title("Center Flat").build());

        mockMvc.perform(post("/api/apartments")
                        .with(authentication(landlordAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void create_validation400() throws Exception {
        mockMvc.perform(post("/api/apartments")
                        .with(authentication(landlordAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"));
    }

    @Test
    void create_requiresAuth401_and_role403() throws Exception {
        mockMvc.perform(post("/api/apartments").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isUnauthorized());

        when(apartmentService.createApartment(eq(2L), any(CreateApartmentRequest.class)))
                .thenThrow(new SecurityException("Forbidden"));
        mockMvc.perform(post("/api/apartments")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isForbidden());
    }

    @Test
    void listAndGetById_public200_and_notFound404_and_badParam400() throws Exception {
        when(apartmentService.searchApartments(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(ApartmentDto.builder().id(1L).title("A").build())));
        when(apartmentService.getApartmentById(1L)).thenReturn(ApartmentDto.builder().id(1L).title("A").build());
        when(apartmentService.getApartmentById(999L)).thenThrow(new IllegalArgumentException("Apartment not found"));

        mockMvc.perform(get("/api/apartments").param("city", "Berlin").with(authentication(landlordAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1));

        mockMvc.perform(get("/api/apartments/1").with(authentication(landlordAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));

        mockMvc.perform(get("/api/apartments/999").with(authentication(landlordAuth())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Apartment not found"));

        mockMvc.perform(get("/api/apartments").param("minPrice", "abc").with(authentication(landlordAuth())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ownerListings_requiresRole_and_returns200() throws Exception {
        when(apartmentService.getApartmentsByOwner(1L))
                .thenReturn(List.of(ApartmentDto.builder().id(22L).build()));

        mockMvc.perform(get("/api/apartments/owner/listings").with(authentication(landlordAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(22));

        mockMvc.perform(get("/api/apartments/owner/listings"))
                .andExpect(status().isUnauthorized());

        when(apartmentService.getApartmentsByOwner(2L)).thenThrow(new SecurityException("Forbidden"));
        mockMvc.perform(get("/api/apartments/owner/listings").with(authentication(tenantAuth())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void update_and_delete_paths() throws Exception {
        when(apartmentService.updateApartment(eq(10L), eq(1L), any(CreateApartmentRequest.class)))
                .thenReturn(ApartmentDto.builder().id(10L).title("Updated").build());
        doThrow(new SecurityException("Not the apartment owner"))
                .when(apartmentService).deleteApartment(10L, 1L);
        when(apartmentService.updateApartment(eq(10L), eq(2L), any(CreateApartmentRequest.class)))
                .thenThrow(new SecurityException("Not the apartment owner"));

        mockMvc.perform(put("/api/apartments/10")
                        .with(authentication(landlordAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated"));

        mockMvc.perform(put("/api/apartments/10")
                        .with(authentication(landlordAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(delete("/api/apartments/10")
                        .with(authentication(landlordAuth()))
                        .with(csrf()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Not the apartment owner"));

        mockMvc.perform(put("/api/apartments/10")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isForbidden());

        doThrow(new IllegalArgumentException("Apartment not found")).when(apartmentService).deleteApartment(999L, 1L);
        mockMvc.perform(delete("/api/apartments/999")
                        .with(authentication(landlordAuth()))
                        .with(csrf()))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/apartments/10").with(csrf()))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string(org.hamcrest.Matchers.notNullValue()));
    }

        @Test
        void delete_success204() throws Exception {
                mockMvc.perform(delete("/api/apartments/10")
                                                .with(authentication(landlordAuth()))
                                                .with(csrf()))
                                .andExpect(status().isNoContent())
                                .andExpect(content().string(""));
        }

    @Test
    @DisplayName("GET /api/apartments/search returns card DTOs")
    void search_returnsCards200() throws Exception {
        ApartmentSearchCardDto card = ApartmentSearchCardDto.builder()
                .id(1L).city("Berlin").district("Mitte")
                .pricePerMonth(new BigDecimal("900"))
                .propertyType("APARTMENT")
                .furnishedStatus("FURNISHED")
                .petFriendly(true)
                .build();

        when(apartmentService.searchApartmentCards(
                any(), any(), any(), any(), any(), any(),
                any(), any(), any(),
                any(), any(), any(), any(), any(),
                any(), any(),
                any(), any(), any(), any(), any(), any(),
                any()))
                .thenReturn(new PageImpl<>(List.of(card)));

        mockMvc.perform(get("/api/apartments/search")
                        .param("city", "Berlin")
                        .param("petFriendly", "true")
                        .param("propertyType", "APARTMENT")
                        .with(authentication(landlordAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].city").value("Berlin"))
                .andExpect(jsonPath("$.content[0].district").value("Mitte"))
                .andExpect(jsonPath("$.content[0].propertyType").value("APARTMENT"))
                .andExpect(jsonPath("$.content[0].petFriendly").value(true))
                .andExpect(jsonPath("$.content[0].furnishedStatus").value("FURNISHED"));
    }

    @Test
    @DisplayName("GET /api/apartments/search with no params returns 200")
    void search_noParams_returns200() throws Exception {
        when(apartmentService.searchApartmentCards(
                any(), any(), any(), any(), any(), any(),
                any(), any(), any(),
                any(), any(), any(), any(), any(),
                any(), any(),
                any(), any(), any(), any(), any(), any(),
                any()))
                .thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/apartments/search")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content").isEmpty());
    }
}
