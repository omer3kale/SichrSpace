package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.PaymentSessionDto;
import com.sichrplace.backend.dto.ViewingRequestDto;
import com.sichrplace.backend.dto.ViewingRequestStatsDto;
import com.sichrplace.backend.dto.ViewingRequestTransitionDto;
import com.sichrplace.backend.dto.CreateViewingRequestRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;

public interface ViewingRequestService {
    ViewingRequestDto createViewingRequest(Long tenantId, CreateViewingRequestRequest request);
    ViewingRequestDto getViewingRequestById(Long id, Long userId);
    List<ViewingRequestDto> getViewingRequestsByTenant(Long tenantId);
    Page<ViewingRequestDto> getViewingRequestsByTenantPaged(Long tenantId, ViewingRequestStatus status, Pageable pageable);
    List<ViewingRequestDto> getViewingRequestsByApartment(Long apartmentId, Long userId);
    Page<ViewingRequestDto> getViewingRequestsByApartmentPaged(Long apartmentId, Long userId, ViewingRequestStatus status, Pageable pageable);

    /** Get all viewing requests received by a landlord (across all their apartments). */
    List<ViewingRequestDto> getViewingRequestsReceivedByLandlord(Long landlordId);
    ViewingRequestDto confirmViewingRequest(Long id, Long ownerId);
    ViewingRequestDto declineViewingRequest(Long id, Long ownerId, String reason);
    void cancelViewingRequest(Long id, Long tenantId);
    List<ViewingRequestTransitionDto> getTransitionHistory(Long viewingRequestId, Long userId);

    /** Mark a CONFIRMED viewing request as COMPLETED. */
    ViewingRequestDto completeViewingRequest(Long id, Long userId);

    /** Get aggregated viewing-request statistics for the current user. */
    ViewingRequestStatsDto getStatistics(Long userId);

    /** Mark a viewing request as requiring payment and create an associated PaymentTransaction. */
    ViewingRequestDto markViewingAsPaymentRequired(Long viewingId, BigDecimal amount, String currency, String provider);

    /** Remove the payment requirement from a viewing request (admin/manual override). */
    ViewingRequestDto clearPaymentRequirement(Long viewingId);

    /** Start a payment session for a viewing request (stubbed provider). */
    PaymentSessionDto createPaymentSession(Long viewingRequestId, Long userId, String provider);

    /** Get the current payment status for a viewing request. */
    String getPaymentStatus(Long viewingRequestId, Long userId);

    /** FTL-17: Admin-only listing of all viewing requests with optional status filter. */
    Page<ViewingRequestDto> getAllViewingRequestsAdmin(String status, Pageable pageable);

    enum ViewingRequestStatus {
        PENDING, CONFIRMED, DECLINED, COMPLETED, CANCELLED
    }
}
