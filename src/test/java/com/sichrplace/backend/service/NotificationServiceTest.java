package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.NotificationDto;
import com.sichrplace.backend.model.Notification;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.NotificationRepository;
import com.sichrplace.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link NotificationServiceImpl}.
 *
 * <p>Tests cover:
 * <ul>
 *   <li>createNotification — normal + null userId</li>
 *   <li>getUserNotifications — paginated retrieval</li>
 *   <li>getUnreadNotifications — paginated retrieval</li>
 *   <li>markAsRead — ownership check + already-read idempotency</li>
 *   <li>markAllAsRead — delegates to repository</li>
 *   <li>getUnreadCount — delegates to repository</li>
 *   <li>deleteNotification — ownership check, not found</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationService")
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private NotificationServiceImpl notificationService;

    private User testUser;
    private Notification testNotification;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("alice@example.com")
                .password("$2a$10$hashed")
                .firstName("Alice")
                .lastName("Tester")
                .role(User.UserRole.TENANT)
                .isActive(true)
                .build();

        testNotification = Notification.builder()
                .id(100L)
                .user(testUser)
                .type(Notification.NotificationType.SYSTEM_ANNOUNCEMENT)
                .title("Welcome")
                .message("Welcome to SichrPlace!")
                .priority(Notification.NotificationPriority.NORMAL)
                .createdAt(Instant.now())
                .build();
    }

    // ─── createNotification ─────────────────────────────────────────

    @Nested
    @DisplayName("createNotification")
    class CreateTests {

        @Test
        @DisplayName("creates notification for valid user")
        void createsForValidUser() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(notificationRepository.save(any())).thenAnswer(inv -> {
                Notification n = inv.getArgument(0);
                n.setId(100L);
                n.setCreatedAt(Instant.now());
                return n;
            });

            NotificationDto result = notificationService.createNotification(
                    1L,
                    Notification.NotificationType.SYSTEM_ANNOUNCEMENT,
                    "Test", "Test body",
                    Notification.NotificationPriority.NORMAL,
                    "/test"
            );

            assertNotNull(result);
            assertEquals("SYSTEM_ANNOUNCEMENT", result.getType());
            assertEquals("Test", result.getTitle());
            verify(notificationRepository).save(any());
        }

        @Test
        @DisplayName("null userId → returns null (broadcast skip)")
        void nullUserId_returnsNull() {
            NotificationDto result = notificationService.createNotification(
                    null,
                    Notification.NotificationType.SYSTEM_ANNOUNCEMENT,
                    "Test", "Test body",
                    Notification.NotificationPriority.NORMAL,
                    null
            );

            assertNull(result);
            verify(notificationRepository, never()).save(any());
        }

        @Test
        @DisplayName("unknown user → throws IllegalArgumentException")
        void unknownUser_throws() {
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> notificationService.createNotification(
                            999L,
                            Notification.NotificationType.SYSTEM_ANNOUNCEMENT,
                            "Test", "Test body",
                            Notification.NotificationPriority.NORMAL,
                            null
                    ));
        }

        @Test
        @DisplayName("null priority defaults to NORMAL")
        void nullPriority_defaults() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
            when(notificationRepository.save(any())).thenAnswer(inv -> {
                Notification n = inv.getArgument(0);
                n.setId(101L);
                n.setCreatedAt(Instant.now());
                return n;
            });

            NotificationDto result = notificationService.createNotification(
                    1L,
                    Notification.NotificationType.NEW_MESSAGE,
                    "Msg", "Body",
                    null,  // null priority
                    null
            );

            assertNotNull(result);
            assertEquals("NORMAL", result.getPriority());
        }
    }

    // ─── getUserNotifications ───────────────────────────────────────

    @Test
    @DisplayName("getUserNotifications — returns paginated results")
    void getUserNotifications() {
        Page<Notification> page = new PageImpl<>(List.of(testNotification));
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(eq(1L), any(Pageable.class)))
                .thenReturn(page);

        Page<NotificationDto> result = notificationService.getUserNotifications(1L, PageRequest.of(0, 20));

        assertEquals(1, result.getTotalElements());
        assertEquals("Welcome", result.getContent().get(0).getTitle());
    }

    // ─── getUnreadNotifications ─────────────────────────────────────

    @Test
    @DisplayName("getUnreadNotifications — returns only unread")
    void getUnreadNotifications() {
        Page<Notification> page = new PageImpl<>(List.of(testNotification));
        when(notificationRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(eq(1L), any(Pageable.class)))
                .thenReturn(page);

        Page<NotificationDto> result = notificationService.getUnreadNotifications(1L, PageRequest.of(0, 20));

        assertEquals(1, result.getTotalElements());
    }

    // ─── markAsRead ─────────────────────────────────────────────────

    @Nested
    @DisplayName("markAsRead")
    class MarkAsReadTests {

        @Test
        @DisplayName("marks unread notification as read")
        void marksUnread() {
            when(notificationRepository.findById(100L)).thenReturn(Optional.of(testNotification));
            when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            NotificationDto result = notificationService.markAsRead(1L, 100L);

            assertNotNull(result);
            assertNotNull(result.getReadAt());
        }

        @Test
        @DisplayName("already-read notification is idempotent")
        void alreadyRead_idempotent() {
            testNotification.setReadAt(Instant.now().minusSeconds(600));
            when(notificationRepository.findById(100L)).thenReturn(Optional.of(testNotification));

            NotificationDto result = notificationService.markAsRead(1L, 100L);

            assertNotNull(result);
            // save should NOT be called again since it was already read
            verify(notificationRepository, never()).save(any());
        }

        @Test
        @DisplayName("wrong user → throws SecurityException")
        void wrongUser_throws() {
            when(notificationRepository.findById(100L)).thenReturn(Optional.of(testNotification));

            assertThrows(SecurityException.class,
                    () -> notificationService.markAsRead(999L, 100L));
        }

        @Test
        @DisplayName("not found → throws IllegalArgumentException")
        void notFound_throws() {
            when(notificationRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> notificationService.markAsRead(1L, 999L));
        }
    }

    // ─── markAllAsRead ──────────────────────────────────────────────

    @Test
    @DisplayName("markAllAsRead → delegates to repository")
    void markAllAsRead() {
        when(notificationRepository.markAllAsReadByUserId(eq(1L), any(Instant.class))).thenReturn(3);

        int count = notificationService.markAllAsRead(1L);

        assertEquals(3, count);
    }

    // ─── getUnreadCount ─────────────────────────────────────────────

    @Test
    @DisplayName("getUnreadCount → returns count from repository")
    void getUnreadCount() {
        when(notificationRepository.countByUserIdAndReadAtIsNull(1L)).thenReturn(5L);

        long count = notificationService.getUnreadCount(1L);

        assertEquals(5L, count);
    }

    // ─── deleteNotification ─────────────────────────────────────────

    @Nested
    @DisplayName("deleteNotification")
    class DeleteTests {

        @Test
        @DisplayName("owner can delete notification")
        void ownerDeletes() {
            when(notificationRepository.findById(100L)).thenReturn(Optional.of(testNotification));

            assertDoesNotThrow(() -> notificationService.deleteNotification(1L, 100L));

            verify(notificationRepository).delete(testNotification);
        }

        @Test
        @DisplayName("wrong user → throws SecurityException")
        void wrongUser_throws() {
            when(notificationRepository.findById(100L)).thenReturn(Optional.of(testNotification));

            assertThrows(SecurityException.class,
                    () -> notificationService.deleteNotification(999L, 100L));

            verify(notificationRepository, never()).delete(any());
        }

        @Test
        @DisplayName("not found → throws IllegalArgumentException")
        void notFound_throws() {
            when(notificationRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> notificationService.deleteNotification(1L, 999L));
        }
    }
}
