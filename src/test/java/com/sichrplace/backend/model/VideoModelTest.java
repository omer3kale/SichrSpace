package com.sichrplace.backend.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Video Model Entities")
class VideoModelTest {

    @Nested
    @DisplayName("ViewingVideo")
    class ViewingVideoTests {

        @Test
        @DisplayName("incrementAccessCount from zero")
        void incrementFromZero() {
            ViewingVideo video = ViewingVideo.builder().accessCount(0).build();
            video.incrementAccessCount();
            assertEquals(1, video.getAccessCount());
        }

        @Test
        @DisplayName("incrementAccessCount from null")
        void incrementFromNull() {
            ViewingVideo video = new ViewingVideo();
            video.setAccessCount(null);
            video.incrementAccessCount();
            assertEquals(1, video.getAccessCount());
        }

        @Test
        @DisplayName("incrementAccessCount multiple times")
        void incrementMultiple() {
            ViewingVideo video = ViewingVideo.builder().accessCount(5).build();
            video.incrementAccessCount();
            video.incrementAccessCount();
            assertEquals(7, video.getAccessCount());
        }

        @Test
        @DisplayName("builder defaults")
        void builderDefaults() {
            ViewingVideo video = ViewingVideo.builder().build();
            assertEquals(ViewingVideo.VideoStatus.ACTIVE, video.getStatus());
            assertEquals(0, video.getAccessCount());
            assertEquals("video/mp4", video.getContentType());
        }
    }

    @Nested
    @DisplayName("VideoAccessLink")
    class VideoAccessLinkTests {

        @Test
        @DisplayName("isExpired returns false for future expiry")
        void notExpiredForFuture() {
            VideoAccessLink link = VideoAccessLink.builder()
                    .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                    .build();
            assertFalse(link.isExpired());
        }

        @Test
        @DisplayName("isExpired returns true for past expiry")
        void expiredForPast() {
            VideoAccessLink link = VideoAccessLink.builder()
                    .expiresAt(Instant.now().minus(1, ChronoUnit.HOURS))
                    .build();
            assertTrue(link.isExpired());
        }

        @Test
        @DisplayName("isActive when not revoked and not expired")
        void activeWhenNotRevokedNotExpired() {
            VideoAccessLink link = VideoAccessLink.builder()
                    .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                    .revoked(false)
                    .build();
            assertTrue(link.isActive());
        }

        @Test
        @DisplayName("not active when revoked")
        void notActiveWhenRevoked() {
            VideoAccessLink link = VideoAccessLink.builder()
                    .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                    .revoked(true)
                    .build();
            assertFalse(link.isActive());
        }

        @Test
        @DisplayName("not active when expired")
        void notActiveWhenExpired() {
            VideoAccessLink link = VideoAccessLink.builder()
                    .expiresAt(Instant.now().minus(1, ChronoUnit.HOURS))
                    .revoked(false)
                    .build();
            assertFalse(link.isActive());
        }

        @Test
        @DisplayName("recordView sets firstViewedAt on first call")
        void recordViewFirst() {
            VideoAccessLink link = VideoAccessLink.builder()
                    .viewCount(0).totalWatchTimeSeconds(0L).build();
            link.recordView(60);

            assertEquals(1, link.getViewCount());
            assertNotNull(link.getFirstViewedAt());
            assertNotNull(link.getLastViewedAt());
            assertEquals(60L, link.getTotalWatchTimeSeconds());
        }

        @Test
        @DisplayName("recordView accumulates watch time")
        void recordViewAccumulates() {
            VideoAccessLink link = VideoAccessLink.builder()
                    .viewCount(1).totalWatchTimeSeconds(60L)
                    .firstViewedAt(Instant.now().minus(1, ChronoUnit.HOURS))
                    .build();
            link.recordView(30);

            assertEquals(2, link.getViewCount());
            assertEquals(90L, link.getTotalWatchTimeSeconds());
        }

        @Test
        @DisplayName("recordView handles null viewCount")
        void recordViewNullCount() {
            VideoAccessLink link = new VideoAccessLink();
            link.setViewCount(null);
            link.setTotalWatchTimeSeconds(null);
            link.recordView(10);

            assertEquals(1, link.getViewCount());
            assertEquals(10L, link.getTotalWatchTimeSeconds());
        }

        @Test
        @DisplayName("builder defaults")
        void builderDefaults() {
            VideoAccessLink link = VideoAccessLink.builder().build();
            assertFalse(link.isRevoked());
            assertEquals(0, link.getViewCount());
            assertEquals(0L, link.getTotalWatchTimeSeconds());
        }
    }

    @Nested
    @DisplayName("VideoAccessLog")
    class VideoAccessLogTests {

        @Test
        @DisplayName("builder defaults accessedAt to now")
        void defaultAccessedAt() {
            VideoAccessLog log = VideoAccessLog.builder().build();
            assertNotNull(log.getAccessedAt());
        }

        @Test
        @DisplayName("builds with all fields")
        void buildsWithAllFields() {
            VideoAccessLink link = VideoAccessLink.builder().id(1L).build();
            ViewingVideo video = ViewingVideo.builder().id(2L).build();

            VideoAccessLog log = VideoAccessLog.builder()
                    .id(100L)
                    .link(link)
                    .video(video)
                    .ipAddressHash("abc123")
                    .userAgent("Chrome")
                    .watchDurationSeconds(120L)
                    .build();

            assertEquals(100L, log.getId());
            assertEquals(1L, log.getLink().getId());
            assertEquals(2L, log.getVideo().getId());
            assertEquals("abc123", log.getIpAddressHash());
            assertEquals("Chrome", log.getUserAgent());
            assertEquals(120L, log.getWatchDurationSeconds());
        }
    }
}
