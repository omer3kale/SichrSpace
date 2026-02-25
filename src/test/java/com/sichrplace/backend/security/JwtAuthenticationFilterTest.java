package com.sichrplace.backend.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void validToken_setsAuthentication() throws Exception {
        JwtTokenProvider provider = mock(JwtTokenProvider.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(provider);
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        request.addHeader("Authorization", "Bearer good-token");
        when(provider.validateToken("good-token")).thenReturn(true);
        when(provider.getUserIdFromToken("good-token")).thenReturn(1L);
        when(provider.getRoleFromToken("good-token")).thenReturn("ADMIN");

        filter.doFilter(request, response, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals(1L, auth.getPrincipal());
        assertTrue(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
        verify(chain).doFilter(request, response);
    }

    @Test
    void invalidToken_doesNotSetAuthentication() throws Exception {
        JwtTokenProvider provider = mock(JwtTokenProvider.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(provider);
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        request.addHeader("Authorization", "Bearer bad-token");
        when(provider.validateToken("bad-token")).thenReturn(false);

        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(request, response);
    }

    @Test
    void missingToken_doesNotSetAuthentication() throws Exception {
        JwtTokenProvider provider = mock(JwtTokenProvider.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(provider);
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(provider, never()).validateToken(anyString());
        verify(chain).doFilter(request, response);
    }

    @Test
    void providerThrows_stillContinuesChain() throws Exception {
        JwtTokenProvider provider = mock(JwtTokenProvider.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(provider);
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        request.addHeader("Authorization", "Bearer crash-token");
        when(provider.validateToken("crash-token")).thenThrow(new RuntimeException("boom"));

        assertDoesNotThrow(() -> filter.doFilter(request, response, chain));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(request, response);
    }
}
