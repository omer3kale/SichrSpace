package com.sichrplace.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Stub email service — logs the message instead of sending it.
 * <p>
 * Active when {@code app.email.provider=stub} (or not set — this is the default).
 * In production profiles (beta-mssql, prod-mssql), set {@code app.email.provider=smtp}
 * to activate {@link EmailServiceImpl} instead.
 *
 * <p><strong>Teaching note:</strong> This follows the
 * <a href="https://en.wikipedia.org/wiki/Strategy_pattern">Strategy pattern</a>.
 * The {@code EmailService} interface allows swapping implementations
 * without touching any calling code.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "app.email.provider", havingValue = "stub", matchIfMissing = true)
public class EmailServiceStub implements EmailService {

    @Override
    public void sendEmail(String to, String subject, String body) {
        log.info("╔══════════════════════════════════════════════════════╗");
        log.info("║  EMAIL (stub — not actually sent)                   ║");
        log.info("╠══════════════════════════════════════════════════════╣");
        log.info("║  To:      {}", to);
        log.info("║  Subject: {}", subject);
        log.info("║  Body:    {}", body.length() > 120 ? body.substring(0, 120) + "…" : body);
        log.info("╚══════════════════════════════════════════════════════╝");
    }
}

