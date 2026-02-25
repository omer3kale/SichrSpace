package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String bio;
    private String phone;
    private String role;
    private Boolean emailVerified;
    private String profileImageUrl;
    private String city;
    private String country;
    private Boolean isActive;
    private String preferredLocale;
    private Instant lastLoginAt;
    private Instant createdAt;
    private Instant updatedAt;

    public static UserDto fromEntity(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .bio(user.getBio())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .emailVerified(user.getEmailVerified())
                .profileImageUrl(user.getProfileImageUrl())
                .city(user.getCity())
                .country(user.getCountry())
                .isActive(user.getIsActive())
                .preferredLocale(user.getPreferredLocale())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
