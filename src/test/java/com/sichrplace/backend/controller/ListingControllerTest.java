package com.sichrplace.backend.controller;

import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.ListingDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.ListingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ListingController.class)
@Import(GlobalExceptionHandler.class)
@DisplayName("ListingController")
class ListingControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private ListingService listingService;
    @MockBean private JwtTokenProvider jwtTokenProvider;

    private UsernamePasswordAuthenticationToken tenantAuth() {
        return new UsernamePasswordAuthenticationToken(
                1L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_TENANT"))
        );
    }

    @Test
    void getAllListings_returns200() throws Exception {
        when(listingService.getAllListings())
                .thenReturn(List.of(ListingDto.builder().id(1L).title("L1").build()));

        mockMvc.perform(get("/api/listings").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void getListingById_notFound_returns404() throws Exception {
        when(listingService.getListingById(99L)).thenReturn(null);

        mockMvc.perform(get("/api/listings/99").with(authentication(tenantAuth())))
                .andExpect(status().isNotFound());
    }

    @Test
    void getListingById_found_returns200() throws Exception {
        when(listingService.getListingById(1L)).thenReturn(ListingDto.builder().id(1L).title("ok").build());

        mockMvc.perform(get("/api/listings/1").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void getListingById_typeMismatch_returns400() throws Exception {
        mockMvc.perform(get("/api/listings/not-number").with(authentication(tenantAuth())))
                .andExpect(status().isBadRequest());
    }
}
