package com.sichrplace.backend.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("VideoCleanupJob")
class VideoCleanupJobTest {

    @Mock private ViewingVideoService viewingVideoService;

    @InjectMocks private VideoCleanupJob cleanupJob;

    @Test
    @DisplayName("delegates to service cleanupExpiredVideos")
    void delegatesToService() {
        cleanupJob.cleanupExpiredVideos();

        verify(viewingVideoService).cleanupExpiredVideos();
    }

    @Test
    @DisplayName("catches and logs exceptions without re-throwing")
    void catchesExceptions() {
        doThrow(new RuntimeException("DB down")).when(viewingVideoService).cleanupExpiredVideos();

        // Should not throw
        cleanupJob.cleanupExpiredVideos();

        verify(viewingVideoService).cleanupExpiredVideos();
    }
}
