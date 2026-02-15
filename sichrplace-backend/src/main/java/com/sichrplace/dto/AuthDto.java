package com.sichrplace.dto;

import jakarta.validation.constraints.*;
import lombok.*;

public class AuthDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LoginRequest {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String password;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RegisterRequest {
        @NotBlank @Size(min = 3, max = 100)
        private String username;
        @NotBlank @Email
        private String email;
        @NotBlank @Size(min = 8)
        private String password;
        @Size(max = 20)
        private String role; // user or admin
        private String firstName;
        private String lastName;
        private String phone;
        private Boolean gdprConsent;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AuthResponse {
        private boolean success;
        private String token;
        private UserInfo user;
        private String message;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UserInfo {
        private String id;
        private String email;
        private String username;
        private String role;
        private String firstName;
        private String lastName;
    }
}
