package com.sichrplace.backend.config;

import com.sichrplace.backend.security.JwtChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP-over-WebSocket configuration for SichrPlace realtime features.
 *
 * <h3>Endpoint</h3>
 * <ul>
 *   <li>{@code /ws} — WebSocket handshake (with SockJS fallback for browsers that
 *       do not support native WebSocket)</li>
 * </ul>
 *
 * <h3>Topic conventions</h3>
 * <ul>
 *   <li>{@code /topic/conversations.{conversationId}} — new messages pushed to all
 *       participants of a conversation</li>
 *   <li>{@code /user/queue/notifications} — per-user notification push (server → client)</li>
 *   <li>{@code /user/queue/viewing-requests} — per-user viewing-request status updates</li>
 * </ul>
 *
 * <h3>Authentication</h3>
 * Every STOMP {@code CONNECT} frame must carry a {@code Authorization: Bearer <jwt>}
 * native header.  The {@link JwtChannelInterceptor} validates the token and sets the
 * authenticated principal before the connection is accepted.  Unauthenticated
 * {@code CONNECT} frames are rejected with a {@link org.springframework.messaging.MessageDeliveryException}.
 *
 * <h3>Teaching note</h3>
 * The simple in-memory broker ({@code enableSimpleBroker}) is sufficient for a
 * single-instance deployment.  For horizontal scaling, replace it with a full
 * STOMP broker relay backed by RabbitMQ or ActiveMQ.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:8080}")
    private String allowedOriginsRaw;

    /**
     * Register the STOMP endpoint.
     *
     * <p>Frontend connects to {@code ws://host/ws} (native) or falls back to
     * SockJS HTTP polling at {@code http://host/ws}.
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = allowedOriginsRaw.split("\\s*,\\s*");
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins)
                .withSockJS();
    }

    /**
     * Configure the in-memory message broker.
     *
     * <ul>
     *   <li>{@code /topic} — broadcast destinations (conversation rooms)</li>
     *   <li>{@code /queue} — point-to-point destinations (per-user queues)</li>
     *   <li>{@code /app} — prefix for {@code @MessageMapping} methods</li>
     *   <li>{@code /user} — prefix for user-specific destinations
     *       ({@code convertAndSendToUser})</li>
     * </ul>
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    /**
     * Register the {@link JwtChannelInterceptor} on the inbound channel.
     *
     * <p>The interceptor runs before any message is dispatched, validating the
     * JWT on every {@code CONNECT} frame.  See {@link JwtChannelInterceptor}
     * for the full validation logic.
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(jwtChannelInterceptor);
    }

    /** Exposed for testing: the raw comma-separated allowed-origins value. */
    public String getAllowedOriginsRaw() {
        return allowedOriginsRaw;
    }
}
