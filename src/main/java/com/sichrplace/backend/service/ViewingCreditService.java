package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ViewingCreditSummaryDto;
import com.sichrplace.backend.model.ViewingCreditPack;
import com.sichrplace.backend.model.ViewingRequest;

/**
 * Manages viewing-credit packs.
 *
 * Business rule  – "€90 → next two tries free":
 * <ol>
 *   <li>When a paid viewing payment succeeds and the user has no usable pack,
 *       create a new 3-credit pack and mark 1 credit as used (the paid viewing).</li>
 *   <li>If a usable pack exists, consume 1 credit from it (free viewing).</li>
 * </ol>
 */
public interface ViewingCreditService {

    /**
     * Called after a viewing payment succeeds.
     * Creates a new pack or uses a credit from an existing one.
     *
     * @return the pack that was created or updated
     */
    ViewingCreditPack onViewingPaymentSucceeded(Long userId, ViewingRequest viewingRequest);

    /**
     * Returns a summary of a user's viewing credits (active pack + history).
     */
    ViewingCreditSummaryDto getCreditSummary(Long userId);

    /**
     * Check whether the user currently has an active credit to use
     * (i.e. next viewing would be free).
     */
    boolean hasActiveCredit(Long userId);
}
