package com.sichrplace.backend.service;

import com.sichrplace.backend.model.PaymentTransaction;
import com.sichrplace.backend.model.ViewingRequest;
import com.sichrplace.backend.model.ViewingRequestTransition;
import com.sichrplace.backend.repository.ViewingRequestRepository;
import com.sichrplace.backend.repository.ViewingRequestTransitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Reacts to payment status changes by applying automatic
 * booking-status transitions on linked {@link ViewingRequest}s.
 *
 * <h3>Rules</h3>
 * <ul>
 *   <li>Payment COMPLETED + viewing PENDING → auto-confirm (CONFIRMED)</li>
 *   <li>Payment REFUNDED + viewing CONFIRMED → auto-cancel (CANCELLED)</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentDomainListener {

    private final ViewingRequestRepository viewingRequestRepository;
    private final ViewingRequestTransitionRepository transitionRepository;

    /**
     * Called after a payment transaction transitions to COMPLETED.
     * If the linked viewing request is still PENDING, auto-confirms it.
     */
    @Transactional
    public void onPaymentCompleted(PaymentTransaction transaction) {
        viewingRequestRepository.findByPaymentTransactionId(transaction.getId())
                .ifPresentOrElse(
                        vr -> {
                            if (vr.getStatus() == ViewingRequest.ViewingStatus.PENDING) {
                                String fromStatus = vr.getStatus().name();
                                vr.setStatus(ViewingRequest.ViewingStatus.CONFIRMED);
                                vr.setConfirmedDateTime(vr.getProposedDateTime());
                                vr.setRespondedAt(LocalDateTime.now());
                                viewingRequestRepository.save(vr);

                                transitionRepository.save(ViewingRequestTransition.builder()
                                        .viewingRequest(vr)
                                        .fromStatus(fromStatus)
                                        .toStatus(ViewingRequest.ViewingStatus.CONFIRMED.name())
                                        .changedBy(vr.getTenant())
                                        .changedAt(LocalDateTime.now())
                                        .reason("Auto-confirmed: payment completed")
                                        .build());

                                log.info("Viewing request {} auto-confirmed after payment {} completed",
                                        vr.getId(), transaction.getId());
                            } else {
                                log.info("Viewing request {} not auto-confirmed: current status {} (expected PENDING)",
                                        vr.getId(), vr.getStatus());
                            }
                        },
                        () -> log.debug("No viewing request linked to payment transaction {}",
                                transaction.getId())
                );
    }

    /**
     * Called after a payment transaction transitions to REFUNDED.
     * If the linked viewing request is CONFIRMED, auto-cancels it.
     */
    @Transactional
    public void onPaymentRefunded(PaymentTransaction transaction) {
        viewingRequestRepository.findByPaymentTransactionId(transaction.getId())
                .ifPresentOrElse(
                        vr -> {
                            if (vr.getStatus() == ViewingRequest.ViewingStatus.CONFIRMED) {
                                String fromStatus = vr.getStatus().name();
                                vr.setStatus(ViewingRequest.ViewingStatus.CANCELLED);
                                viewingRequestRepository.save(vr);

                                transitionRepository.save(ViewingRequestTransition.builder()
                                        .viewingRequest(vr)
                                        .fromStatus(fromStatus)
                                        .toStatus(ViewingRequest.ViewingStatus.CANCELLED.name())
                                        .changedBy(vr.getTenant())
                                        .changedAt(LocalDateTime.now())
                                        .reason("Auto-cancelled: payment refunded")
                                        .build());

                                log.info("Viewing request {} auto-cancelled after payment {} refunded",
                                        vr.getId(), transaction.getId());
                            } else {
                                log.info("Viewing request {} not auto-cancelled: current status {} (expected CONFIRMED)",
                                        vr.getId(), vr.getStatus());
                            }
                        },
                        () -> log.debug("No viewing request linked to payment transaction {}",
                                transaction.getId())
                );
    }
}
