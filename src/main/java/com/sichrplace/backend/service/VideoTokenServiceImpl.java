package com.sichrplace.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;

/**
 * HMAC-SHA256 based token generation and validation for dissolving video links.
 * <p>
 * Token format: {videoId}.{linkId}.{expiresAtEpochSeconds}.{base64url(hmac)}
 */
@Slf4j
@Service
public class VideoTokenServiceImpl implements VideoTokenService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String SHA_ALGORITHM = "SHA-256";

    private final byte[] secretKey;

    public VideoTokenServiceImpl(
            @Value("${app.video.hmac-secret:dissolving-video-default-secret-key-32chars!!}") String hmacSecret) {
        this.secretKey = hmacSecret.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public String generateToken(Long videoId, Long linkId, long expiresAtEpoch) {
        if (videoId == null || linkId == null) {
            throw new IllegalArgumentException("videoId and linkId must not be null");
        }

        String payload = videoId + ":" + linkId + ":" + expiresAtEpoch;
        String signature = computeHmac(payload);

        return videoId + "." + linkId + "." + expiresAtEpoch + "." + signature;
    }

    @Override
    public DecodedVideoToken validateAndDecode(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Token must not be blank");
        }

        String[] parts = token.split("\\.");
        if (parts.length != 4) {
            throw new IllegalArgumentException("Invalid token format");
        }

        Long videoId;
        Long linkId;
        long expiresAtEpoch;
        String signature;

        try {
            videoId = Long.parseLong(parts[0]);
            linkId = Long.parseLong(parts[1]);
            expiresAtEpoch = Long.parseLong(parts[2]);
            signature = parts[3];
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid token format: non-numeric components");
        }

        // Verify HMAC signature
        String payload = videoId + ":" + linkId + ":" + expiresAtEpoch;
        String expectedSignature = computeHmac(payload);

        if (!MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalArgumentException("Invalid token: signature mismatch");
        }

        // Check expiry
        if (Instant.now().getEpochSecond() > expiresAtEpoch) {
            throw new IllegalStateException("Token has expired");
        }

        return new DecodedVideoToken(videoId, linkId, expiresAtEpoch);
    }

    @Override
    public String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance(SHA_ALGORITHM);
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private String computeHmac(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(secretKey, HMAC_ALGORITHM);
            mac.init(keySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("HMAC computation failed", e);
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
