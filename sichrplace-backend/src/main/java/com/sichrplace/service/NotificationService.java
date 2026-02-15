package com.sichrplace.service;

import com.sichrplace.entity.Notification;
import com.sichrplace.entity.User;
import com.sichrplace.repository.NotificationRepository;
import com.sichrplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Notification create(UUID userId, String type, String title, String message,
                                String actionUrl, String priority) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .actionUrl(actionUrl)
                .priority(priority != null ? priority : "normal")
                .build();

        notification = notificationRepository.save(notification);

        // Push via WebSocket
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/notifications",
                Map.of(
                        "id", notification.getId().toString(),
                        "type", type,
                        "title", title,
                        "message", message,
                        "priority", notification.getPriority(),
                        "createdAt", notification.getCreatedAt().toString()
                )
        );

        log.info("Notification sent to user {}: {}", userId, title);
        return notification;
    }

    public Page<Notification> getUserNotifications(UUID userId, int page, int size) {
        return notificationRepository.findByUser_IdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
    }

    public long getUnreadCount(UUID userId) {
        return notificationRepository.countUnreadByUserId(userId);
    }

    @Transactional
    public int markAllAsRead(UUID userId) {
        return notificationRepository.markAllAsRead(userId);
    }
}
