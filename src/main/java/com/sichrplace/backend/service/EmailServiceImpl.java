package com.sichrplace.backend.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Production email service using Spring's {@link JavaMailSender}.
 *
 * <p>Activated when {@code app.email.provider=smtp} is set in the active Spring profile.
 * Configure the following properties in the profile-specific yml:
 * <pre>
 *   spring.mail.host        = ${SMTP_HOST}
 *   spring.mail.port        = ${SMTP_PORT:587}
 *   spring.mail.username    = ${SMTP_USER}
 *   spring.mail.password    = ${SMTP_PASS}
 *   spring.mail.properties.mail.smtp.auth      = true
 *   spring.mail.properties.mail.smtp.starttls.enable = true
 *   app.email.from          = ${EMAIL_FROM:noreply@sichrplace.de}
 *   app.email.provider      = smtp
 * </pre>
 *
 * <p>Compatible providers: Mailgun (SMTP relay), SendGrid, AWS SES, any SMTP server.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.email.provider", havingValue = "smtp")
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.email.from:noreply@sichrplace.de}")
    private String fromAddress;

    /**
     * Send a plain-text or HTML email.
     *
     * @param to      recipient address
     * @param subject subject line
     * @param body    email body — if it starts with {@code <} it is treated as HTML
     */
    @Override
    public void sendEmail(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            // Detect HTML vs plain text
            boolean isHtml = body != null && body.stripLeading().startsWith("<");
            helper.setText(body, isHtml);
            mailSender.send(message);
            log.info("Email sent — to={} subject={}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to={} subject={} error={}", to, subject, e.getMessage(), e);
            throw new RuntimeException("Email delivery failed: " + e.getMessage(), e);
        }
    }
}
