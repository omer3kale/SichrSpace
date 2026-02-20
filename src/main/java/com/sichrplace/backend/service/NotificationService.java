package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.NotificationDto;
import com.sichrplace.backend.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface NotificationService {

    NotificationDto createNotification(Long userId, Notification.NotificationType type,
                                       String title, String message,
                                       Notification.NotificationPriority priority,
                                       String actionUrl);

    Page<NotificationDto> getUserNotifications(Long userId, Pageable pageable);

    Page<NotificationDto> getUnreadNotifications(Long userId, Pageable pageable);

    NotificationDto markAsRead(Long userId, Long notificationId);

    int markAllAsRead(Long userId);

    long getUnreadCount(Long userId);

    /** Delete a notification belonging to the given user. */
    void deleteNotification(Long userId, Long notificationId);
}
