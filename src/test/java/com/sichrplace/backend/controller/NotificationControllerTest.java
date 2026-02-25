package com.sichrplace.backend.controller;

import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.NotificationDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.NotificationService;
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

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NotificationController.class)
@Import(GlobalExceptionHandler.class)
@DisplayName("NotificationController")
class NotificationControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private NotificationService notificationService;
    @MockBean private JwtTokenProvider jwtTokenProvider;

    private UsernamePasswordAuthenticationToken tenantAuth() {
        return new UsernamePasswordAuthenticationToken(
                1L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_TENANT"))
        );
    }

    @Test
    void getNotifications_returns200() throws Exception {
        when(notificationService.getUserNotifications(org.mockito.ArgumentMatchers.eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of(NotificationDto.builder().id(10L).title("t").build())));

        mockMvc.perform(get("/api/notifications").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(10));
    }

    @Test
    void getUnreadNotifications_returns200() throws Exception {
        when(notificationService.getUnreadNotifications(org.mockito.ArgumentMatchers.eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of(NotificationDto.builder().id(11L).title("u").build())));

        mockMvc.perform(get("/api/notifications/unread").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(11));
    }

    @Test
    void getUnreadCount_returns200() throws Exception {
        when(notificationService.getUnreadCount(1L)).thenReturn(7L);

        mockMvc.perform(get("/api/notifications/unread/count").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(7));
    }

    @Test
    void markAsRead_returns200() throws Exception {
        when(notificationService.markAsRead(1L, 12L))
                                .thenReturn(NotificationDto.builder().id(12L).readAt(Instant.now()).build());

        mockMvc.perform(patch("/api/notifications/12/read").with(authentication(tenantAuth())).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(12));
    }

    @Test
    void markAllAsRead_returns200() throws Exception {
        when(notificationService.markAllAsRead(1L)).thenReturn(3);

        mockMvc.perform(patch("/api/notifications/read-all").with(authentication(tenantAuth())).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.markedRead").value(3));
    }

    @Test
    void deleteNotification_returns204_and_maps403() throws Exception {
        mockMvc.perform(delete("/api/notifications/12").with(authentication(tenantAuth())).with(csrf()))
                .andExpect(status().isNoContent());

        doThrow(new SecurityException("Denied"))
                .when(notificationService).deleteNotification(1L, 33L);

        mockMvc.perform(delete("/api/notifications/33").with(authentication(tenantAuth())).with(csrf()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Denied"));
    }
}