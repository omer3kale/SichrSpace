package com.sichrplace.backend.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * STOMP channel interceptor that enforces JWT authentication on every
 * WebSocket connection.
 *
 * <h3>How it works</h3>
 * <ol>
 *   <li>Intercepts every inbound STOMP frame.</li>
 *   <li>On {@code CONNECT} frames only: reads the {@code Authorization} native
 *       header (format: {@code Bearer <jwt>}).  Falls back to a plain
 *       {@code token} header for SockJS clients that cannot set custom
 *       HTTP headers.</li>
 *   <li>Validates the token via {@link JwtTokenProvider#validateToken(String)}.</li>
 *   <li>On success: builds an authenticated
 *       {@link UsernamePasswordAuthenticationToken} carrying the {@code userId}
 *       (Long) as the principal, then sets it as the STOMP session user via
 *       {@link StompHeaderAccessor#setUser(java.security.Principal)}.</li>
 *   <li>On failure (missing / invalid token): throws
 *       {@link MessageDeliveryException}, which closes the connection with a
 *       STOMP {@code ERROR} frame.</li>
 * </ol>
 *
 * <h3>Non-CONNECT frames</h3>
 * All other frame types (SUBSCRIBE, SEND, DISCONNECT, etc.) pass through
 * unchanged.  The STOMP session user set during CONNECT is automatically
 * propagated to subsequent frames by the Spring messaging infrastructure.
 *
 * <h3>Teaching note</h3>
 * The JWT is intentionally transported in the STOMP {@code CONNECT} frame
 * header rather than the HTTP handshake, because:
 * <ul>
 *   <li>SockJS transports (XHR, EventSource) do not reliably forward custom
 *       HTTP headers.</li>
 *   <li>Query parameters in the handshake URL would be logged by proxies/CDNs.</li>
 *   <li>STOMP headers are framing-layer data sent after the WebSocket tunnel is
 *       established — only the server sees them.</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String jwt = resolveToken(accessor);

            if (jwt == null || jwt.isBlank()) {
                log.warn("WS CONNECT rejected — missing JWT token");
                throw new MessageDeliveryException(message,
                        "WebSocket authentication required: provide Authorization: Bearer <token> header");
            }

            if (!jwtTokenProvider.validateToken(jwt)) {
                log.warn("WS CONNECT rejected — invalid JWT token");
                throw new MessageDeliveryException(message,
                        "WebSocket authentication failed: invalid or expired JWT token");
            }

            Long userId = jwtTokenProvider.getUserIdFromToken(jwt);
            String role  = jwtTokenProvider.getRoleFromToken(jwt);

            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    userId, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));

            accessor.setUser(auth);
            log.debug("WS CONNECT authenticated userId={} role={}", userId, role);
        }

        return message;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /**
     * Resolves the JWT from STOMP native headers.
     *
     * <ol>
     *   <li>{@code Authorization: Bearer <token>} — standard header (preferred)</li>
     *   <li>{@code token: <raw-token>} — convenience header for SockJS clients
     *       that strip the {@code Bearer} prefix</li>
     * </ol>
     */
    private String resolveToken(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        // Fallback: plain `token` header (some SockJS/STOMP.js clients use this)
        String rawToken = accessor.getFirstNativeHeader("token");
        if (rawToken != null && !rawToken.isBlank()) {
            return rawToken.trim();
        }
        return null;
    }
}
