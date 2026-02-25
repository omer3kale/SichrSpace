package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_user_email", columnList = "email", unique = true),
        @Index(name = "idx_user_role", columnList = "role"),
        @Index(name = "idx_user_created_at", columnList = "created_at")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(columnDefinition = "TEXT")
    private String bio;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Column(name = "email_verified")
    private Boolean emailVerified;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    private String city;

    private String country;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    /** Counts consecutive failed login attempts; reset to 0 on successful login. */
    @Column(name = "failed_login_count")
    private int failedLoginAttempts = 0;

    /** If non-null and in the future, login is rejected until this instant. */
    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "gdpr_consent")
    private Boolean gdprConsent;

    @Column(name = "gdpr_consent_date")
    private Instant gdprConsentDate;

    @Column(name = "marketing_consent")
    private Boolean marketingConsent;

    /** ISO 639-1 language code (e.g. "en", "de", "tr"). Cosmetic only; does not affect auth. */
    @Column(name = "preferred_locale", length = 10)
    private String preferredLocale;

    // ─── FTL-05  Personality / Habit fields (renter) ────────────────

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "hobbies", length = 500)
    private String hobbies;

    /** Free-text: e.g. "early-riser, works from home". */
    @Column(name = "daily_routine", length = 500)
    private String dailyRoutine;

    /** Comma-separated lifestyle tags (e.g. "vegan,fitness,music"). */
    @Column(name = "lifestyle_tags", length = 500)
    private String lifestyleTags;

    @Enumerated(EnumType.STRING)
    @Column(name = "smoking_status", length = 20)
    private SmokingStatus smokingStatus;

    @Column(name = "pet_owner")
    private Boolean petOwner;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 20)
    private Gender gender;

    // ─── FTL-06  Landlord-specific fields ───────────────────────────

    @Column(name = "company_name", length = 200)
    private String companyName;

    @Column(name = "number_of_properties")
    private Integer numberOfProperties;

    /** Short landlord self-description shown to tenants. */
    @Column(name = "landlord_description", columnDefinition = "TEXT")
    private String landlordDescription;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum UserRole {
        ADMIN, LANDLORD, TENANT
    }

    public enum SmokingStatus {
        NON_SMOKER, OCCASIONAL, SMOKER
    }

    public enum Gender {
        MALE, FEMALE, NON_BINARY, PREFER_NOT_TO_SAY
    }
}
