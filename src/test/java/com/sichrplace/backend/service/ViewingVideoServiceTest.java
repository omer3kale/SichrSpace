package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.VideoAccessLinkDto;
import com.sichrplace.backend.dto.VideoAccessLogDto;
import com.sichrplace.backend.dto.ViewingVideoDto;
import com.sichrplace.backend.model.*;
import com.sichrplace.backend.repository.*;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ViewingVideoServiceImpl")
class ViewingVideoServiceTest {

    @Mock private ViewingVideoRepository viewingVideoRepository;
    @Mock private VideoAccessLinkRepository videoAccessLinkRepository;
    @Mock private VideoAccessLogRepository videoAccessLogRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApartmentRepository apartmentRepository;
    @Mock private ViewingRequestRepository viewingRequestRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private VideoTokenService videoTokenService;
    @Mock private EmailService emailService;
    @Mock private NotificationService notificationService;

    @InjectMocks private ViewingVideoServiceImpl videoService;

    private User owner;
    private User tenant;
    private Apartment apartment;
    private ViewingVideo video;
    private VideoAccessLink link;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(videoService, "linkValidityHours", 48L);
        ReflectionTestUtils.setField(videoService, "allowedTypes", "video/mp4,video/webm,video/quicktime");

        owner = User.builder().id(1L).email("owner@test.com").firstName("Own").lastName("Er").build();
        tenant = User.builder().id(2L).email("tenant@test.com").firstName("Ten").lastName("Ant").build();
        apartment = Apartment.builder().id(10L).title("Test Apt").owner(owner)
                .status(Apartment.ApartmentStatus.AVAILABLE).build();
        video = ViewingVideo.builder()
                .id(100L)
                .apartment(apartment)
                .uploadedBy(owner)
                .storagePath("apartment-10/uuid.mp4")
                .originalFilename("tour.mp4")
                .contentType("video/mp4")
                .fileSizeBytes(1024L)
                .title("Tour Video")
                .status(ViewingVideo.VideoStatus.ACTIVE)
                .accessCount(0)
                .build();
        link = VideoAccessLink.builder()
                .id(200L)
                .video(video)
                .recipient(tenant)
                .recipientEmail(tenant.getEmail())
                .tokenHash("hash123")
                .expiresAt(Instant.now().plus(48, ChronoUnit.HOURS))
                .revoked(false)
                .viewCount(0)
                .totalWatchTimeSeconds(0L)
                .build();
    }

    // ─── Upload ───────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("uploadVideo")
    class UploadVideo {

        @Test
        @DisplayName("uploads successfully for apartment owner")
        void uploadSuccess() {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "tour.mp4", "video/mp4", "video".getBytes());

            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));
            when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
            when(fileStorageService.store(any(), eq("apartment-10"))).thenReturn("apartment-10/uuid.mp4");
            when(viewingVideoRepository.save(any(ViewingVideo.class))).thenAnswer(inv -> {
                ViewingVideo v = inv.getArgument(0);
                v.setId(100L);
                return v;
            });

            ViewingVideoDto result = videoService.uploadVideo(1L, 10L, null, "Tour", "Notes", file);

            assertNotNull(result);
            assertEquals(100L, result.getId());
            assertEquals("Tour", result.getTitle());
            verify(fileStorageService).store(file, "apartment-10");
            verify(viewingVideoRepository).save(any(ViewingVideo.class));
        }

        @Test
        @DisplayName("throws when user not found")
        void throwsUserNotFound() {
            MockMultipartFile file = new MockMultipartFile("file", "v.mp4", "video/mp4", "d".getBytes());
            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> videoService.uploadVideo(99L, 10L, null, "T", null, file));
        }

        @Test
        @DisplayName("throws when not apartment owner")
        void throwsNotOwner() {
            MockMultipartFile file = new MockMultipartFile("file", "v.mp4", "video/mp4", "d".getBytes());
            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));

            assertThrows(SecurityException.class,
                    () -> videoService.uploadVideo(2L, 10L, null, "T", null, file));
        }

        @Test
        @DisplayName("throws on unsupported file type")
        void throwsUnsupportedType() {
            MockMultipartFile file = new MockMultipartFile("file", "v.exe", "application/exe", "d".getBytes());
            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));
            when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));

            assertThrows(IllegalArgumentException.class,
                    () -> videoService.uploadVideo(1L, 10L, null, "T", null, file));
        }

        @Test
        @DisplayName("associates with viewing request when provided")
        void associatesWithViewingRequest() {
            MockMultipartFile file = new MockMultipartFile("file", "v.mp4", "video/mp4", "d".getBytes());
            ViewingRequest vr = ViewingRequest.builder().id(50L).build();

            when(userRepository.findById(1L)).thenReturn(Optional.of(owner));
            when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(vr));
            when(fileStorageService.store(any(), any())).thenReturn("p");
            when(viewingVideoRepository.save(any(ViewingVideo.class))).thenAnswer(inv -> {
                ViewingVideo v = inv.getArgument(0);
                v.setId(101L);
                return v;
            });

            ViewingVideoDto result = videoService.uploadVideo(1L, 10L, 50L, "T", null, file);

            assertNotNull(result);
            verify(viewingRequestRepository).findById(50L);
        }
    }

    // ─── Send to Tenant ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("sendVideoToTenant")
    class SendVideoToTenant {

        @Test
        @DisplayName("creates link, sends email, creates notification")
        void sendSuccess() {
            when(viewingVideoRepository.findByIdAndStatus(100L, ViewingVideo.VideoStatus.ACTIVE))
                    .thenReturn(Optional.of(video));
            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(videoAccessLinkRepository.save(any(VideoAccessLink.class))).thenAnswer(inv -> {
                VideoAccessLink l = inv.getArgument(0);
                l.setId(200L);
                return l;
            });
            when(videoTokenService.generateToken(eq(100L), eq(200L), anyLong())).thenReturn("token-value");
            when(videoTokenService.hashToken("token-value")).thenReturn("hashed-token");
            when(notificationService.createNotification(anyLong(), any(), any(), any(), any(), any()))
                    .thenReturn(null);

            VideoAccessLinkDto result = videoService.sendVideoToTenant(100L, 2L, 1L);

            assertNotNull(result);
            assertEquals(200L, result.getId());
            verify(emailService).sendEmail(eq("tenant@test.com"), contains("Tour Video"), anyString());
            verify(notificationService).createNotification(eq(2L), eq(Notification.NotificationType.VIDEO_SHARED),
                    any(), any(), any(), any());
        }

        @Test
        @DisplayName("throws when video not found")
        void throwsVideoNotFound() {
            when(viewingVideoRepository.findByIdAndStatus(999L, ViewingVideo.VideoStatus.ACTIVE))
                    .thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> videoService.sendVideoToTenant(999L, 2L, 1L));
        }

        @Test
        @DisplayName("throws when not video owner")
        void throwsNotOwner() {
            when(viewingVideoRepository.findByIdAndStatus(100L, ViewingVideo.VideoStatus.ACTIVE))
                    .thenReturn(Optional.of(video));

            assertThrows(SecurityException.class,
                    () -> videoService.sendVideoToTenant(100L, 2L, 2L));
        }
    }

    // ─── Stream ───────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("streamVideo")
    class StreamVideo {

        @Test
        @DisplayName("streams valid token successfully")
        void streamSuccess() {
            long future = Instant.now().plusSeconds(3600).getEpochSecond();
            when(videoTokenService.validateAndDecode("tok"))
                    .thenReturn(new VideoTokenService.DecodedVideoToken(100L, 200L, future));
            when(videoTokenService.hashToken("tok")).thenReturn("hash123");
            when(videoAccessLinkRepository.findByTokenHash("hash123")).thenReturn(Optional.of(link));
            Resource resource = new ByteArrayResource("video".getBytes());
            when(fileStorageService.load("apartment-10/uuid.mp4")).thenReturn(resource);
            when(videoAccessLinkRepository.save(any())).thenReturn(link);
            when(viewingVideoRepository.save(any())).thenReturn(video);
            when(videoAccessLogRepository.save(any())).thenReturn(null);

            Resource result = videoService.streamVideo("tok", "iphash", "Chrome");

            assertNotNull(result);
            verify(videoAccessLinkRepository).save(any());
            verify(viewingVideoRepository).save(any());
            verify(videoAccessLogRepository).save(any(VideoAccessLog.class));
        }

        @Test
        @DisplayName("throws on revoked link")
        void throwsOnRevokedLink() {
            link.setRevoked(true);
            long future = Instant.now().plusSeconds(3600).getEpochSecond();
            when(videoTokenService.validateAndDecode("tok"))
                    .thenReturn(new VideoTokenService.DecodedVideoToken(100L, 200L, future));
            when(videoTokenService.hashToken("tok")).thenReturn("hash123");
            when(videoAccessLinkRepository.findByTokenHash("hash123")).thenReturn(Optional.of(link));

            assertThrows(IllegalStateException.class,
                    () -> videoService.streamVideo("tok", "ip", "ua"));
        }

        @Test
        @DisplayName("throws on deleted video")
        void throwsOnDeletedVideo() {
            video.setStatus(ViewingVideo.VideoStatus.DELETED);
            long future = Instant.now().plusSeconds(3600).getEpochSecond();
            when(videoTokenService.validateAndDecode("tok"))
                    .thenReturn(new VideoTokenService.DecodedVideoToken(100L, 200L, future));
            when(videoTokenService.hashToken("tok")).thenReturn("hash123");
            when(videoAccessLinkRepository.findByTokenHash("hash123")).thenReturn(Optional.of(link));

            assertThrows(IllegalStateException.class,
                    () -> videoService.streamVideo("tok", "ip", "ua"));
        }
    }

    // ─── Record Watch Time ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("recordWatchTime")
    class RecordWatchTime {

        @Test
        @DisplayName("records watch time for active link")
        void recordSuccess() {
            long future = Instant.now().plusSeconds(3600).getEpochSecond();
            when(videoTokenService.validateAndDecode("tok"))
                    .thenReturn(new VideoTokenService.DecodedVideoToken(100L, 200L, future));
            when(videoTokenService.hashToken("tok")).thenReturn("hash123");
            when(videoAccessLinkRepository.findByTokenHash("hash123")).thenReturn(Optional.of(link));
            when(videoAccessLinkRepository.save(any())).thenReturn(link);

            assertDoesNotThrow(() -> videoService.recordWatchTime("tok", 120));

            verify(videoAccessLinkRepository).save(any());
        }

        @Test
        @DisplayName("silently ignores revoked link")
        void ignoresRevokedLink() {
            link.setRevoked(true);
            long future = Instant.now().plusSeconds(3600).getEpochSecond();
            when(videoTokenService.validateAndDecode("tok"))
                    .thenReturn(new VideoTokenService.DecodedVideoToken(100L, 200L, future));
            when(videoTokenService.hashToken("tok")).thenReturn("hash123");
            when(videoAccessLinkRepository.findByTokenHash("hash123")).thenReturn(Optional.of(link));

            assertDoesNotThrow(() -> videoService.recordWatchTime("tok", 60));

            verify(videoAccessLinkRepository, never()).save(any());
        }
    }

    // ─── Get by ID ────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getVideoById")
    class GetVideoById {

        @Test
        @DisplayName("returns video with links for owner")
        void getByIdSuccess() {
            when(viewingVideoRepository.findByIdAndStatus(100L, ViewingVideo.VideoStatus.ACTIVE))
                    .thenReturn(Optional.of(video));
            when(videoAccessLinkRepository.countActiveLinks(eq(100L), any(Instant.class))).thenReturn(1L);
            when(videoAccessLinkRepository.findByVideoId(100L)).thenReturn(List.of(link));

            ViewingVideoDto result = videoService.getVideoById(100L, 1L);

            assertNotNull(result);
            assertEquals(100L, result.getId());
            assertEquals(1L, result.getActiveLinkCount());
            assertNotNull(result.getLinks());
            assertEquals(1, result.getLinks().size());
        }

        @Test
        @DisplayName("throws when not owner")
        void throwsNotOwner() {
            when(viewingVideoRepository.findByIdAndStatus(100L, ViewingVideo.VideoStatus.ACTIVE))
                    .thenReturn(Optional.of(video));

            assertThrows(SecurityException.class,
                    () -> videoService.getVideoById(100L, 999L));
        }
    }

    // ─── List by Viewing Request ──────────────────────────────────────────────────

    @Nested
    @DisplayName("getVideosByViewingRequest")
    class GetVideosByViewingRequest {

        @Test
        @DisplayName("returns videos for apartment owner")
        void forOwner() {
            ViewingRequest vr = ViewingRequest.builder()
                    .id(50L).tenant(tenant).apartment(apartment).build();
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(vr));
            when(viewingVideoRepository.findActiveByViewingRequestId(50L)).thenReturn(List.of(video));
            when(videoAccessLinkRepository.countActiveLinks(eq(100L), any())).thenReturn(0L);

            List<ViewingVideoDto> result = videoService.getVideosByViewingRequest(50L, 1L);

            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("returns videos for tenant")
        void forTenant() {
            ViewingRequest vr = ViewingRequest.builder()
                    .id(50L).tenant(tenant).apartment(apartment).build();
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(vr));
            when(viewingVideoRepository.findActiveByViewingRequestId(50L)).thenReturn(List.of(video));
            when(videoAccessLinkRepository.countActiveLinks(eq(100L), any())).thenReturn(0L);

            List<ViewingVideoDto> result = videoService.getVideosByViewingRequest(50L, 2L);

            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("throws for unauthorized user")
        void throwsUnauthorized() {
            ViewingRequest vr = ViewingRequest.builder()
                    .id(50L).tenant(tenant).apartment(apartment).build();
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(vr));

            assertThrows(SecurityException.class,
                    () -> videoService.getVideosByViewingRequest(50L, 999L));
        }
    }

    // ─── List by Apartment ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getVideosByApartment")
    class GetVideosByApartment {

        @Test
        @DisplayName("returns paged videos for owner")
        void pagedForOwner() {
            PageRequest pageable = PageRequest.of(0, 10);
            Page<ViewingVideo> page = new PageImpl<>(List.of(video));
            when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
            when(viewingVideoRepository.findByApartmentIdAndStatus(10L, ViewingVideo.VideoStatus.ACTIVE, pageable))
                    .thenReturn(page);
            when(videoAccessLinkRepository.countActiveLinks(eq(100L), any())).thenReturn(0L);

            Page<ViewingVideoDto> result = videoService.getVideosByApartment(10L, 1L, pageable);

            assertEquals(1, result.getTotalElements());
        }

        @Test
        @DisplayName("throws when not owner")
        void throwsNotOwner() {
            when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));

            assertThrows(SecurityException.class,
                    () -> videoService.getVideosByApartment(10L, 2L, PageRequest.of(0, 10)));
        }
    }

    // ─── Delete ───────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("deleteVideo")
    class DeleteVideo {

        @Test
        @DisplayName("soft-deletes video and revokes links")
        void deleteSuccess() {
            when(viewingVideoRepository.findByIdAndStatus(100L, ViewingVideo.VideoStatus.ACTIVE))
                    .thenReturn(Optional.of(video));
            when(videoAccessLinkRepository.findActiveLinks(eq(100L), any())).thenReturn(List.of(link));
            when(viewingVideoRepository.save(any())).thenReturn(video);
            when(videoAccessLinkRepository.save(any())).thenReturn(link);

            videoService.deleteVideo(100L, 1L);

            assertEquals(ViewingVideo.VideoStatus.DELETED, video.getStatus());
            assertNotNull(video.getDeletedAt());
            assertTrue(link.isRevoked());
            verify(fileStorageService).delete("apartment-10/uuid.mp4");
        }

        @Test
        @DisplayName("throws when not owner")
        void throwsNotOwner() {
            when(viewingVideoRepository.findByIdAndStatus(100L, ViewingVideo.VideoStatus.ACTIVE))
                    .thenReturn(Optional.of(video));

            assertThrows(SecurityException.class,
                    () -> videoService.deleteVideo(100L, 2L));
        }
    }

    // ─── Revoke Link ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("revokeLink")
    class RevokeLink {

        @Test
        @DisplayName("revokes link for video owner")
        void revokeSuccess() {
            when(videoAccessLinkRepository.findById(200L)).thenReturn(Optional.of(link));
            when(videoAccessLinkRepository.save(any())).thenReturn(link);

            videoService.revokeLink(200L, 1L);

            assertTrue(link.isRevoked());
            verify(videoAccessLinkRepository).save(link);
        }

        @Test
        @DisplayName("throws when link not found")
        void throwsNotFound() {
            when(videoAccessLinkRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> videoService.revokeLink(999L, 1L));
        }

        @Test
        @DisplayName("throws when not video owner")
        void throwsNotOwner() {
            when(videoAccessLinkRepository.findById(200L)).thenReturn(Optional.of(link));

            assertThrows(SecurityException.class,
                    () -> videoService.revokeLink(200L, 2L));
        }
    }

    // ─── Access Logs ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getAccessLogs")
    class GetAccessLogs {

        @Test
        @DisplayName("returns logs for video owner")
        void getLogsSuccess() {
            VideoAccessLog accessLog = VideoAccessLog.builder()
                    .id(300L).link(link).video(video).accessedAt(Instant.now()).build();
            when(viewingVideoRepository.findByIdAndStatus(100L, ViewingVideo.VideoStatus.ACTIVE))
                    .thenReturn(Optional.of(video));
            when(videoAccessLogRepository.findByVideoId(100L)).thenReturn(List.of(accessLog));

            List<VideoAccessLogDto> result = videoService.getAccessLogs(100L, 1L);

            assertEquals(1, result.size());
            assertEquals(300L, result.get(0).getId());
        }
    }

    // ─── Cleanup ──────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("cleanupExpiredVideos")
    class Cleanup {

        @Test
        @DisplayName("revokes expired links and deletes orphaned videos")
        void cleanupSuccess() {
            VideoAccessLink expiredLink = VideoAccessLink.builder()
                    .id(201L).video(video).recipient(tenant).recipientEmail("t@t.com")
                    .tokenHash("h").expiresAt(Instant.now().minusSeconds(3600))
                    .revoked(false).viewCount(0).totalWatchTimeSeconds(0L).build();

            when(videoAccessLinkRepository.findExpiredUnrevokedLinks(any())).thenReturn(List.of(expiredLink));
            when(videoAccessLinkRepository.save(any())).thenReturn(expiredLink);
            when(viewingVideoRepository.findActiveVideosWithAllLinksExpired()).thenReturn(List.of(video));
            when(viewingVideoRepository.save(any())).thenReturn(video);

            videoService.cleanupExpiredVideos();

            assertTrue(expiredLink.isRevoked());
            assertEquals(ViewingVideo.VideoStatus.DELETED, video.getStatus());
            verify(fileStorageService).delete(video.getStoragePath());
        }

        @Test
        @DisplayName("handles empty cleanup gracefully")
        void emptyCleanup() {
            when(videoAccessLinkRepository.findExpiredUnrevokedLinks(any())).thenReturn(List.of());
            when(viewingVideoRepository.findActiveVideosWithAllLinksExpired()).thenReturn(List.of());

            assertDoesNotThrow(() -> videoService.cleanupExpiredVideos());
        }
    }
}
