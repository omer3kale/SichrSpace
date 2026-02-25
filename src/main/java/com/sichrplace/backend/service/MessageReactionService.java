package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.MessageReactionDto;

import java.util.List;

public interface MessageReactionService {

    MessageReactionDto addReaction(Long userId, Long messageId, String emojiCode);

    void removeReaction(Long userId, Long messageId, String emojiCode);

    List<MessageReactionDto> getReactions(Long userId, Long messageId);
}
