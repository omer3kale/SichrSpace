package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ConversationReportDto;
import com.sichrplace.backend.model.Conversation;
import com.sichrplace.backend.model.ConversationReport;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ConversationReportRepository;
import com.sichrplace.backend.repository.ConversationRepository;
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

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ConversationReportServiceImpl")
class ConversationReportServiceTest {

    @Mock
    private ConversationReportRepository reportRepository;
    @Mock
    private ConversationRepository conversationRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ConversationReportServiceImpl reportService;

    private User user1;
    private User admin;
    private Conversation conversation;

    @BeforeEach
    void setUp() {
        user1 = User.builder().id(1L).firstName("John").lastName("Doe").build();
        admin = User.builder().id(99L).firstName("Admin").lastName("User").build();
        conversation = Conversation.builder().id(10L)
                .participant1(user1)
                .participant2(User.builder().id(2L).firstName("Jane").lastName("Smith").build())
                .build();
    }

    @Test
    void reportConversation_success() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(reportRepository.existsByConversationIdAndReporterId(10L, 1L)).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(reportRepository.save(any(ConversationReport.class))).thenAnswer(inv -> {
            ConversationReport r = inv.getArgument(0);
            r.setId(100L);
            return r;
        });

        ConversationReportDto dto = reportService.reportConversation(1L, 10L, "spam");

        assertEquals(100L, dto.getId());
        assertEquals(10L, dto.getConversationId());
        assertEquals(1L, dto.getReporterId());
        assertEquals("spam", dto.getReason());
        assertEquals("PENDING", dto.getStatus());
        verify(reportRepository).save(any(ConversationReport.class));
    }

    @Test
    void reportConversation_notParticipant_throwsSecurity() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));

        assertThrows(SecurityException.class,
                () -> reportService.reportConversation(999L, 10L, "spam"));
    }

    @Test
    void reportConversation_duplicate_throwsIllegalState() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(reportRepository.existsByConversationIdAndReporterId(10L, 1L)).thenReturn(true);

        assertThrows(IllegalStateException.class,
                () -> reportService.reportConversation(1L, 10L, "spam"));
    }

    @Test
    void reportConversation_conversationNotFound_throwsIllegalArgument() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> reportService.reportConversation(1L, 10L, "spam"));
    }

    @Test
    void getReports_allStatuses_returnsPage() {
        ConversationReport report = ConversationReport.builder()
                .id(1L).conversation(conversation).reporter(user1)
                .reason("spam").status(ConversationReport.ReportStatus.PENDING)
                .createdAt(Instant.now()).build();
        when(reportRepository.findAllByOrderByCreatedAtDesc(any()))
                .thenReturn(new PageImpl<>(List.of(report)));

        Page<ConversationReportDto> page = reportService.getReports(null, PageRequest.of(0, 20));

        assertEquals(1, page.getTotalElements());
        assertEquals("PENDING", page.getContent().get(0).getStatus());
    }

    @Test
    void getReports_filteredByStatus_returnsPage() {
        ConversationReport report = ConversationReport.builder()
                .id(1L).conversation(conversation).reporter(user1)
                .reason("spam").status(ConversationReport.ReportStatus.PENDING)
                .createdAt(Instant.now()).build();
        when(reportRepository.findByStatus(eq(ConversationReport.ReportStatus.PENDING), any()))
                .thenReturn(new PageImpl<>(List.of(report)));

        Page<ConversationReportDto> page = reportService.getReports("PENDING", PageRequest.of(0, 20));

        assertEquals(1, page.getTotalElements());
        verify(reportRepository).findByStatus(eq(ConversationReport.ReportStatus.PENDING), any());
    }

    @Test
    void updateReportStatus_success() {
        ConversationReport report = ConversationReport.builder()
                .id(1L).conversation(conversation).reporter(user1)
                .reason("spam").status(ConversationReport.ReportStatus.PENDING)
                .createdAt(Instant.now()).build();
        when(reportRepository.findById(1L)).thenReturn(Optional.of(report));
        when(userRepository.findById(99L)).thenReturn(Optional.of(admin));
        when(reportRepository.save(any(ConversationReport.class))).thenAnswer(inv -> inv.getArgument(0));

        ConversationReportDto dto = reportService.updateReportStatus(99L, 1L, "REVIEWED");

        assertEquals("REVIEWED", dto.getStatus());
        assertNotNull(dto.getResolvedAt());
        assertEquals(99L, dto.getResolvedById());
    }

    @Test
    void updateReportStatus_notFound_throwsIllegalArgument() {
        when(reportRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> reportService.updateReportStatus(99L, 1L, "REVIEWED"));
    }

    @Test
    @DisplayName("reportConversation — user not found → throws")
    void reportConversation_userNotFound() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(reportRepository.existsByConversationIdAndReporterId(10L, 1L)).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> reportService.reportConversation(1L, 10L, "spam"));
    }

    @Test
    @DisplayName("updateReportStatus — admin user not found → throws")
    void updateReportStatus_adminNotFound() {
        ConversationReport report = ConversationReport.builder()
                .id(1L).conversation(conversation).reporter(user1)
                .reason("spam").status(ConversationReport.ReportStatus.PENDING)
                .createdAt(Instant.now()).build();
        when(reportRepository.findById(1L)).thenReturn(Optional.of(report));
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> reportService.updateReportStatus(999L, 1L, "REVIEWED"));
    }
}
