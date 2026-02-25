package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.CreateSupportTicketRequest;
import com.sichrplace.backend.dto.SupportTicketDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface SupportTicketService {

    SupportTicketDto createTicket(Long userId, CreateSupportTicketRequest request);

    List<SupportTicketDto> getMyTickets(Long userId);

    /** Admin: list all tickets, optionally filtered by status. */
    Page<SupportTicketDto> getAllTickets(String status, Pageable pageable);

    /** Admin: respond to a ticket and set status. */
    SupportTicketDto respondToTicket(Long ticketId, Long adminId, String response, String newStatus);
}
