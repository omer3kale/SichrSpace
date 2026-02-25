package com.sichrplace.backend.config;

import com.sichrplace.backend.security.JwtChannelInterceptor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("WebSocketConfig")
class WebSocketConfigTest {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private WebSocketConfig webSocketConfig;

    @Test
    @DisplayName("WebSocketConfig bean is loaded in application context")
    void webSocketConfig_beanPresent() {
        assertThat(context.containsBean("webSocketConfig")).isTrue();
    }

    @Test
    @DisplayName("JwtChannelInterceptor bean is present in application context")
    void jwtChannelInterceptor_beanPresent() {
        assertThat(context.getBean(JwtChannelInterceptor.class)).isNotNull();
    }

    @Test
    @DisplayName("SimpMessagingTemplate bean is present (injected by WebSocket auto-config)")
    void simpMessagingTemplate_beanPresent() {
        assertThat(context.getBean(SimpMessagingTemplate.class)).isNotNull();
    }

    @Test
    @DisplayName("allowed-origins property is configured (non-blank)")
    void allowedOrigins_configured() {
        // Confirms @Value injection worked; actual value comes from application-test.yml / defaults
        String origins = webSocketConfig.getAllowedOriginsRaw();
        assertThat(origins).isNotBlank();
    }
}
