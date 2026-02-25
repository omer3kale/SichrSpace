package com.sichrplace.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("VideoTokenServiceImpl")
class VideoTokenServiceTest {

    private VideoTokenServiceImpl tokenService;

    @BeforeEach
    void setUp() {
        tokenService = new VideoTokenServiceImpl("test-hmac-secret-key-for-unit-tests!!");
    }

    @Nested
    @DisplayName("generateToken")
    class GenerateToken {

        @Test
        @DisplayName("produces correct 4-part format")
        void producesCorrectFormat() {
            String token = tokenService.generateToken(1L, 2L, 9999999999L);

            String[] parts = token.split("\\.");
            assertEquals(4, parts.length);
            assertEquals("1", parts[0]);
            assertEquals("2", parts[1]);
            assertEquals("9999999999", parts[2]);
            assertFalse(parts[3].isBlank());
        }

        @Test
        @DisplayName("throws on null videoId")
        void throwsOnNullVideoId() {
            assertThrows(IllegalArgumentException.class,
                    () -> tokenService.generateToken(null, 2L, 1000L));
        }

        @Test
        @DisplayName("throws on null linkId")
        void throwsOnNullLinkId() {
            assertThrows(IllegalArgumentException.class,
                    () -> tokenService.generateToken(1L, null, 1000L));
        }

        @Test
        @DisplayName("deterministic — same inputs produce same token")
        void deterministicOutput() {
            String t1 = tokenService.generateToken(5L, 10L, 1234567890L);
            String t2 = tokenService.generateToken(5L, 10L, 1234567890L);
            assertEquals(t1, t2);
        }

        @Test
        @DisplayName("different inputs produce different tokens")
        void differentInputsDifferentTokens() {
            String t1 = tokenService.generateToken(1L, 2L, 1000L);
            String t2 = tokenService.generateToken(1L, 3L, 1000L);
            assertNotEquals(t1, t2);
        }
    }

    @Nested
    @DisplayName("validateAndDecode")
    class ValidateAndDecode {

        @Test
        @DisplayName("decodes a valid non-expired token")
        void decodesValidToken() {
            long futureEpoch = Instant.now().plusSeconds(3600).getEpochSecond();
            String token = tokenService.generateToken(10L, 20L, futureEpoch);

            VideoTokenService.DecodedVideoToken decoded = tokenService.validateAndDecode(token);

            assertEquals(10L, decoded.videoId());
            assertEquals(20L, decoded.linkId());
            assertEquals(futureEpoch, decoded.expiresAtEpoch());
        }

        @Test
        @DisplayName("throws on null token")
        void throwsOnNull() {
            assertThrows(IllegalArgumentException.class,
                    () -> tokenService.validateAndDecode(null));
        }

        @Test
        @DisplayName("throws on blank token")
        void throwsOnBlank() {
            assertThrows(IllegalArgumentException.class,
                    () -> tokenService.validateAndDecode("   "));
        }

        @Test
        @DisplayName("throws on malformed token — wrong part count")
        void throwsOnMalformedPartCount() {
            assertThrows(IllegalArgumentException.class,
                    () -> tokenService.validateAndDecode("1.2.3"));
        }

        @Test
        @DisplayName("throws on malformed token — non-numeric parts")
        void throwsOnNonNumeric() {
            assertThrows(IllegalArgumentException.class,
                    () -> tokenService.validateAndDecode("abc.def.ghi.jkl"));
        }

        @Test
        @DisplayName("throws on tampered signature")
        void throwsOnTamperedSignature() {
            long futureEpoch = Instant.now().plusSeconds(3600).getEpochSecond();
            String token = tokenService.generateToken(1L, 2L, futureEpoch);
            String tampered = token.substring(0, token.lastIndexOf('.') + 1) + "TAMPERED";

            assertThrows(IllegalArgumentException.class,
                    () -> tokenService.validateAndDecode(tampered));
        }

        @Test
        @DisplayName("throws on expired token")
        void throwsOnExpiredToken() {
            long pastEpoch = Instant.now().minusSeconds(3600).getEpochSecond();
            String token = tokenService.generateToken(1L, 2L, pastEpoch);

            assertThrows(IllegalStateException.class,
                    () -> tokenService.validateAndDecode(token));
        }

        @Test
        @DisplayName("different secret rejects token")
        void differentSecretRejects() {
            long futureEpoch = Instant.now().plusSeconds(3600).getEpochSecond();
            String token = tokenService.generateToken(1L, 2L, futureEpoch);

            VideoTokenServiceImpl otherService = new VideoTokenServiceImpl("completely-different-secret-key-here!!");
            assertThrows(IllegalArgumentException.class,
                    () -> otherService.validateAndDecode(token));
        }
    }

    @Nested
    @DisplayName("hashToken")
    class HashToken {

        @Test
        @DisplayName("produces hex string")
        void producesHexString() {
            String hash = tokenService.hashToken("some-token-value");

            assertNotNull(hash);
            assertEquals(64, hash.length()); // SHA-256 = 32 bytes = 64 hex chars
            assertTrue(hash.matches("[0-9a-f]+"));
        }

        @Test
        @DisplayName("deterministic")
        void deterministic() {
            String h1 = tokenService.hashToken("abc");
            String h2 = tokenService.hashToken("abc");
            assertEquals(h1, h2);
        }

        @Test
        @DisplayName("different inputs produce different hashes")
        void differentInputs() {
            String h1 = tokenService.hashToken("token-one");
            String h2 = tokenService.hashToken("token-two");
            assertNotEquals(h1, h2);
        }
    }
}
