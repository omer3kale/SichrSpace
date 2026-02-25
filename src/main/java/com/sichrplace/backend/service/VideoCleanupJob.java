package com.sichrplace.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job that cleans up expired dissolving video links and
 * soft-deletes videos whose ALL access links have expired / been revoked.
 * <p>
 * Runs every hour by default. Override with {@code app.video.cleanup-cron}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VideoCleanupJob {

    private final ViewingVideoService viewingVideoService;

    @Scheduled(cron = "${app.video.cleanup-cron:0 0 * * * *}")
    public void cleanupExpiredVideos() {
        log.info("Running video cleanup job");
        try {
            viewingVideoService.cleanupExpiredVideos();
            log.info("Video cleanup job completed");
        } catch (Exception e) {
            log.error("Video cleanup job failed", e);
        }
    }
}
