package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ViewingRequestDto;
import com.sichrplace.backend.dto.ViewingRequestStatsDto;
import com.sichrplace.backend.dto.ViewingRequestTransitionDto;
import com.sichrplace.backend.dto.CreateViewingRequestRequest;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.ViewingRequest;
import com.sichrplace.backend.model.ViewingRequestTransition;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.repository.ViewingRequestRepository;
import com.sichrplace.backend.repository.ViewingRequestTransitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ViewingRequestServiceImpl implements ViewingRequestService {

    private final ViewingRequestRepository viewingRequestRepository;
    private final ViewingRequestTransitionRepository transitionRepository;
    private final ApartmentRepository apartmentRepository;
    private final UserRepository userRepository;

    @Override
    public ViewingRequestDto createViewingRequest(Long tenantId, CreateViewingRequestRequest request) {
        User tenant = userRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        Apartment apartment = apartmentRepository.findById(request.getApartmentId())
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        if (apartment.getStatus() != Apartment.ApartmentStatus.AVAILABLE) {
            throw new IllegalStateException("Apartment is not available for viewing");
        }

        if (apartment.getOwner().getId().equals(tenantId)) {
            throw new IllegalArgumentException("Cannot request a viewing for your own apartment");
        }

        ViewingRequest viewingRequest = ViewingRequest.builder()
                .apartment(apartment)
                .tenant(tenant)
                .proposedDateTime(request.getProposedDateTime())
                .message(request.getMessage())
                .status(ViewingRequest.ViewingStatus.PENDING)
                .build();

        viewingRequest = viewingRequestRepository.save(viewingRequest);

        // Record the initial PENDING transition
        transitionRepository.save(ViewingRequestTransition.builder()
                .viewingRequest(viewingRequest)
                .fromStatus(null)
                .toStatus(ViewingRequest.ViewingStatus.PENDING.name())
                .changedBy(tenant)
                .changedAt(LocalDateTime.now())
                .reason("Viewing request created")
                .build());

        log.info("Viewing request created id={}, tenantId={}, apartmentId={}",
                viewingRequest.getId(), tenantId, request.getApartmentId());
        return ViewingRequestDto.fromEntity(viewingRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public ViewingRequestDto getViewingRequestById(Long id, Long userId) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        boolean isTenant = viewingRequest.getTenant().getId().equals(userId);
        boolean isOwner = viewingRequest.getApartment().getOwner().getId().equals(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean isAdmin = user.getRole() == User.UserRole.ADMIN;

        if (!isTenant && !isOwner && !isAdmin) {
            log.warn("Unauthorized viewing request access userId={}, requestId={}", userId, id);
            throw new SecurityException("Not authorized to view this request");
        }

        return ViewingRequestDto.fromEntity(viewingRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ViewingRequestDto> getViewingRequestsByTenant(Long tenantId) {
        return viewingRequestRepository.findByTenantId(tenantId)
                .stream()
                .map(ViewingRequestDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ViewingRequestDto> getViewingRequestsByTenantPaged(Long tenantId, ViewingRequestStatus status, Pageable pageable) {
        ViewingRequest.ViewingStatus viewingStatus = ViewingRequest.ViewingStatus.valueOf(status.name());
        return viewingRequestRepository.findByTenantIdAndStatus(tenantId, viewingStatus, pageable)
                .map(ViewingRequestDto::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ViewingRequestDto> getViewingRequestsByApartment(Long apartmentId, Long userId) {
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean isAdmin = user.getRole() == User.UserRole.ADMIN;

        if (!isAdmin && !apartment.getOwner().getId().equals(userId)) {
            log.warn("Unauthorized apartment viewing-requests access userId={}, apartmentId={}", userId, apartmentId);
            throw new SecurityException("Not authorized to view requests for this apartment");
        }

        return viewingRequestRepository.findByApartmentId(apartmentId)
                .stream()
                .map(ViewingRequestDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ViewingRequestDto> getViewingRequestsByApartmentPaged(Long apartmentId, Long userId,
                                                                       ViewingRequestStatus status, Pageable pageable) {
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean isAdmin = user.getRole() == User.UserRole.ADMIN;

        if (!isAdmin && !apartment.getOwner().getId().equals(userId)) {
            log.warn("Unauthorized apartment viewing-requests paged access userId={}, apartmentId={}", userId, apartmentId);
            throw new SecurityException("Not authorized to view requests for this apartment");
        }

        ViewingRequest.ViewingStatus viewingStatus = ViewingRequest.ViewingStatus.valueOf(status.name());
        return viewingRequestRepository.findByApartmentIdAndStatus(apartmentId, viewingStatus, pageable)
                .map(ViewingRequestDto::fromEntity);
    }

    @Override
    public ViewingRequestDto confirmViewingRequest(Long id, Long ownerId) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        if (!viewingRequest.getApartment().getOwner().getId().equals(ownerId)) {
            throw new SecurityException("Not authorized to confirm this request");
        }

        if (viewingRequest.getStatus() != ViewingRequest.ViewingStatus.PENDING) {
            throw new IllegalStateException("Only PENDING requests can be confirmed (current: "
                    + viewingRequest.getStatus() + ")");
        }

        viewingRequest.setStatus(ViewingRequest.ViewingStatus.CONFIRMED);
        viewingRequest.setConfirmedDateTime(viewingRequest.getProposedDateTime());
        viewingRequest.setRespondedAt(LocalDateTime.now());

        viewingRequest = viewingRequestRepository.save(viewingRequest);

        // Record the PENDING → CONFIRMED transition
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        transitionRepository.save(ViewingRequestTransition.builder()
                .viewingRequest(viewingRequest)
                .fromStatus(ViewingRequest.ViewingStatus.PENDING.name())
                .toStatus(ViewingRequest.ViewingStatus.CONFIRMED.name())
                .changedBy(owner)
                .changedAt(LocalDateTime.now())
                .build());

        log.info("Viewing request confirmed id={}, ownerId={}", id, ownerId);
        return ViewingRequestDto.fromEntity(viewingRequest);
    }

    @Override
    public ViewingRequestDto declineViewingRequest(Long id, Long ownerId, String reason) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        if (!viewingRequest.getApartment().getOwner().getId().equals(ownerId)) {
            throw new SecurityException("Not authorized to decline this request");
        }

        if (viewingRequest.getStatus() != ViewingRequest.ViewingStatus.PENDING) {
            throw new IllegalStateException("Only PENDING requests can be declined (current: "
                    + viewingRequest.getStatus() + ")");
        }

        viewingRequest.setStatus(ViewingRequest.ViewingStatus.DECLINED);
        viewingRequest.setDeclineReason(reason);
        viewingRequest.setRespondedAt(LocalDateTime.now());

        viewingRequest = viewingRequestRepository.save(viewingRequest);

        // Record the PENDING → DECLINED transition
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        transitionRepository.save(ViewingRequestTransition.builder()
                .viewingRequest(viewingRequest)
                .fromStatus(ViewingRequest.ViewingStatus.PENDING.name())
                .toStatus(ViewingRequest.ViewingStatus.DECLINED.name())
                .changedBy(owner)
                .changedAt(LocalDateTime.now())
                .reason(reason)
                .build());

        log.info("Viewing request declined id={}, ownerId={}", id, ownerId);
        return ViewingRequestDto.fromEntity(viewingRequest);
    }

    @Override
    public void cancelViewingRequest(Long id, Long tenantId) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        if (!viewingRequest.getTenant().getId().equals(tenantId)) {
            throw new SecurityException("Not authorized to cancel this request");
        }

        if (viewingRequest.getStatus() != ViewingRequest.ViewingStatus.PENDING
                && viewingRequest.getStatus() != ViewingRequest.ViewingStatus.CONFIRMED) {
            throw new IllegalStateException("Only PENDING or CONFIRMED requests can be cancelled (current: "
                    + viewingRequest.getStatus() + ")");
        }

        String previousStatus = viewingRequest.getStatus().name();
        viewingRequest.setStatus(ViewingRequest.ViewingStatus.CANCELLED);
        viewingRequestRepository.save(viewingRequest);

        // Record the → CANCELLED transition
        User tenant = userRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        transitionRepository.save(ViewingRequestTransition.builder()
                .viewingRequest(viewingRequest)
                .fromStatus(previousStatus)
                .toStatus(ViewingRequest.ViewingStatus.CANCELLED.name())
                .changedBy(tenant)
                .changedAt(LocalDateTime.now())
                .build());

        log.info("Viewing request cancelled id={}, tenantId={}", id, tenantId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ViewingRequestTransitionDto> getTransitionHistory(Long viewingRequestId, Long userId) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(viewingRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        boolean isTenant = viewingRequest.getTenant().getId().equals(userId);
        boolean isOwner = viewingRequest.getApartment().getOwner().getId().equals(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean isAdmin = user.getRole() == User.UserRole.ADMIN;

        if (!isTenant && !isOwner && !isAdmin) {
            log.warn("Unauthorized transition history access userId={}, requestId={}", userId, viewingRequestId);
            throw new SecurityException("Not authorized to view transition history");
        }

        return transitionRepository.findByViewingRequestIdOrderByChangedAtAsc(viewingRequestId)
                .stream()
                .map(ViewingRequestTransitionDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public ViewingRequestDto completeViewingRequest(Long id, Long userId) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        // Either the landlord or the tenant can mark as completed
        boolean isTenant = viewingRequest.getTenant().getId().equals(userId);
        boolean isOwner = viewingRequest.getApartment().getOwner().getId().equals(userId);
        if (!isTenant && !isOwner) {
            throw new SecurityException("Not authorized to complete this viewing request");
        }

        if (viewingRequest.getStatus() != ViewingRequest.ViewingStatus.CONFIRMED) {
            throw new IllegalStateException("Only CONFIRMED requests can be marked as completed (current: "
                    + viewingRequest.getStatus() + ")");
        }

        viewingRequest.setStatus(ViewingRequest.ViewingStatus.COMPLETED);
        viewingRequest = viewingRequestRepository.save(viewingRequest);

        // Record the CONFIRMED → COMPLETED transition
        User actor = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        transitionRepository.save(ViewingRequestTransition.builder()
                .viewingRequest(viewingRequest)
                .fromStatus(ViewingRequest.ViewingStatus.CONFIRMED.name())
                .toStatus(ViewingRequest.ViewingStatus.COMPLETED.name())
                .changedBy(actor)
                .changedAt(LocalDateTime.now())
                .reason("Viewing completed")
                .build());

        log.info("Viewing request completed id={}, userId={}", id, userId);
        return ViewingRequestDto.fromEntity(viewingRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public ViewingRequestStatsDto getStatistics(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        long total, pending, confirmed, declined, completed, cancelled;

        if (user.getRole() == User.UserRole.LANDLORD) {
            // Landlord sees stats for requests against their apartments
            total     = viewingRequestRepository.countByLandlordId(userId);
            pending   = viewingRequestRepository.countByLandlordIdAndStatus(userId, ViewingRequest.ViewingStatus.PENDING);
            confirmed = viewingRequestRepository.countByLandlordIdAndStatus(userId, ViewingRequest.ViewingStatus.CONFIRMED);
            declined  = viewingRequestRepository.countByLandlordIdAndStatus(userId, ViewingRequest.ViewingStatus.DECLINED);
            completed = viewingRequestRepository.countByLandlordIdAndStatus(userId, ViewingRequest.ViewingStatus.COMPLETED);
            cancelled = viewingRequestRepository.countByLandlordIdAndStatus(userId, ViewingRequest.ViewingStatus.CANCELLED);
        } else {
            // Tenant (or admin) sees their own request stats
            total     = viewingRequestRepository.countByTenantId(userId);
            pending   = viewingRequestRepository.countByTenantIdAndStatus(userId, ViewingRequest.ViewingStatus.PENDING);
            confirmed = viewingRequestRepository.countByTenantIdAndStatus(userId, ViewingRequest.ViewingStatus.CONFIRMED);
            declined  = viewingRequestRepository.countByTenantIdAndStatus(userId, ViewingRequest.ViewingStatus.DECLINED);
            completed = viewingRequestRepository.countByTenantIdAndStatus(userId, ViewingRequest.ViewingStatus.COMPLETED);
            cancelled = viewingRequestRepository.countByTenantIdAndStatus(userId, ViewingRequest.ViewingStatus.CANCELLED);
        }

        // Compute average response time from transitions (PENDING → CONFIRMED/DECLINED)
        Double avgResponseHours = null;
        List<ViewingRequestTransition> responseTransitions = transitionRepository.findAll().stream()
                .filter(t -> "PENDING".equals(t.getFromStatus())
                        && ("CONFIRMED".equals(t.getToStatus()) || "DECLINED".equals(t.getToStatus())))
                .collect(Collectors.toList());

        if (!responseTransitions.isEmpty()) {
            double totalHours = 0;
            int count = 0;
            for (ViewingRequestTransition t : responseTransitions) {
                ViewingRequest vr = t.getViewingRequest();
                boolean isRelevant = (user.getRole() == User.UserRole.LANDLORD)
                        ? vr.getApartment().getOwner().getId().equals(userId)
                        : vr.getTenant().getId().equals(userId);
                if (isRelevant && vr.getCreatedAt() != null && t.getChangedAt() != null) {
                    long seconds = java.time.Duration.between(
                            vr.getCreatedAt(), t.getChangedAt().atZone(java.time.ZoneId.systemDefault()).toInstant()
                    ).getSeconds();
                    totalHours += seconds / 3600.0;
                    count++;
                }
            }
            if (count > 0) {
                avgResponseHours = Math.round(totalHours / count * 10.0) / 10.0;
            }
        }

        log.info("Viewing request stats for userId={}: total={}", userId, total);

        return ViewingRequestStatsDto.builder()
                .totalRequests(total)
                .pendingCount(pending)
                .confirmedCount(confirmed)
                .declinedCount(declined)
                .completedCount(completed)
                .cancelledCount(cancelled)
                .averageResponseTimeHours(avgResponseHours)
                .build();
    }
}
