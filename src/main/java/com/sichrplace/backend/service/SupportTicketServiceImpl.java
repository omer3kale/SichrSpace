package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.CreateSupportTicketRequest;
import com.sichrplace.backend.dto.SupportTicketDto;
import com.sichrplace.backend.model.Notification;
import com.sichrplace.backend.model.SupportTicket;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.SupportTicketRepository;
import com.sichrplace.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SupportTicketServiceImpl implements SupportTicketService {

    private final SupportTicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Override
    public SupportTicketDto createTicket(Long userId, CreateSupportTicketRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        SupportTicket.TicketCategory category = SupportTicket.TicketCategory.GENERAL;
        if (request.getCategory() != null && !request.getCategory().isBlank()) {
            try {
                category = SupportTicket.TicketCategory.valueOf(
                        request.getCategory().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                log.warn("Unknown ticket category '{}', defaulting to GENERAL", request.getCategory());
            }
        }

        SupportTicket ticket = SupportTicket.builder()
                .user(user)
                .subject(request.getSubject())
                .message(request.getMessage())
                .category(category)
                .build();

        ticket = ticketRepository.save(ticket);
        log.info("Support ticket created id={} userId={} category={}", ticket.getId(), userId, category);

        // Notify the user that their ticket was received
        notificationService.createNotification(
                userId,
                Notification.NotificationType.SUPPORT_TICKET_CREATED,
                "Support Ticket Received",
                "Your support ticket \"" + ticket.getSubject() + "\" has been received. We'll respond shortly.",
                Notification.NotificationPriority.NORMAL,
                "/support/tickets/" + ticket.getId()
        );

        return SupportTicketDto.fromEntity(ticket);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SupportTicketDto> getMyTickets(Long userId) {
        return ticketRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(SupportTicketDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SupportTicketDto> getAllTickets(String status, Pageable pageable) {
        if (status != null && !status.isBlank()) {
            SupportTicket.TicketStatus ts = SupportTicket.TicketStatus.valueOf(
                    status.toUpperCase(Locale.ROOT));
            return ticketRepository.findByStatus(ts, pageable)
                    .map(SupportTicketDto::fromEntity);
        }
        return ticketRepository.findAll(pageable)
                .map(SupportTicketDto::fromEntity);
    }

    @Override
    public SupportTicketDto respondToTicket(Long ticketId, Long adminId, String response, String newStatus) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        ticket.setAdminResponse(response);
        ticket.setResolvedBy(adminId);

        if (newStatus != null && !newStatus.isBlank()) {
            ticket.setStatus(SupportTicket.TicketStatus.valueOf(
                    newStatus.toUpperCase(Locale.ROOT)));
        } else {
            ticket.setStatus(SupportTicket.TicketStatus.RESOLVED);
        }

        ticket = ticketRepository.save(ticket);
        log.info("Support ticket {} responded by admin={}", ticketId, adminId);

        // Notify the ticket owner
        notificationService.createNotification(
                ticket.getUser().getId(),
                Notification.NotificationType.SUPPORT_TICKET_UPDATED,
                "Support Ticket Updated",
                "Your ticket \"" + ticket.getSubject() + "\" has been updated.",
                Notification.NotificationPriority.NORMAL,
                "/support/tickets/" + ticket.getId()
        );

        // Email the ticket owner
        try {
            emailService.sendEmail(
                    ticket.getUser().getEmail(),
                    "Support ticket update: " + ticket.getSubject(),
                    "Your support ticket has been updated.\n\nResponse: " + response);
        } catch (Exception e) {
            log.error("Failed to send ticket update email ticketId={}", ticketId, e);
        }

        return SupportTicketDto.fromEntity(ticket);
    }
}
