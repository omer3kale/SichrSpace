package com.sichrplace.backend.service;

/**
 * Stub-friendly email service interface.
 * <p>
 * In development/testing, the {@link EmailServiceStub} implementation
 * simply logs messages to the console.  In production, replace with
 * an SMTP or third-party (SendGrid, Mailgun) implementation.
 */
public interface EmailService {

    /**
     * Send an email.
     *
     * @param to      recipient email address
     * @param subject email subject line
     * @param body    email body (plain text or HTML)
     */
    void sendEmail(String to, String subject, String body);
}
