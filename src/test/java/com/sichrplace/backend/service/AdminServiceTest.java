package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.AdminDashboardDto;
import com.sichrplace.backend.dto.UpdateUserRoleRequest;
import com.sichrplace.backend.dto.UpdateUserStatusRequest;
import com.sichrplace.backend.dto.UserDto;
import com.sichrplace.backend.model.ApartmentReview;
import com.sichrplace.backend.model.Notification;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.ApartmentReviewRepository;
import com.sichrplace.backend.repository.ConversationRepository;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.repository.ViewingRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminServiceImpl")
class AdminServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private ApartmentRepository apartmentRepository;
    @Mock private ViewingRequestRepository viewingRequestRepository;
    @Mock private ApartmentReviewRepository reviewRepository;
    @Mock private ConversationRepository conversationRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks private AdminServiceImpl adminService;

    private User targetUser;

    @BeforeEach
    void setUp() {
        targetUser = User.builder()
                .id(2L)
                .email("tenant@example.com")
                .firstName("Ten")
                .lastName("Ant")
                .role(User.UserRole.TENANT)
                .isActive(true)
                .build();
    }

    @Test
    void getDashboard_aggregatesAllCounters() {
        when(userRepository.count()).thenReturn(10L);
        when(apartmentRepository.count()).thenReturn(6L);
        when(viewingRequestRepository.count()).thenReturn(8L);
        when(reviewRepository.findByStatus(eq(ApartmentReview.ReviewStatus.PENDING), eq(Pageable.unpaged())))
                .thenReturn(new PageImpl<>(List.of(), Pageable.unpaged(), 3));
        when(conversationRepository.count()).thenReturn(4L);

        AdminDashboardDto result = adminService.getDashboard();

        assertEquals(10L, result.getTotalUsers());
        assertEquals(6L, result.getTotalApartments());
        assertEquals(8L, result.getTotalViewingRequests());
        assertEquals(3L, result.getPendingReviews());
        assertEquals(4L, result.getTotalConversations());
    }

    @Test
    void getAllUsers_mapsPageToDto() {
        Page<User> users = new PageImpl<>(List.of(targetUser), PageRequest.of(0, 10), 1);
        when(userRepository.findAll(any(Pageable.class))).thenReturn(users);

        Page<UserDto> result = adminService.getAllUsers(PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals("tenant@example.com", result.getContent().get(0).getEmail());
    }

    @Test
    void updateUserRole_success_sendsNotification() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserDto result = adminService.updateUserRole(1L, 2L, new UpdateUserRoleRequest("landlord"));

        assertEquals("LANDLORD", result.getRole());
        verify(notificationService).createNotification(
                eq(2L), eq(Notification.NotificationType.ACCOUNT_UPDATE), eq("Role Updated"), anyString(),
                eq(Notification.NotificationPriority.HIGH), eq("/profile")
        );
    }

    @Test
    void updateUserRole_selfChangeDenied() {
        assertThrows(IllegalStateException.class,
                () -> adminService.updateUserRole(1L, 1L, new UpdateUserRoleRequest("ADMIN")));
    }

    @Test
    void updateUserRole_userNotFound_throws() {
        when(userRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> adminService.updateUserRole(1L, 2L, new UpdateUserRoleRequest("LANDLORD")));
    }

    @Test
    void updateUserRole_invalidRole_throws() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(targetUser));

        assertThrows(IllegalArgumentException.class,
                () -> adminService.updateUserRole(1L, 2L, new UpdateUserRoleRequest("no_such_role")));
    }

    @Test
    void updateUserStatus_selfChangeDenied() {
        assertThrows(IllegalStateException.class,
                () -> adminService.updateUserStatus(1L, 1L, new UpdateUserStatusRequest("inactive", "x")));
    }

    @Test
    void updateUserStatus_notFound_throws() {
        when(userRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> adminService.updateUserStatus(1L, 2L, new UpdateUserStatusRequest("active", null)));
    }

    @Test
    void updateUserStatus_active_doesNotSendSuspensionNotification() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserDto result = adminService.updateUserStatus(1L, 2L, new UpdateUserStatusRequest("active", null));

        assertTrue(result.getIsActive());
        verify(notificationService, never()).createNotification(any(), any(), anyString(), anyString(), any(), any());
    }

    @Test
    void updateUserStatus_inactive_sendsSuspensionNotification() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserDto result = adminService.updateUserStatus(1L, 2L, new UpdateUserStatusRequest("inactive", "policy"));

        assertFalse(result.getIsActive());
        verify(notificationService).createNotification(
                eq(2L), eq(Notification.NotificationType.ACCOUNT_UPDATE), eq("Account Suspended"), anyString(),
                eq(Notification.NotificationPriority.URGENT), isNull()
        );
    }
}
