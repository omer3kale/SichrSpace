package com.sichrplace.backend.service;

import com.sichrplace.backend.model.Conversation;
import com.sichrplace.backend.model.Message;
import com.sichrplace.backend.model.Notification;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ConversationRepository;
import com.sichrplace.backend.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * FTL-20 — 7-day reply guardrail.
 * <p>
 * Runs daily at 09:00 UTC. For every conversation whose last message is older
 * than 7 days, it identifies the non-responding participant and sends them a
 * {@link Notification.NotificationType#REPLY_REMINDER} notification.
 * <p>
 * Guard: skips conversations that have no messages, or where both participants
 * are the same user (edge case).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationReminderService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final NotificationService notificationService;

    static final int STALE_DAYS = 7;

    /**
     * Daily at 09:00 UTC — check for conversations that haven't received a reply
     * within {@value #STALE_DAYS} days and send a reminder notification.
     */
    @Scheduled(cron = "0 0 9 * * *")
    public void sendReplyReminders() {
        Instant cutoff = Instant.now().minus(STALE_DAYS, ChronoUnit.DAYS);
        List<Conversation> staleConversations = conversationRepository.findStaleConversations(cutoff);

        log.info("Reply-reminder check: {} conversations older than {} days", staleConversations.size(), STALE_DAYS);

        int sent = 0;
        for (Conversation conversation : staleConversations) {
            try {
                sent += processConversation(conversation);
            } catch (Exception e) {
                log.error("Error processing reminder for conversation {}: {}", conversation.getId(), e.getMessage());
            }
        }

        log.info("Reply-reminder job complete — {} reminders sent", sent);
    }

    /**
     * For a single stale conversation, find the last message sender and
     * notify the other participant to reply. Returns 1 if a reminder was sent, 0 otherwise.
     */
    int processConversation(Conversation conversation) {
        // Get the latest message in this conversation
        var latestPage = messageRepository.findLatestByConversationId(
                conversation.getId(), PageRequest.of(0, 1));

        if (latestPage.isEmpty()) {
            log.debug("Conversation {} has no messages — skipping", conversation.getId());
            return 0;
        }

        Message lastMessage = latestPage.getContent().get(0);
        Long lastSenderId = lastMessage.getSender().getId();

        // The participant who hasn't replied is the other one
        User recipient = conversation.otherParticipant(lastSenderId);
        if (recipient == null) {
            log.debug("Conversation {} — could not determine recipient; skipping", conversation.getId());
            return 0;
        }

        // Don't remind someone about their own message
        if (recipient.getId().equals(lastSenderId)) {
            return 0;
        }

        String senderName = lastMessage.getSender().getFirstName();
        notificationService.createNotification(
                recipient.getId(),
                Notification.NotificationType.REPLY_REMINDER,
                "Pending Reply",
                senderName + " is waiting for your reply (sent " + STALE_DAYS + "+ days ago)",
                Notification.NotificationPriority.NORMAL,
                "/conversations/" + conversation.getId()
        );

        log.debug("Sent reply reminder to user {} for conversation {}", recipient.getId(), conversation.getId());
        return 1;
    }
}
