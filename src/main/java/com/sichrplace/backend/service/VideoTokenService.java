package com.sichrplace.backend.service;

/**
 * Service for generating and validating HMAC-signed dissolving video tokens.
 *
 * Token format: {videoId}.{linkId}.{expiresAtEpochSeconds}.{hmacSignature}
 * where HMAC = SHA256("videoId:linkId:expiresAt", serverSecret)
 */
public interface VideoTokenService {

    /**
     * Generate a dissolving link token for a video access link.
     *
     * @param videoId        the video ID
     * @param linkId         the access link ID
     * @param expiresAtEpoch the expiry timestamp in epoch seconds
     * @return the complete token string (videoId.linkId.expiresAt.hmac)
     */
    String generateToken(Long videoId, Long linkId, long expiresAtEpoch);

    /**
     * Validate a token and return decoded data.
     * Checks: format validity, HMAC signature integrity, and expiry.
     *
     * @param token the raw token from the URL
     * @return decoded token data
     * @throws IllegalArgumentException if the token is malformed or signature is invalid
     * @throws IllegalStateException    if the token has expired
     */
    DecodedVideoToken validateAndDecode(String token);

    /**
     * Compute SHA-256 hash of a token string for storage / revocation checks.
     *
     * @param token the raw token
     * @return hex-encoded SHA-256 hash
     */
    String hashToken(String token);

    /**
     * Decoded contents of a valid video token.
     */
    record DecodedVideoToken(Long videoId, Long linkId, long expiresAtEpoch) {
    }
}
