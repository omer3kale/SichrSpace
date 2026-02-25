package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.FeatureFlagsDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * FTL-23 — Centralised feature-flag service.
 * Reads config properties and exposes them as a simple map.
 * Frontend can call {@code GET /api/feature-flags} to discover which modules are active.
 */
@Slf4j
@Service
public class FeatureFlagService {

    @Value("${features.smart-matching.enabled:true}")
    private boolean smartMatchingEnabled;

    @Value("${features.secure-payments.enabled:true}")
    private boolean securePaymentsEnabled;

    @Value("${features.google-maps.enabled:false}")
    private boolean googleMapsEnabled;

    @Value("${features.chat.enabled:true}")
    private boolean chatEnabled;

    @Value("${features.viewing-requests.enabled:true}")
    private boolean viewingRequestsEnabled;

    @Value("${features.booking-requests.enabled:true}")
    private boolean bookingRequestsEnabled;

    @Value("${features.gdpr.enabled:true}")
    private boolean gdprEnabled;

    @Value("${features.email-automation.enabled:false}")
    private boolean emailAutomationEnabled;

    /**
     * Returns all feature flags as a key→boolean map.
     */
    public FeatureFlagsDto getFlags() {
        Map<String, Boolean> flags = new LinkedHashMap<>();
        flags.put("smartMatching", smartMatchingEnabled);
        flags.put("securePayments", securePaymentsEnabled);
        flags.put("googleMaps", googleMapsEnabled);
        flags.put("chat", chatEnabled);
        flags.put("viewingRequests", viewingRequestsEnabled);
        flags.put("bookingRequests", bookingRequestsEnabled);
        flags.put("gdpr", gdprEnabled);
        flags.put("emailAutomation", emailAutomationEnabled);
        return FeatureFlagsDto.builder().flags(flags).build();
    }

    /** Check a single flag by key. */
    public boolean isEnabled(String featureKey) {
        return Boolean.TRUE.equals(getFlags().getFlags().get(featureKey));
    }
}
