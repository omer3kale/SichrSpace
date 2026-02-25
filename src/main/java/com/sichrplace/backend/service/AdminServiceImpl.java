package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.AdminDashboardDto;
import com.sichrplace.backend.dto.UpdateUserRoleRequest;
import com.sichrplace.backend.dto.UpdateUserStatusRequest;
import com.sichrplace.backend.dto.UserDto;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.ApartmentReview;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.Notification;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.ApartmentReviewRepository;
import com.sichrplace.backend.repository.ConversationRepository;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.repository.ViewingRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final ApartmentRepository apartmentRepository;
    private final ViewingRequestRepository viewingRequestRepository;
    private final ApartmentReviewRepository reviewRepository;
    private final ConversationRepository conversationRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public AdminDashboardDto getDashboard() {
        long totalUsers = userRepository.count();
        long totalApartments = apartmentRepository.count();
        long totalViewingRequests = viewingRequestRepository.count();
        long pendingReviews = reviewRepository.findByStatus(
                ApartmentReview.ReviewStatus.PENDING, Pageable.unpaged()).getTotalElements();
        long totalConversations = conversationRepository.count();

        return AdminDashboardDto.builder()
                .totalUsers(totalUsers)
                .totalApartments(totalApartments)
                .totalViewingRequests(totalViewingRequests)
                .pendingReviews(pendingReviews)
                .totalConversations(totalConversations)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserDto> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable)
                .map(UserDto::fromEntity);
    }

    @Override
    @Transactional
    public UserDto updateUserRole(Long adminId, Long userId, UpdateUserRoleRequest request) {
        if (adminId.equals(userId)) {
            throw new IllegalStateException("Cannot change your own role");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        User.UserRole newRole = User.UserRole.valueOf(request.getRole().toUpperCase(java.util.Locale.ROOT));
        User.UserRole oldRole = user.getRole();
        user.setRole(newRole);
        User saved = userRepository.save(user);

        log.info("Admin {} changed user {} role: {} → {}", adminId, userId, oldRole, newRole);

        notificationService.createNotification(
                userId,
                Notification.NotificationType.ACCOUNT_UPDATE,
                "Role Updated",
                "Your account role has been updated to " + newRole.name() + ".",
                Notification.NotificationPriority.HIGH,
                "/profile"
        );

        return UserDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public UserDto updateUserStatus(Long adminId, Long userId, UpdateUserStatusRequest request) {
        if (adminId.equals(userId)) {
            throw new IllegalStateException("Cannot change your own status");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean newStatus = "active".equalsIgnoreCase(request.getStatus());
        user.setIsActive(newStatus);
        User saved = userRepository.save(user);

        log.info("Admin {} set user {} active={} (reason: {})",
                adminId, userId, newStatus, request.getReason());

        if (!newStatus) {
            notificationService.createNotification(
                    userId,
                    Notification.NotificationType.ACCOUNT_UPDATE,
                    "Account Suspended",
                    "Your account has been suspended. Reason: " +
                            (request.getReason() != null ? request.getReason() : "No reason provided"),
                    Notification.NotificationPriority.URGENT,
                    null
            );
        }

        return UserDto.fromEntity(saved);
    }
}
