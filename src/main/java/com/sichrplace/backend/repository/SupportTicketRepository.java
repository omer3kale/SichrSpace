package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.SupportTicket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {

    List<SupportTicket> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<SupportTicket> findByStatus(SupportTicket.TicketStatus status, Pageable pageable);
}
