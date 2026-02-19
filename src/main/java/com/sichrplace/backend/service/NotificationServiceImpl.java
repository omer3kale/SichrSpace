package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.NotificationDto;
import com.sichrplace.backend.model.Notification;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.NotificationRepository;
import com.sichrplace.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public NotificationDto createNotification(Long userId, Notification.NotificationType type,
                                               String title, String message,
                                               Notification.NotificationPriority priority,
                                               String actionUrl) {
        // If userId is null (e.g. broadcast/admin notifications), skip
        if (userId == null) {
            log.debug("Skipping notification creation — no target user (type={})", type);
            return null;
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setPriority(priority != null ? priority : Notification.NotificationPriority.NORMAL);
        notification.setActionUrl(actionUrl);

        Notification saved = notificationRepository.save(notification);
        log.info("Created notification for user {} — type={}, title={}", userId, type, title);
        return NotificationDto.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationDto> getUserNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationDto::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationDto> getUnreadNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationDto::fromEntity);
    }

    @Override
    @Transactional
    public NotificationDto markAsRead(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

        if (!notification.getUser().getId().equals(userId)) {
            throw new SecurityException("Not authorized to access this notification");
        }

        if (notification.getReadAt() == null) {
            notification.setReadAt(Instant.now());
            notification = notificationRepository.save(notification);
        }

        return NotificationDto.fromEntity(notification);
    }

    @Override
    @Transactional
    public int markAllAsRead(Long userId) {
        int count = notificationRepository.markAllAsReadByUserId(userId, java.time.Instant.now());
        log.info("Marked {} notifications as read for user {}", count, userId);
        return count;
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadAtIsNull(userId);
    }
}
