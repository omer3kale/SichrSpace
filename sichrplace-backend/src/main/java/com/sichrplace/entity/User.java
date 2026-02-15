package com.sichrplace.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank @Size(max = 100)
    @Column(unique = true, nullable = false, length = 100)
    private String username;

    @NotBlank @Email @Size(max = 255)
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank
    @Column(nullable = false)
    private String password;

    @Size(max = 20)
    @Column(length = 20)
    @Builder.Default
    private String role = "user";

    @Size(max = 100)
    @Column(name = "first_name", length = 100)
    private String firstName;

    @Size(max = 100)
    @Column(name = "last_name", length = 100)
    private String lastName;

    @Size(max = 20)
    @Column(length = 20)
    private String phone;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String bio;

    @Column(name = "profile_picture", columnDefinition = "NVARCHAR(MAX)")
    private String profilePicture;

    @Column(name = "notification_preferences", columnDefinition = "NVARCHAR(MAX)")
    @Builder.Default
    private String notificationPreferences = "{\"email\":true,\"sms\":false,\"push\":true,\"marketing\":false}";

    @Column(name = "email_verified")
    @Builder.Default
    private Boolean emailVerified = false;

    @Column(name = "email_verification_token")
    private String emailVerificationToken;

    @Size(max = 20)
    @Column(name = "account_status", length = 20)
    @Builder.Default
    private String accountStatus = "active";

    @Column(name = "failed_login_attempts")
    @Builder.Default
    private Integer failedLoginAttempts = 0;

    @Builder.Default
    private Boolean blocked = false;

    @Column(name = "gdpr_consent")
    @Builder.Default
    private Boolean gdprConsent = false;

    @Column(name = "last_login")
    private OffsetDateTime lastLogin;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
