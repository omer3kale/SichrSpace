package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.Notification;
import com.sichrplace.backend.model.PaymentTransaction;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.ViewingRequest;
import com.sichrplace.backend.model.ViewingRequestTransition;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;

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

    @Test
    @DisplayName("ViewingRequestDto.fromEntity maps all viewing fields")
    void viewingRequestDto_fromEntity() {
        User tenant = User.builder()
                .id(11L)
                .firstName("Test")
                .lastName("Tenant")
                .email("tenant@x.com")
                .password("hashed")
                .role(User.UserRole.TENANT)
                .build();
        User landlord = User.builder()
                .id(12L)
                .firstName("Land")
                .lastName("Lord")
                .email("landlord@x.com")
                .password("hashed")
                .role(User.UserRole.LANDLORD)
                .build();
        Apartment apartment = Apartment.builder()
                .id(90L)
                .title("City Flat")
                .owner(landlord)
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .build();

        Instant createdAt = Instant.now().minusSeconds(600);
        Instant updatedAt = Instant.now().minusSeconds(100);
        LocalDateTime proposed = LocalDateTime.of(2026, 1, 10, 12, 30);
        LocalDateTime responded = LocalDateTime.of(2026, 1, 9, 10, 0);

        ViewingRequest request = ViewingRequest.builder()
                .id(701L)
                .apartment(apartment)
                .tenant(tenant)
                .proposedDateTime(proposed)
                .message("Looking forward")
                .status(ViewingRequest.ViewingStatus.CONFIRMED)
                .respondedAt(responded)
                .confirmedDateTime(proposed)
                .declineReason(null)
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .build();

        ViewingRequestDto dto = ViewingRequestDto.fromEntity(request);

        assertEquals(701L, dto.getId());
        assertEquals(90L, dto.getApartmentId());
        assertEquals("City Flat", dto.getApartmentTitle());
        assertEquals(11L, dto.getTenantId());
        assertEquals("Test Tenant", dto.getTenantName());
        assertEquals("CONFIRMED", dto.getStatus());
        assertEquals("Looking forward", dto.getMessage());
        assertEquals(proposed, dto.getProposedDateTime());
        assertEquals(responded, dto.getRespondedAt());
        assertEquals(createdAt, dto.getCreatedAt());
        assertEquals(updatedAt, dto.getUpdatedAt());
        // No payment linked — defaults
        assertFalse(dto.getPaymentRequired());
        assertNull(dto.getPaymentStatus());
    }

    @Test
    @DisplayName("ViewingRequestDto.fromEntity maps payment fields when transaction attached")
    void viewingRequestDto_withPaymentTransaction() {
        User tenant = User.builder().id(11L).firstName("Test").lastName("Tenant")
                .email("t@x.com").password("h").role(User.UserRole.TENANT).build();
        User landlord = User.builder().id(12L).firstName("Land").lastName("Lord")
                .email("l@x.com").password("h").role(User.UserRole.LANDLORD).build();
        Apartment apartment = Apartment.builder().id(90L).title("City Flat")
                .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE).build();

        PaymentTransaction tx = PaymentTransaction.builder()
                .id(50L)
                .provider("PAYPAL")
                .amount(java.math.BigDecimal.valueOf(200))
                .status(PaymentTransaction.PaymentTransactionStatus.PENDING)
                .build();

        ViewingRequest request = ViewingRequest.builder()
                .id(702L)
                .apartment(apartment)
                .tenant(tenant)
                .proposedDateTime(LocalDateTime.of(2026, 2, 1, 10, 0))
                .message("Payment test")
                .status(ViewingRequest.ViewingStatus.PENDING)
                .paymentRequired(true)
                .paymentTransaction(tx)
                .build();

        ViewingRequestDto dto = ViewingRequestDto.fromEntity(request);

        assertEquals(702L, dto.getId());
        assertTrue(dto.getPaymentRequired());
        assertEquals("PENDING", dto.getPaymentStatus());
    }

    @Test
    @DisplayName("ViewingRequestTransitionDto.fromEntity maps transition fields")
    void viewingRequestTransitionDto_fromEntity() {
        User actor = User.builder()
                .id(22L)
                .firstName("Admin")
                .lastName("User")
                .email("admin@x.com")
                .password("hashed")
                .role(User.UserRole.ADMIN)
                .build();
        User tenant = User.builder()
                .id(23L)
                .firstName("Tenant")
                .lastName("One")
                .email("tenant1@x.com")
                .password("hashed")
                .role(User.UserRole.TENANT)
                .build();
        Apartment apartment = Apartment.builder()
                .id(91L)
                .title("Loft")
                .owner(actor)
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .build();
        ViewingRequest request = ViewingRequest.builder()
                .id(702L)
                .tenant(tenant)
                .apartment(apartment)
                .status(ViewingRequest.ViewingStatus.PENDING)
                .proposedDateTime(LocalDateTime.of(2026, 1, 20, 18, 0))
                .build();

        LocalDateTime changedAt = LocalDateTime.of(2026, 1, 18, 9, 15);
        ViewingRequestTransition transition = ViewingRequestTransition.builder()
                .id(81L)
                .viewingRequest(request)
                .fromStatus("PENDING")
                .toStatus("DECLINED")
                .changedBy(actor)
                .changedAt(changedAt)
                .reason("No longer available")
                .build();

        ViewingRequestTransitionDto dto = ViewingRequestTransitionDto.fromEntity(transition);

        assertEquals(81L, dto.getId());
        assertEquals(702L, dto.getViewingRequestId());
        assertEquals("PENDING", dto.getFromStatus());
        assertEquals("DECLINED", dto.getToStatus());
        assertEquals(22L, dto.getChangedById());
        assertEquals("Admin User", dto.getChangedByName());
        assertEquals(changedAt, dto.getChangedAt());
        assertEquals("No longer available", dto.getReason());
    }

    @Test
    @DisplayName("ViewingRequestStatsDto builder supports zero and null average")
    void viewingRequestStatsDto_builderBoundaryValues() {
        ViewingRequestStatsDto stats = ViewingRequestStatsDto.builder()
                .totalRequests(0)
                .pendingCount(0)
                .confirmedCount(0)
                .declinedCount(0)
                .completedCount(0)
                .cancelledCount(0)
                .averageResponseTimeHours(null)
                .build();

        assertEquals(0, stats.getTotalRequests());
        assertEquals(0, stats.getPendingCount());
        assertEquals(0, stats.getConfirmedCount());
        assertEquals(0, stats.getDeclinedCount());
        assertEquals(0, stats.getCompletedCount());
        assertEquals(0, stats.getCancelledCount());
        assertNull(stats.getAverageResponseTimeHours());
    }
}
