package com.sichrplace.backend.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("JwtChannelInterceptor")
class JwtChannelInterceptorTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private JwtChannelInterceptor interceptor;

    // ------------------------------------------------------------------ helpers

    private Message<byte[]> stompConnect(String authHeader, String tokenHeader) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (authHeader != null) accessor.addNativeHeader("Authorization", authHeader);
        if (tokenHeader != null) accessor.addNativeHeader("token", tokenHeader);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private Message<byte[]> stompSubscribe() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.addNativeHeader("destination", "/topic/conversations.1");
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    // --------------------------------------------------------------- CONNECT tests

    @Test
    @DisplayName("valid 'Authorization: Bearer <token>' header — principal is set")
    void connect_validBearerHeader_setsPrincipal() {
        String token = "valid.jwt.token";
        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(token)).thenReturn(42L);
        when(jwtTokenProvider.getRoleFromToken(token)).thenReturn("TENANT");

        Message<?> result = interceptor.preSend(stompConnect("Bearer " + token, null), null);

        assertThat(result).isNotNull();
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        assertThat(resultAccessor.getUser())
                .isInstanceOf(UsernamePasswordAuthenticationToken.class);
        UsernamePasswordAuthenticationToken auth =
                (UsernamePasswordAuthenticationToken) resultAccessor.getUser();
        assertThat(auth.getPrincipal()).isEqualTo(42L);
        assertThat(auth.getAuthorities())
                .extracting(a -> a.getAuthority())
                .containsExactly("ROLE_TENANT");
    }

    @Test
    @DisplayName("valid 'token' fallback header — principal is set")
    void connect_validTokenFallbackHeader_setsPrincipal() {
        String token = "valid.jwt.token.fallback";
        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(token)).thenReturn(7L);
        when(jwtTokenProvider.getRoleFromToken(token)).thenReturn("OWNER");

        Message<?> result = interceptor.preSend(stompConnect(null, token), null);

        assertThat(result).isNotNull();
        UsernamePasswordAuthenticationToken auth =
                (UsernamePasswordAuthenticationToken) StompHeaderAccessor.wrap(result).getUser();
        assertThat(auth.getPrincipal()).isEqualTo(7L);
    }

    @Test
    @DisplayName("missing Authorization header on CONNECT — MessageDeliveryException thrown")
    void connect_missingHeader_throwsMessageDeliveryException() {
        Message<byte[]> msg = stompConnect(null, null);

        assertThatThrownBy(() -> interceptor.preSend(msg, null))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("authentication required");
    }

    @Test
    @DisplayName("invalid / expired JWT on CONNECT — MessageDeliveryException thrown")
    void connect_invalidToken_throwsMessageDeliveryException() {
        String token = "expired.jwt.token";
        when(jwtTokenProvider.validateToken(token)).thenReturn(false);

        assertThatThrownBy(() -> interceptor.preSend(stompConnect("Bearer " + token, null), null))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("authentication failed");
    }

    // --------------------------------------------------------------- Non-CONNECT test

    @Test
    @DisplayName("non-CONNECT frame (SUBSCRIBE) passes through without touching headers")
    void nonConnectFrame_passesThrough() {
        Message<byte[]> msg = stompSubscribe();

        Message<?> result = interceptor.preSend(msg, null);

        assertThat(result).isNotNull();
        // User principal should remain null — no JWT processing on SUBSCRIBE
        assertThat(StompHeaderAccessor.wrap(result).getUser()).isNull();
    }
}
