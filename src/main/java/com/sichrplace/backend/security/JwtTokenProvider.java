package com.sichrplace.backend.security;

import com.sichrplace.backend.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
@Getter
public class JwtTokenProvider {

    private final SecretKey jwtSecret;

    /**
     * Optional previous secret used during key-rotation grace periods.
     * Set {@code app.jwtSecretPrevious} in application config for zero-downtime
     * rotation: tokens signed with the old key remain valid until they expire.
     */
    private final SecretKey jwtSecretPrevious;

    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtTokenProvider(@Value("${app.jwtSecret}") String secret,
                          @Value("${app.jwtSecretPrevious:}") String previousSecret,
                          @Value("${app.jwtExpirationMs:86400000}") long accessTokenExpirationMs,
                          @Value("${app.jwtRefreshExpirationMs:604800000}") long refreshTokenExpirationMs) {
        this.jwtSecret = Keys.hmacShaKeyFor(secret.getBytes());
        this.jwtSecretPrevious = (previousSecret != null && !previousSecret.isBlank())
                ? Keys.hmacShaKeyFor(previousSecret.getBytes())
                : null;
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    public String generateAccessToken(User user) {
        return buildToken(user, accessTokenExpirationMs, "access");
    }

    public String generateRefreshToken(User user) {
        return buildToken(user, refreshTokenExpirationMs, "refresh");
    }

    private String buildToken(User user, long expirationMs, String type) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .claim("type", type)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(jwtSecret)
                .compact();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = getAllClaimsFromToken(token);
        return Long.parseLong(claims.getSubject());
    }

    public String getRoleFromToken(String token) {
        Claims claims = getAllClaimsFromToken(token);
        return (String) claims.get("role");
    }

    public boolean validateToken(String token) {
        if (tryValidate(token, jwtSecret)) return true;
        return jwtSecretPrevious != null && tryValidate(token, jwtSecretPrevious);
    }

    private boolean tryValidate(String token, SecretKey key) {
        try {
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Claims getAllClaimsFromToken(String token) {
        // Try current secret first; fall back to previous during key-rotation grace period
        try {
            return Jwts.parser()
                    .verifyWith(jwtSecret)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (Exception e) {
            if (jwtSecretPrevious != null) {
                return Jwts.parser()
                        .verifyWith(jwtSecretPrevious)
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();
            }
            throw e;
        }
    }

    public boolean isTokenExpired(String token) {
        return getAllClaimsFromToken(token).getExpiration().before(new Date());
    }
}
