package com.sichrplace.backend.dto;

import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Request body for PUT /api/profiles/me.
 * All fields are optional — only non-null values are applied (partial update).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileRequest {

    @Size(max = 100, message = "First name must not exceed 100 characters")
    private String firstName;

    @Size(max = 100, message = "Last name must not exceed 100 characters")
    private String lastName;

    @Size(max = 30, message = "Phone must not exceed 30 characters")
    private String phone;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    @Size(max = 2000, message = "Bio must not exceed 2000 characters")
    private String bio;

    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;

    @Size(max = 100, message = "Country must not exceed 100 characters")
    private String country;

    @Size(max = 10, message = "Locale must not exceed 10 characters")
    @jakarta.validation.constraints.Pattern(
            regexp = "^(en|de|tr)$",
            message = "Preferred locale must be one of: en, de, tr")
    private String preferredLocale;

    private String profileImageUrl;

    // ── personality / habits (renter fields) ──

    @Size(max = 500, message = "Hobbies must not exceed 500 characters")
    private String hobbies;

    @Size(max = 500, message = "Daily routine must not exceed 500 characters")
    private String dailyRoutine;

    @Size(max = 500, message = "Lifestyle tags must not exceed 500 characters")
    private String lifestyleTags;

    /** Must be one of NON_SMOKER, OCCASIONAL, SMOKER. */
    private String smokingStatus;

    private Boolean petOwner;

    /** Must be one of MALE, FEMALE, NON_BINARY, PREFER_NOT_TO_SAY. */
    private String gender;

    // ── landlord-specific fields ──

    @Size(max = 200, message = "Company name must not exceed 200 characters")
    private String companyName;

    private Integer numberOfProperties;

    @Size(max = 2000, message = "Landlord description must not exceed 2000 characters")
    private String landlordDescription;
}
