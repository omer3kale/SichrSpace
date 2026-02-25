package com.sichrplace.backend.service;

import com.sichrplace.backend.model.User;

/**
 * Manages the lifecycle of opaque refresh tokens stored in the database.
 *
 * <p>Tokens are opaque UUIDs — the raw value is returned to clients;
 * only the SHA-256 hash is persisted.
 *
 * <p>Rotation guarantee: every successful refresh call revokes the old token
 * and issues a new one.  Presenting a revoked token signals possible theft
 * and should prompt immediate revocation of all tokens for that user.
 */
public interface RefreshTokenService {

    /**
     * Create a new refresh token for the given user.
     *
     * @param user       the authenticated user
     * @param deviceInfo optional truncated User-Agent string (may be null)
     * @return the raw (unhashed) token string — return this to the client
     */
    String createToken(User user, String deviceInfo);

    /**
     * Verify the supplied raw token, revoke it, and return a freshly rotated token.
     *
     * @param rawToken   the token as received from the client
     * @param deviceInfo optional User-Agent of the current request
     * @return the new raw token string
     * @throws IllegalArgumentException if the token is not found, expired, or revoked
     */
    String rotateToken(String rawToken, String deviceInfo);

    /**
     * Revoke a single token (logout from current device).
     *
     * @param rawToken the token as received from the client
     */
    void revokeToken(String rawToken);

    /**
     * Revoke ALL tokens for a user (logout from all devices).
     *
     * @param userId the user's id
     */
    void revokeAllForUser(Long userId);

    /**
     * Return the user ID embedded in the stored refresh token record,
     * without rotating.  Used by the refresh endpoint to look up the user.
     *
     * @param rawToken the token as received from the client
     * @return the owning user's id
     * @throws IllegalArgumentException if not found / invalid
     */
    Long getUserIdFromToken(String rawToken);
}
