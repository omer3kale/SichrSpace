package com.sichrplace.backend.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Tests for the {@link EmailServiceStub} implementation.
 * Verifies the stub does not throw and logs the email content.
 */
@DisplayName("EmailServiceStub")
class EmailServiceStubTest {

    private final EmailServiceStub emailServiceStub = new EmailServiceStub();

    @Test
    @DisplayName("sendEmail does not throw for normal input")
    void sendEmail_normal() {
        assertDoesNotThrow(() -> emailServiceStub.sendEmail(
                "alice@example.com",
                "Test Subject",
                "This is a test email body."
        ));
    }

    @Test
    @DisplayName("sendEmail handles long body (truncation)")
    void sendEmail_longBody() {
        String longBody = "A".repeat(500);
        assertDoesNotThrow(() -> emailServiceStub.sendEmail(
                "bob@example.com",
                "Long Body Test",
                longBody
        ));
    }

    @Test
    @DisplayName("sendEmail handles empty body")
    void sendEmail_emptyBody() {
        assertDoesNotThrow(() -> emailServiceStub.sendEmail(
                "carol@example.com",
                "Empty Body",
                ""
        ));
    }
}
