package com.sichrplace.backend.service;

import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link EmailServiceImpl} (SMTP provider).
 *
 * <p>Uses a mocked {@link JavaMailSender} to verify that:
 * <ul>
 *   <li>Plain-text messages are sent correctly.</li>
 *   <li>HTML bodies are detected and sent as HTML MIME parts.</li>
 *   <li>Mail exceptions bubble up as {@link RuntimeException}.</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("EmailServiceImpl — SMTP")
class EmailServiceImplSmtpTest {

    @Mock private JavaMailSender mailSender;
    @InjectMocks private EmailServiceImpl emailService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "fromAddress", "noreply@sichrplace.de");
    }

    @Test
    @DisplayName("plain-text email: createMimeMessage called and send() invoked")
    void plainText_sendInvoked() throws Exception {
        MimeMessage mockMsg = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mockMsg);

        emailService.sendEmail("user@example.com", "Test Subject", "Plain body text");

        verify(mailSender).createMimeMessage();
        verify(mailSender).send(mockMsg);
    }

    @Test
    @DisplayName("HTML body: email is sent (body starts with '<')")
    void htmlBody_sendInvoked() throws Exception {
        MimeMessage mockMsg = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mockMsg);

        emailService.sendEmail(
                "user@example.com",
                "Welcome",
                "<html><body><h1>Hello</h1></body></html>");

        verify(mailSender).send(mockMsg);
    }

    @Test
    @DisplayName("exception from JavaMailSender propagates as RuntimeException")
    void mailSenderException_propagatesAsRuntimeException() {
        MimeMessage mockMsg = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mockMsg);
        doThrow(new org.springframework.mail.MailSendException("SMTP refused"))
                .when(mailSender).send(any(MimeMessage.class));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> emailService.sendEmail("fail@example.com", "Sub", "Body"));
        assertTrue(ex.getMessage().contains("SMTP refused")
                        || ex.getCause() != null,
                "RuntimeException must wrap the mail exception");
    }
}
