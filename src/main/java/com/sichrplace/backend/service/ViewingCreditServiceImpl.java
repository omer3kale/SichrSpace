package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ViewingCreditDto;
import com.sichrplace.backend.dto.ViewingCreditSummaryDto;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.ViewingCreditPack;
import com.sichrplace.backend.model.ViewingRequest;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.repository.ViewingCreditPackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

/**
 * "€90 → next two tries free" credit-pack logic.
 *
 * <ul>
 *   <li>If no active pack exists for the user → create a new 3-credit pack
 *       (1 credit consumed immediately for the paid viewing).</li>
 *   <li>If an active pack exists → consume 1 credit (free viewing).</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ViewingCreditServiceImpl implements ViewingCreditService {

    private final ViewingCreditPackRepository creditPackRepository;
    private final UserRepository userRepository;

    @Override
    public ViewingCreditPack onViewingPaymentSucceeded(Long userId, ViewingRequest viewingRequest) {
        // Idempotency: if a pack was already created for this viewing request, return it
        var existing = creditPackRepository.findByPurchaseViewingRequestId(viewingRequest.getId());
        if (existing.isPresent()) {
            log.info("Credit pack already exists for viewingRequestId={}, skipping", viewingRequest.getId());
            return existing.get();
        }

        List<ViewingCreditPack> activePacks = creditPackRepository
                .findActivePacksByUserId(userId, Instant.now());

        if (!activePacks.isEmpty()) {
            // Use a credit from the most recent active pack
            ViewingCreditPack pack = activePacks.get(0);
            pack.useCredit();
            pack = creditPackRepository.save(pack);
            log.info("Used credit from pack={} for userId={}, remaining={}",
                    pack.getId(), userId, pack.getCreditsRemaining());
            return pack;
        }

        // No active pack — create a new one (paid viewing triggers pack creation)
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        ViewingCreditPack newPack = ViewingCreditPack.builder()
                .user(user)
                .totalCredits(ViewingCreditPack.CREDITS_PER_PACK)
                .usedCredits(1)  // the paid viewing consumes the first credit
                .purchaseViewingRequest(viewingRequest)
                .build();

        newPack = creditPackRepository.save(newPack);
        log.info("Created new credit pack={} for userId={}, remaining={}",
                newPack.getId(), userId, newPack.getCreditsRemaining());
        return newPack;
    }

    @Override
    @Transactional(readOnly = true)
    public ViewingCreditSummaryDto getCreditSummary(Long userId) {
        List<ViewingCreditPack> allPacks = creditPackRepository
                .findByUserIdOrderByCreatedAtDesc(userId);

        List<ViewingCreditPack> activePacks = creditPackRepository
                .findActivePacksByUserId(userId, Instant.now());

        ViewingCreditDto activePack = activePacks.isEmpty()
                ? null
                : ViewingCreditDto.fromEntity(activePacks.get(0));

        int totalRemaining = activePacks.stream()
                .mapToInt(ViewingCreditPack::getCreditsRemaining)
                .sum();

        long totalUsed = creditPackRepository.countTotalCreditsUsedByUserId(userId);

        List<ViewingCreditDto> history = allPacks.stream()
                .map(ViewingCreditDto::fromEntity)
                .collect(Collectors.toList());

        return ViewingCreditSummaryDto.builder()
                .activePack(activePack)
                .totalCreditsRemaining(totalRemaining)
                .totalCreditsUsed(totalUsed)
                .history(history)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasActiveCredit(Long userId) {
        List<ViewingCreditPack> activePacks = creditPackRepository
                .findActivePacksByUserId(userId, Instant.now());
        return !activePacks.isEmpty();
    }
}
