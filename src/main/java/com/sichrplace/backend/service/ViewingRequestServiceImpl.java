package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.PaymentSessionDto;
import com.sichrplace.backend.dto.ViewingRequestDto;
import com.sichrplace.backend.dto.ViewingRequestStatsDto;
import com.sichrplace.backend.dto.ViewingRequestTransitionDto;
import com.sichrplace.backend.dto.CreateViewingRequestRequest;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.PaymentTransaction;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.ViewingRequest;
import com.sichrplace.backend.model.ViewingRequestTransition;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.repository.ViewingRequestRepository;
import com.sichrplace.backend.repository.ViewingRequestTransitionRepository;
import com.sichrplace.backend.dto.PaymentProviderSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
    private final EmailService emailService;
    private final PaymentTransactionService paymentTransactionService;
    private final PaymentProviderRouter paymentProviderRouter;
    private final NotificationService notificationService;

    /**
     * Optional: injected when the WebSocket context is active.
     * Null in pure unit tests (Mockito context) — null-checked before use.
     */
    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

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

        // FTL-16: Prevent duplicate active viewing requests for the same tenant + apartment
        boolean hasActiveRequest = viewingRequestRepository.existsByTenantIdAndApartmentIdAndStatusIn(
                tenantId, request.getApartmentId(),
                java.util.List.of(ViewingRequest.ViewingStatus.PENDING, ViewingRequest.ViewingStatus.CONFIRMED));
        if (hasActiveRequest) {
            throw new IllegalStateException(
                    "You already have an active viewing request for this apartment");
        }

        ViewingRequest viewingRequest = ViewingRequest.builder()
                .apartment(apartment)
                .tenant(tenant)
                .proposedDateTime(request.getProposedDateTime())
                .message(request.getMessage())
                .questions(request.getQuestions())
                .attentionPoints(request.getAttentionPoints())
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

        // FTL-24: Email landlord about new viewing request
        String tenantName = tenant.getFirstName() + " " + tenant.getLastName();
        sendStatusEmail(
                apartment.getOwner().getEmail(),
                "New viewing request received",
                apartment.getTitle(),
                viewingRequest.getProposedDateTime(),
                "Tenant " + tenantName + " has requested a viewing. Please review and respond.");

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
    @Transactional(readOnly = true)
    public List<ViewingRequestDto> getViewingRequestsReceivedByLandlord(Long landlordId) {
        return viewingRequestRepository.findByLandlordId(landlordId)
                .stream()
                .map(ViewingRequestDto::fromEntity)
                .collect(Collectors.toList());
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

        ViewingRequestDto dto = ViewingRequestDto.fromEntity(viewingRequest);

        // Email tenant about confirmation
        sendStatusEmail(
                viewingRequest.getTenant().getEmail(),
                "Viewing request confirmed",
                viewingRequest.getApartment().getTitle(),
                viewingRequest.getConfirmedDateTime(),
                "Your viewing has been confirmed.");

        // Push status update to the tenant (WebSocket realtime)
        if (messagingTemplate != null) {
            Long tenantId = viewingRequest.getTenant().getId();
            messagingTemplate.convertAndSendToUser(
                    tenantId.toString(), "/queue/viewing-requests", dto);
            log.debug("WS push viewing-request CONFIRMED id={} tenantId={}", id, tenantId);
        }

        return dto;
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

        ViewingRequestDto dto = ViewingRequestDto.fromEntity(viewingRequest);

        // Email tenant about decline
        String declineNote = (reason != null && !reason.isBlank())
                ? "Reason: " + reason
                : "No reason provided.";
        sendStatusEmail(
                viewingRequest.getTenant().getEmail(),
                "Viewing request declined",
                viewingRequest.getApartment().getTitle(),
                viewingRequest.getProposedDateTime(),
                "Your viewing request was declined. " + declineNote);

        // Push status update to the tenant (WebSocket realtime)
        if (messagingTemplate != null) {
            Long tenantId = viewingRequest.getTenant().getId();
            messagingTemplate.convertAndSendToUser(
                    tenantId.toString(), "/queue/viewing-requests", dto);
            log.debug("WS push viewing-request DECLINED id={} tenantId={}", id, tenantId);
        }

        return dto;
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

        // Email landlord about cancellation
        String tenantName = tenant.getFirstName() + " " + tenant.getLastName();
        sendStatusEmail(
                viewingRequest.getApartment().getOwner().getEmail(),
                "Viewing request cancelled",
                viewingRequest.getApartment().getTitle(),
                viewingRequest.getProposedDateTime(),
                "Tenant " + tenantName + " cancelled the viewing.");
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

        // Email the other party about completion
        User otherParty = isTenant
                ? viewingRequest.getApartment().getOwner()
                : viewingRequest.getTenant();
        sendStatusEmail(
                otherParty.getEmail(),
                "Viewing request completed",
                viewingRequest.getApartment().getTitle(),
                viewingRequest.getConfirmedDateTime(),
                "The viewing has been marked as completed.");

        // Send "please rate your experience" email to the tenant
        User tenant = viewingRequest.getTenant();
        sendStatusEmail(
                tenant.getEmail(),
                "Rate your viewing experience",
                viewingRequest.getApartment().getTitle(),
                viewingRequest.getConfirmedDateTime(),
                "Your viewing is complete! Please take a moment to rate your experience "
                + "and leave a review for this apartment.");

        // Notify tenant to leave a review
        notificationService.createNotification(
                tenant.getId(),
                com.sichrplace.backend.model.Notification.NotificationType.VIEWING_COMPLETED_REVIEW_PROMPT,
                "Rate Your Viewing",
                "Your viewing of \"" + viewingRequest.getApartment().getTitle()
                        + "\" is complete. Please leave a review!",
                com.sichrplace.backend.model.Notification.NotificationPriority.NORMAL,
                "/apartments/" + viewingRequest.getApartment().getId() + "/reviews/new"
        );

        return ViewingRequestDto.fromEntity(viewingRequest);
    }

    // ─── Email helper ───────────────────────────────────────────────

    /**
     * Sends a status-change notification email.
     * Catches and logs exceptions so that a mail failure never breaks the main workflow.
     */
    private void sendStatusEmail(String to, String subject, String apartmentTitle,
                                  LocalDateTime dateTime, String detail) {
        try {
            String formattedDate = (dateTime != null)
                    ? dateTime.format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"))
                    : "N/A";
            String body = String.format(
                    "Apartment: %s%nScheduled: %s%n%n%s",
                    apartmentTitle, formattedDate, detail);
            emailService.sendEmail(to, subject, body);
            log.info("Status email sent — to={} subject={}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send status email to={} subject={} error={}", to, subject, e.getMessage(), e);
        }
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

    @Override
    public ViewingRequestDto markViewingAsPaymentRequired(Long viewingId, BigDecimal amount,
                                                          String currency, String provider) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(viewingId)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        PaymentTransaction transaction = paymentTransactionService.createTransaction(
                provider, amount, currency, String.valueOf(viewingId));

        viewingRequest.setPaymentRequired(true);
        viewingRequest.setPaymentTransaction(transaction);
        viewingRequest = viewingRequestRepository.save(viewingRequest);

        log.info("Viewing request {} marked as payment-required, transaction={}", viewingId, transaction.getId());
        return ViewingRequestDto.fromEntity(viewingRequest);
    }

    @Override
    public ViewingRequestDto clearPaymentRequirement(Long viewingId) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(viewingId)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        viewingRequest.setPaymentRequired(false);
        viewingRequest.setPaymentTransaction(null);
        viewingRequest = viewingRequestRepository.save(viewingRequest);

        log.info("Payment requirement cleared for viewing request {}", viewingId);
        return ViewingRequestDto.fromEntity(viewingRequest);
    }

    @Override
    public PaymentSessionDto createPaymentSession(Long viewingRequestId, Long userId, String provider) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(viewingRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        // Only the tenant of this viewing request can start a payment session
        if (!viewingRequest.getTenant().getId().equals(userId)) {
            throw new SecurityException("Not authorized to create a payment session for this viewing request");
        }

        if (!viewingRequest.isPaymentRequired()) {
            throw new IllegalStateException("Payment is not required for this viewing request");
        }

        PaymentTransaction transaction = viewingRequest.getPaymentTransaction();
        if (transaction == null) {
            transaction = paymentTransactionService.createTransaction(
                    provider, BigDecimal.valueOf(50), "EUR", String.valueOf(viewingRequestId));
            viewingRequest.setPaymentTransaction(transaction);
            viewingRequestRepository.save(viewingRequest);
        }

        // Call external provider to create checkout session
        PaymentProviderClient providerClient = paymentProviderRouter.resolve(transaction.getProvider());
        PaymentProviderSession providerSession = providerClient.createCheckoutSession(transaction, viewingRequest);

        // Update transaction with provider details and mark PENDING
        transaction = paymentTransactionService.updateProviderDetails(
                transaction.getId(), providerSession.getProviderTransactionId());

        log.info("Payment session created for viewing request {} transaction={} provider={}",
                viewingRequestId, transaction.getId(), providerSession.getProviderTransactionId());
        return PaymentSessionDto.from(transaction, providerSession.getRedirectUrl());
    }

    @Override
    @Transactional(readOnly = true)
    public String getPaymentStatus(Long viewingRequestId, Long userId) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(viewingRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        boolean isTenant = viewingRequest.getTenant().getId().equals(userId);
        boolean isOwner = viewingRequest.getApartment().getOwner().getId().equals(userId);
        if (!isTenant && !isOwner) {
            throw new SecurityException("Not authorized to view payment status for this viewing request");
        }

        PaymentTransaction transaction = viewingRequest.getPaymentTransaction();
        if (transaction == null) {
            return null;
        }
        return transaction.getStatus().name();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ViewingRequestDto> getAllViewingRequestsAdmin(String status, Pageable pageable) {
        if (status != null && !status.isBlank()) {
            ViewingRequest.ViewingStatus vs = ViewingRequest.ViewingStatus.valueOf(status.toUpperCase(java.util.Locale.ROOT));
            return viewingRequestRepository.findByStatus(vs, pageable)
                    .map(ViewingRequestDto::fromEntity);
        }
        return viewingRequestRepository.findAll(pageable)
                .map(ViewingRequestDto::fromEntity);
    }
}
