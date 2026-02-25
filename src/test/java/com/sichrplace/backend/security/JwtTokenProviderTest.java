package com.sichrplace.backend.security;

import com.sichrplace.backend.model.User;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final String OTHER_SECRET = "abcdef0123456789abcdef0123456789abcdef0123456789";

    @Test
    void generateAndParseAccessToken_success() {
        JwtTokenProvider provider = new JwtTokenProvider(SECRET, "", 60_000L, 120_000L);
        User user = User.builder().id(7L).email("u@test.com").role(User.UserRole.ADMIN).build();

        String token = provider.generateAccessToken(user);

        assertTrue(provider.validateToken(token));
        assertEquals(7L, provider.getUserIdFromToken(token));
        assertEquals("ADMIN", provider.getRoleFromToken(token));
        assertFalse(provider.isTokenExpired(token));
    }

    @Test
    void invalidToken_returnsFalse() {
        JwtTokenProvider provider = new JwtTokenProvider(SECRET, "", 60_000L, 120_000L);

        assertFalse(provider.validateToken("not.a.valid.token"));
    }

    @Test
    void nullOrEmptyToken_returnsFalse() {
        JwtTokenProvider provider = new JwtTokenProvider(SECRET, "", 60_000L, 120_000L);

        assertFalse(provider.validateToken(null));
        assertFalse(provider.validateToken(""));
    }

    @Test
    void expiredToken_validationFails() throws InterruptedException {
        JwtTokenProvider provider = new JwtTokenProvider(SECRET, "", 1L, 1L);
        User user = User.builder().id(9L).email("x@test.com").role(User.UserRole.TENANT).build();

        String token = provider.generateAccessToken(user);
        Thread.sleep(5);

        assertFalse(provider.validateToken(token));
    }

    @Test
    void refreshToken_containsTypeAndParsesClaims() {
        JwtTokenProvider provider = new JwtTokenProvider(SECRET, "", 60_000L, 120_000L);
        User user = User.builder().id(15L).email("refresh@test.com").role(User.UserRole.LANDLORD).build();

        String refreshToken = provider.generateRefreshToken(user);

        assertTrue(provider.validateToken(refreshToken));
        assertEquals(15L, provider.getUserIdFromToken(refreshToken));
        assertEquals("LANDLORD", provider.getRoleFromToken(refreshToken));
        assertFalse(provider.isTokenExpired(refreshToken));
        assertEquals(60_000L, provider.getAccessTokenExpirationMs());
        assertEquals(120_000L, provider.getRefreshTokenExpirationMs());
        assertNotNull(provider.getJwtSecret());
    }

    @Test
    void wrongSecret_cannotValidateOrParse() {
        JwtTokenProvider issuer = new JwtTokenProvider(SECRET, "", 60_000L, 120_000L);
        JwtTokenProvider verifier = new JwtTokenProvider(OTHER_SECRET, "", 60_000L, 120_000L);
        User user = User.builder().id(21L).email("signed@test.com").role(User.UserRole.ADMIN).build();

        String token = issuer.generateAccessToken(user);

        assertFalse(verifier.validateToken(token));
        assertThrows(Exception.class, () -> verifier.getUserIdFromToken(token));
        assertThrows(Exception.class, () -> verifier.getRoleFromToken(token));
        assertThrows(Exception.class, () -> verifier.isTokenExpired(token));
    }

    @Test
    void malformedToken_parseMethodsThrow() {
        JwtTokenProvider provider = new JwtTokenProvider(SECRET, "", 60_000L, 120_000L);

        assertThrows(Exception.class, () -> provider.getUserIdFromToken("bad-token"));
        assertThrows(Exception.class, () -> provider.getRoleFromToken("bad-token"));
        assertThrows(Exception.class, () -> provider.isTokenExpired("bad-token"));
    }
}
