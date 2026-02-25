package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.FeatureFlagsDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("FeatureFlagService — FTL-23")
class FeatureFlagServiceTest {

    private FeatureFlagService featureFlagService;

    @BeforeEach
    void setUp() {
        featureFlagService = new FeatureFlagService();
        ReflectionTestUtils.setField(featureFlagService, "smartMatchingEnabled", true);
        ReflectionTestUtils.setField(featureFlagService, "securePaymentsEnabled", true);
        ReflectionTestUtils.setField(featureFlagService, "googleMapsEnabled", false);
        ReflectionTestUtils.setField(featureFlagService, "chatEnabled", true);
        ReflectionTestUtils.setField(featureFlagService, "viewingRequestsEnabled", true);
        ReflectionTestUtils.setField(featureFlagService, "bookingRequestsEnabled", true);
        ReflectionTestUtils.setField(featureFlagService, "gdprEnabled", true);
        ReflectionTestUtils.setField(featureFlagService, "emailAutomationEnabled", false);
    }

    @Test
    @DisplayName("getFlags returns all 8 feature flags")
    void getFlagsReturnsAll() {
        FeatureFlagsDto dto = featureFlagService.getFlags();

        assertNotNull(dto);
        Map<String, Boolean> flags = dto.getFlags();
        assertEquals(8, flags.size());
        assertTrue(flags.containsKey("smartMatching"));
        assertTrue(flags.containsKey("securePayments"));
        assertTrue(flags.containsKey("googleMaps"));
        assertTrue(flags.containsKey("chat"));
        assertTrue(flags.containsKey("viewingRequests"));
        assertTrue(flags.containsKey("bookingRequests"));
        assertTrue(flags.containsKey("gdpr"));
        assertTrue(flags.containsKey("emailAutomation"));
    }

    @Test
    @DisplayName("enabled flags are true, disabled are false")
    void enabledFlagsValues() {
        FeatureFlagsDto dto = featureFlagService.getFlags();
        Map<String, Boolean> flags = dto.getFlags();

        assertTrue(flags.get("smartMatching"));
        assertTrue(flags.get("securePayments"));
        assertFalse(flags.get("googleMaps"));
        assertTrue(flags.get("chat"));
        assertTrue(flags.get("viewingRequests"));
        assertTrue(flags.get("bookingRequests"));
        assertTrue(flags.get("gdpr"));
        assertFalse(flags.get("emailAutomation"));
    }

    @Test
    @DisplayName("isEnabled returns correct boolean for known key")
    void isEnabledCheck() {
        assertTrue(featureFlagService.isEnabled("smartMatching"));
        assertFalse(featureFlagService.isEnabled("googleMaps"));
    }

    @Test
    @DisplayName("isEnabled returns false for unknown key")
    void isEnabledUnknownKey() {
        assertFalse(featureFlagService.isEnabled("nonExistentFeature"));
    }
}
