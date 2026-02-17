package com.sichrplace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDashboardDto {
    private long totalUsers;
    private long totalTenants;
    private long totalLandlords;
    private long totalApartments;
    private long availableApartments;
    private long totalViewingRequests;
    private long pendingViewingRequests;
    private long totalReviews;
    private long pendingReviews;
    private long totalConversations;
    private long totalNotifications;
}
