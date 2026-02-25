package com.sichrplace.backend.controller;

import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.FavoriteDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.FavoriteService;
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

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FavoriteController.class)
@Import(GlobalExceptionHandler.class)
@DisplayName("FavoriteController")
class FavoriteControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private FavoriteService favoriteService;
    @MockBean private JwtTokenProvider jwtTokenProvider;

    private UsernamePasswordAuthenticationToken tenantAuth() {
        return new UsernamePasswordAuthenticationToken(
                1L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_TENANT"))
        );
    }

    @Test
    void addFavorite_returns201() throws Exception {
        when(favoriteService.addFavorite(1L, 9L))
                .thenReturn(FavoriteDto.builder().id(100L).apartmentId(9L).apartmentTitle("Apt").build());

        mockMvc.perform(post("/api/favorites/9").with(authentication(tenantAuth())).with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(100));
    }

    @Test
    void addFavorite_badPathType_returns400() throws Exception {
        mockMvc.perform(post("/api/favorites/not-a-number").with(authentication(tenantAuth())).with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getFavorites_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/favorites"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void removeFavorite_securityException_returns403() throws Exception {
        org.mockito.Mockito.doThrow(new SecurityException("Denied"))
                .when(favoriteService).removeFavorite(1L, 9L);

        mockMvc.perform(delete("/api/favorites/9").with(authentication(tenantAuth())).with(csrf()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Denied"));
    }

        @Test
        void removeFavorite_success204() throws Exception {
                mockMvc.perform(delete("/api/favorites/9").with(authentication(tenantAuth())).with(csrf()))
                                .andExpect(status().isNoContent());
        }

        @Test
        void getMyFavorites_returns200() throws Exception {
                when(favoriteService.getUserFavorites(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.any()))
                                .thenReturn(new PageImpl<>(List.of(FavoriteDto.builder().id(1L).apartmentId(9L).build())));

                mockMvc.perform(get("/api/favorites").with(authentication(tenantAuth())))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content[0].id").value(1));
        }

        @Test
        void checkFavorite_returns200() throws Exception {
                when(favoriteService.isFavorited(1L, 9L)).thenReturn(true);

                mockMvc.perform(get("/api/favorites/9/check").with(authentication(tenantAuth())))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.favorited").value(true));
        }

        @Test
        void getFavoriteCount_returns200() throws Exception {
                when(favoriteService.getFavoriteCount(1L)).thenReturn(4L);

                mockMvc.perform(get("/api/favorites/count").with(authentication(tenantAuth())))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.count").value(4));
        }
}
