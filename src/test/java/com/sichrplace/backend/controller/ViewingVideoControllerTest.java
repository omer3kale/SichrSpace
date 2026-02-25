package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.*;
import com.sichrplace.backend.service.ViewingVideoService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ViewingVideoController")
class ViewingVideoControllerTest {

    @Mock private ViewingVideoService viewingVideoService;

    @InjectMocks private ViewingVideoController controller;

    @BeforeEach
    void setUpAuth() {
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(1L, null, List.of());
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(auth);
        SecurityContextHolder.setContext(ctx);
    }

    @AfterEach
    void tearDownAuth() {
        SecurityContextHolder.clearContext();
    }

    private ViewingVideoDto sampleVideo() {
        return ViewingVideoDto.builder()
                .id(100L).title("Tour").status("ACTIVE")
                .apartmentId(10L).apartmentTitle("Test Apt")
                .uploadedById(1L).uploadedByName("Owner")
                .createdAt(Instant.now())
                .build();
    }

    private VideoAccessLinkDto sampleLink() {
        return VideoAccessLinkDto.builder()
                .id(200L).videoId(100L).recipientEmail("t@t.com")
                .expiresAt(Instant.now().plusSeconds(3600))
                .viewCount(0).revoked(false).expired(false)
                .build();
    }

    // ─── Upload ───────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("uploadVideo")
    class UploadVideo {

        @Test
        @DisplayName("returns 201 on success")
        void uploadSuccess() {
            MockMultipartFile file = new MockMultipartFile("file", "v.mp4", "video/mp4", "d".getBytes());
            when(viewingVideoService.uploadVideo(eq(1L), eq(10L), isNull(), eq("Tour"), isNull(), any()))
                    .thenReturn(sampleVideo());

            ResponseEntity<ViewingVideoDto> response = controller.uploadVideo(10L, file, "Tour", null, null);

            assertEquals(HttpStatus.CREATED, response.getStatusCode());
            assertNotNull(response.getBody());
            assertEquals(100L, response.getBody().getId());
        }
    }

    // ─── Send to Tenant ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("sendVideoToTenant")
    class SendVideoToTenant {

        @Test
        @DisplayName("returns 200 with link DTO")
        void sendSuccess() {
            VideoSendRequest req = VideoSendRequest.builder().tenantId(2L).build();
            when(viewingVideoService.sendVideoToTenant(100L, 2L, 1L)).thenReturn(sampleLink());

            ResponseEntity<VideoAccessLinkDto> response = controller.sendVideoToTenant(100L, req);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(200L, response.getBody().getId());
        }
    }

    // ─── Stream ───────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("streamVideo")
    class StreamVideo {

        @Test
        @DisplayName("returns 200 with video resource")
        void streamSuccess() {
            Resource resource = new ByteArrayResource("video-data".getBytes());
            HttpServletRequest request = mock(HttpServletRequest.class);
            when(request.getRemoteAddr()).thenReturn("127.0.0.1");
            when(request.getHeader("User-Agent")).thenReturn("TestBrowser");
            when(viewingVideoService.streamVideo(eq("token123"), anyString(), eq("TestBrowser")))
                    .thenReturn(resource);

            ResponseEntity<Resource> response = controller.streamVideo("token123", request);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertEquals("inline", response.getHeaders().getFirst("Content-Disposition"));
        }
    }

    // ─── Watch Time ───────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("recordWatchTime")
    class RecordWatchTime {

        @Test
        @DisplayName("returns 204")
        void recordSuccess() {
            VideoAnalyticsRequest req = new VideoAnalyticsRequest();
            req.setToken("tok");
            req.setWatchDurationSeconds(120L);

            ResponseEntity<Void> response = controller.recordWatchTime(req);

            assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
            verify(viewingVideoService).recordWatchTime("tok", 120);
        }
    }

    // ─── Get by ID ────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getVideoById")
    class GetVideoById {

        @Test
        @DisplayName("returns 200 with video details")
        void getByIdSuccess() {
            when(viewingVideoService.getVideoById(100L, 1L)).thenReturn(sampleVideo());

            ResponseEntity<ViewingVideoDto> response = controller.getVideoById(100L);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(100L, response.getBody().getId());
        }
    }

    // ─── List by Viewing Request ──────────────────────────────────────────────────

    @Nested
    @DisplayName("getVideosByViewingRequest")
    class GetVideosByViewingRequest {

        @Test
        @DisplayName("returns list")
        void listSuccess() {
            when(viewingVideoService.getVideosByViewingRequest(50L, 1L))
                    .thenReturn(List.of(sampleVideo()));

            ResponseEntity<List<ViewingVideoDto>> response = controller.getVideosByViewingRequest(50L);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(1, response.getBody().size());
        }
    }

    // ─── List by Apartment ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getVideosByApartment")
    class GetVideosByApartment {

        @Test
        @DisplayName("returns paged results")
        void pagedSuccess() {
            Page<ViewingVideoDto> page = new PageImpl<>(List.of(sampleVideo()));
            when(viewingVideoService.getVideosByApartment(eq(10L), eq(1L), any())).thenReturn(page);

            ResponseEntity<Page<ViewingVideoDto>> response =
                    controller.getVideosByApartment(10L, PageRequest.of(0, 10));

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(1, response.getBody().getTotalElements());
        }
    }

    // ─── Delete ───────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("deleteVideo")
    class DeleteVideo {

        @Test
        @DisplayName("returns 204")
        void deleteSuccess() {
            ResponseEntity<Void> response = controller.deleteVideo(100L);

            assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
            verify(viewingVideoService).deleteVideo(100L, 1L);
        }
    }

    // ─── Revoke Link ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("revokeLink")
    class RevokeLink {

        @Test
        @DisplayName("returns 204")
        void revokeSuccess() {
            ResponseEntity<Void> response = controller.revokeLink(200L);

            assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
            verify(viewingVideoService).revokeLink(200L, 1L);
        }
    }

    // ─── Access Logs ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getAccessLogs")
    class GetAccessLogs {

        @Test
        @DisplayName("returns logs")
        void getLogsSuccess() {
            VideoAccessLogDto logDto = VideoAccessLogDto.builder()
                    .id(300L).linkId(200L).videoId(100L).accessedAt(Instant.now()).build();
            when(viewingVideoService.getAccessLogs(100L, 1L)).thenReturn(List.of(logDto));

            ResponseEntity<List<VideoAccessLogDto>> response = controller.getAccessLogs(100L);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(1, response.getBody().size());
        }
    }
}
