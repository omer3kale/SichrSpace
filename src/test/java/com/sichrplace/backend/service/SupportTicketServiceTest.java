package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.CreateSupportTicketRequest;
import com.sichrplace.backend.dto.SupportTicketDto;
import com.sichrplace.backend.model.Notification;
import com.sichrplace.backend.model.SupportTicket;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.SupportTicketRepository;
import com.sichrplace.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupportTicketServiceImpl")
class SupportTicketServiceTest {

    @Mock private SupportTicketRepository ticketRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private EmailService emailService;

    @InjectMocks private SupportTicketServiceImpl supportTicketService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).email("u@test.com")
                .firstName("U").lastName("T").build();
    }

    @Test
    @DisplayName("Create ticket succeeds and sends notification")
    void createTicket_success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(inv -> {
            SupportTicket t = inv.getArgument(0);
            t.setId(100L);
            return t;
        });

        CreateSupportTicketRequest request = CreateSupportTicketRequest.builder()
                .subject("Need help")
                .message("I have an issue")
                .category("PAYMENT")
                .build();

        SupportTicketDto result = supportTicketService.createTicket(1L, request);

        assertEquals(100L, result.getId());
        assertEquals("Need help", result.getSubject());
        assertEquals("PAYMENT", result.getCategory());
        assertEquals("OPEN", result.getStatus());

        verify(notificationService).createNotification(
                eq(1L),
                eq(Notification.NotificationType.SUPPORT_TICKET_CREATED),
                anyString(), anyString(), any(), anyString());
    }

    @Test
    @DisplayName("Create ticket with invalid category defaults to GENERAL")
    void createTicket_invalidCategory_defaultsToGeneral() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(inv -> {
            SupportTicket t = inv.getArgument(0);
            t.setId(101L);
            return t;
        });

        CreateSupportTicketRequest request = CreateSupportTicketRequest.builder()
                .subject("Help").message("Issue")
                .category("NONEXISTENT").build();

        SupportTicketDto result = supportTicketService.createTicket(1L, request);
        assertEquals("GENERAL", result.getCategory());
    }

    @Test
    @DisplayName("Create ticket with null category defaults to GENERAL")
    void createTicket_nullCategory_defaultsToGeneral() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(inv -> {
            SupportTicket t = inv.getArgument(0);
            t.setId(102L);
            return t;
        });

        CreateSupportTicketRequest request = CreateSupportTicketRequest.builder()
                .subject("Help").message("Issue").build();

        SupportTicketDto result = supportTicketService.createTicket(1L, request);
        assertEquals("GENERAL", result.getCategory());
    }

    @Test
    @DisplayName("User not found throws")
    void createTicket_userNotFound_throws() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        CreateSupportTicketRequest request = CreateSupportTicketRequest.builder()
                .subject("Help").message("Issue").build();

        assertThrows(IllegalArgumentException.class,
                () -> supportTicketService.createTicket(999L, request));
    }

    @Test
    @DisplayName("Get my tickets returns list")
    void getMyTickets_returnsList() {
        SupportTicket ticket = SupportTicket.builder()
                .id(100L).user(user).subject("Help").message("Issue")
                .category(SupportTicket.TicketCategory.GENERAL)
                .status(SupportTicket.TicketStatus.OPEN).build();

        when(ticketRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(ticket));

        List<SupportTicketDto> results = supportTicketService.getMyTickets(1L);
        assertEquals(1, results.size());
        assertEquals(100L, results.get(0).getId());
    }

    @Test
    @DisplayName("Get all tickets returns page")
    void getAllTickets_returnsPage() {
        SupportTicket ticket = SupportTicket.builder()
                .id(100L).user(user).subject("Help").message("Issue")
                .category(SupportTicket.TicketCategory.GENERAL)
                .status(SupportTicket.TicketStatus.OPEN).build();

        when(ticketRepository.findAll(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(ticket)));

        Page<SupportTicketDto> page = supportTicketService.getAllTickets(null, PageRequest.of(0, 10));
        assertEquals(1, page.getTotalElements());
    }

    @Test
    @DisplayName("Get all tickets with status filter")
    void getAllTickets_withStatusFilter() {
        SupportTicket ticket = SupportTicket.builder()
                .id(100L).user(user).subject("Help").message("Issue")
                .category(SupportTicket.TicketCategory.GENERAL)
                .status(SupportTicket.TicketStatus.OPEN).build();

        when(ticketRepository.findByStatus(eq(SupportTicket.TicketStatus.OPEN), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(ticket)));

        Page<SupportTicketDto> page = supportTicketService.getAllTickets("OPEN", PageRequest.of(0, 10));
        assertEquals(1, page.getTotalElements());
    }

    @Test
    @DisplayName("Respond to ticket updates status and sends notifications")
    void respondToTicket_success() {
        SupportTicket ticket = SupportTicket.builder()
                .id(100L).user(user).subject("Help").message("Issue")
                .category(SupportTicket.TicketCategory.GENERAL)
                .status(SupportTicket.TicketStatus.OPEN).build();

        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        SupportTicketDto result = supportTicketService.respondToTicket(100L, 99L, "Fixed!", "RESOLVED");

        assertEquals("RESOLVED", result.getStatus());
        assertEquals("Fixed!", result.getAdminResponse());
        assertEquals(99L, result.getResolvedBy());

        verify(notificationService).createNotification(
                eq(1L),
                eq(Notification.NotificationType.SUPPORT_TICKET_UPDATED),
                anyString(), anyString(), any(), anyString());
        verify(emailService).sendEmail(eq("u@test.com"), anyString(), contains("Fixed!"));
    }

    @Test
    @DisplayName("Respond to ticket defaults to RESOLVED when no status given")
    void respondToTicket_defaultsToResolved() {
        SupportTicket ticket = SupportTicket.builder()
                .id(100L).user(user).subject("Help").message("Issue")
                .category(SupportTicket.TicketCategory.GENERAL)
                .status(SupportTicket.TicketStatus.OPEN).build();

        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        SupportTicketDto result = supportTicketService.respondToTicket(100L, 99L, "Done", null);

        assertEquals("RESOLVED", result.getStatus());
    }

    @Test
    @DisplayName("Respond to nonexistent ticket throws")
    void respondToTicket_notFound_throws() {
        when(ticketRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> supportTicketService.respondToTicket(999L, 99L, "resp", null));
    }
}
