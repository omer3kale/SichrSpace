package com.sichrplace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Holds the provider-side session details returned after creating a checkout session
 * with an external payment provider (Stripe, PayPal, etc.).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentProviderSession {

    /** Provider's unique session / transaction identifier (e.g. Stripe checkout session id). */
    private String providerTransactionId;

    /** URL the end-user should be redirected to in order to complete payment. */
    private String redirectUrl;
}
