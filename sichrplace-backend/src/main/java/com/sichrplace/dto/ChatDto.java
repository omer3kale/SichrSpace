package com.sichrplace.dto;

import lombok.*;

public class ChatDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChatMessage {
        private String conversationId;
        private String senderId;
        private String content;
        private String type; // TEXT, TYPING, READ
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChatNotification {
        private String id;
        private String conversationId;
        private String senderId;
        private String senderName;
        private String content;
        private String timestamp;
    }
}
