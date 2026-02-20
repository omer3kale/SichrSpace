package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.Notification;
import com.sichrplace.backend.model.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for DTO {@code fromEntity()} mapping methods.
 * Ensures all entity fields are correctly mapped to DTOs.
 */
@DisplayName("DTO — fromEntity mapping")
class DtoMappingTest {

    @Test
    @DisplayName("UserDto.fromEntity maps all fields")
    void userDto_fromEntity() {
        User user = User.builder()
                .id(1L)
                .email("alice@example.com")
                .password("hashed")
                .firstName("Alice")
                .lastName("Tester")
                .bio("Test bio")
                .phone("123456")
                .role(User.UserRole.TENANT)
                .emailVerified(true)
                .profileImageUrl("https://img.example.com/avatar.png")
                .city("Berlin")
                .country("Germany")
                .isActive(true)
                .lastLoginAt(Instant.now())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        UserDto dto = UserDto.fromEntity(user);

        assertEquals(1L, dto.getId());
        assertEquals("alice@example.com", dto.getEmail());
        assertEquals("Alice", dto.getFirstName());
        assertEquals("Tester", dto.getLastName());
        assertEquals("Test bio", dto.getBio());
        assertEquals("123456", dto.getPhone());
        assertEquals("TENANT", dto.getRole());
        assertTrue(dto.getEmailVerified());
        assertEquals("https://img.example.com/avatar.png", dto.getProfileImageUrl());
        assertEquals("Berlin", dto.getCity());
        assertEquals("Germany", dto.getCountry());
        assertTrue(dto.getIsActive());
        assertNotNull(dto.getLastLoginAt());
        assertNotNull(dto.getCreatedAt());
        assertNotNull(dto.getUpdatedAt());
    }

    @Test
    @DisplayName("UserDto.fromEntity handles null optional fields")
    void userDto_fromEntity_nullFields() {
        User user = User.builder()
                .id(2L)
                .email("bob@example.com")
                .password("hashed")
                .firstName("Bob")
                .lastName("Builder")
                .role(User.UserRole.LANDLORD)
                .isActive(true)
                .build();

        UserDto dto = UserDto.fromEntity(user);

        assertEquals(2L, dto.getId());
        assertNull(dto.getBio());
        assertNull(dto.getPhone());
        assertNull(dto.getCity());
        assertNull(dto.getCountry());
        assertNull(dto.getProfileImageUrl());
        assertNull(dto.getLastLoginAt());
    }

    @Test
    @DisplayName("NotificationDto.fromEntity maps all fields")
    void notificationDto_fromEntity() {
        User user = User.builder()
                .id(1L)
                .email("alice@example.com")
                .password("hashed")
                .role(User.UserRole.TENANT)
                .build();

        Notification notification = Notification.builder()
                .id(100L)
                .user(user)
                .type(Notification.NotificationType.NEW_MESSAGE)
                .title("New message")
                .message("You have a new message from Bob")
                .relatedEntityType("Conversation")
                .relatedEntityId(50L)
                .readAt(null)
                .actionUrl("/conversations/50")
                .priority(Notification.NotificationPriority.HIGH)
                .createdAt(Instant.now())
                .build();

        NotificationDto dto = NotificationDto.fromEntity(notification);

        assertEquals(100L, dto.getId());
        assertEquals("NEW_MESSAGE", dto.getType());
        assertEquals("New message", dto.getTitle());
        assertEquals("You have a new message from Bob", dto.getMessage());
        assertEquals("Conversation", dto.getRelatedEntityType());
        assertEquals(50L, dto.getRelatedEntityId());
        assertNull(dto.getReadAt());
        assertEquals("/conversations/50", dto.getActionUrl());
        assertEquals("HIGH", dto.getPriority());
        assertNotNull(dto.getCreatedAt());
    }

    @Test
    @DisplayName("NotificationDto.fromEntity handles read notification")
    void notificationDto_fromEntity_read() {
        User user = User.builder()
                .id(1L)
                .email("alice@example.com")
                .role(User.UserRole.TENANT)
                .build();

        Instant readAt = Instant.now().minusSeconds(300);
        Notification notification = Notification.builder()
                .id(101L)
                .user(user)
                .type(Notification.NotificationType.VIEWING_APPROVED)
                .title("Viewing approved")
                .message("Your viewing request has been approved")
                .readAt(readAt)
                .priority(Notification.NotificationPriority.NORMAL)
                .createdAt(Instant.now().minusSeconds(600))
                .build();

        NotificationDto dto = NotificationDto.fromEntity(notification);

        assertEquals(readAt, dto.getReadAt());
        assertEquals("VIEWING_APPROVED", dto.getType());
    }
}
