package com.sichrplace.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.dto.ApiErrorResponse;
import com.sichrplace.backend.config.RateLimitingFilter;
import com.sichrplace.backend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.beans.factory.annotation.Value;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final ObjectMapper objectMapper;

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:8080}")
    private String allowedOriginsRaw;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // ── CSRF: intentionally disabled ──────────────────────────────────────────
                // This backend is a pure stateless REST API; every controller is @RestController.
                // Authentication is carried exclusively in the `Authorization: Bearer <JWT>`
                // request header, never in a cookie.  Browsers cannot forge cross-site requests
                // with custom headers (the Same-Origin Policy blocks them at the preflight
                // stage), so CSRF token infrastructure would be unreachable dead code.
                // SessionCreationPolicy.STATELESS ensures no HttpSession is ever created.
                //
                // ⚠ IF A SPRING MVC / THYMELEAF FORM LAYER IS EVER ADDED, csrf().disable()
                // MUST be re-evaluated before any <form> POST endpoint is exposed.
                // See docs/SECURITY_AND_SECRETS.md §10 for the full rationale.
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(401);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            ApiErrorResponse body = ApiErrorResponse.builder()
                                    .status(401)
                                    .error("Unauthorized")
                                    .message("Authentication is required to access this resource")
                                    .path(request.getRequestURI())
                                    .timestamp(Instant.now())
                                    .build();
                            objectMapper.writeValue(response.getOutputStream(), body);
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(403);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            ApiErrorResponse body = ApiErrorResponse.builder()
                                    .status(403)
                                    .error("Forbidden")
                                    .message("You do not have permission to access this resource")
                                    .path(request.getRequestURI())
                                    .timestamp(Instant.now())
                                    .build();
                            objectMapper.writeValue(response.getOutputStream(), body);
                        })
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/forgot-password").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/reset-password").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/verify-email").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/verify-email").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/resend-verification").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/resend-verification").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/users/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/apartments/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/maps/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/feature-flags").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/apartment/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/landlord/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health/db-readiness").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health/payments").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/content/**").permitAll()
                        // WebSocket handshake upgrade — HTTP layer must pass through;
                        // actual connection auth is enforced by JwtChannelInterceptor on the STOMP CONNECT frame.
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/v3/api-docs"
                        ).permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/gdpr/consent").permitAll()
                        // Dissolving video — token-authenticated, no JWT required
                        .requestMatchers(HttpMethod.GET, "/api/videos/stream/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/videos/analytics").permitAll()
                        // Stripe webhook — unauthenticated; secured by signature verification
                        .requestMatchers(HttpMethod.POST, "/api/payments/stripe/webhook").permitAll()
                        // PayPal webhook — unauthenticated; secured by webhook ID verification
                        .requestMatchers(HttpMethod.POST, "/api/payments/paypal/webhook").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.asList(allowedOriginsRaw.split("\\s*,\\s*"));
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
