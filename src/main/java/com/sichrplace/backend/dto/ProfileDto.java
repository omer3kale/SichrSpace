package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Full profile DTO returned from GET /api/profiles/me.
 * Contains all editable fields plus a computed {@code completionPercentage}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileDto {

    // ── identity ──
    private Long id;
    private String email;
    private String role;
    private String profileImageUrl;

    // ── basic ──
    private String firstName;
    private String lastName;
    private String phone;
    private LocalDate dateOfBirth;
    private String bio;
    private String city;
    private String country;
    private String preferredLocale;

    // ── personality / habits (renter) ──
    private String hobbies;
    private String dailyRoutine;
    private String lifestyleTags;
    private String smokingStatus;
    private Boolean petOwner;
    private String gender;

    // ── landlord-specific ──
    private String companyName;
    private Integer numberOfProperties;
    private String landlordDescription;

    // ── computed ──
    private int completionPercentage;

    /**
     * Build a {@link ProfileDto} from a {@link User}, computing completion percentage
     * based on which optional fields are populated.
     */
    public static ProfileDto fromEntity(User user) {
        ProfileDto dto = ProfileDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole().name())
                .profileImageUrl(user.getProfileImageUrl())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .dateOfBirth(user.getDateOfBirth())
                .bio(user.getBio())
                .city(user.getCity())
                .country(user.getCountry())
                .preferredLocale(user.getPreferredLocale())
                .hobbies(user.getHobbies())
                .dailyRoutine(user.getDailyRoutine())
                .lifestyleTags(user.getLifestyleTags())
                .smokingStatus(user.getSmokingStatus() != null ? user.getSmokingStatus().name() : null)
                .petOwner(user.getPetOwner())
                .gender(user.getGender() != null ? user.getGender().name() : null)
                .companyName(user.getCompanyName())
                .numberOfProperties(user.getNumberOfProperties())
                .landlordDescription(user.getLandlordDescription())
                .build();

        dto.setCompletionPercentage(computeCompletion(user));
        return dto;
    }

    /**
     * Compute profile completion as a rounded percentage.
     * The field set depends on role: renters are scored on personality fields,
     * landlords on company/description fields.
     */
    private static int computeCompletion(User user) {
        int filled = 0;
        int total = 0;

        // -- Shared basic fields (both roles) --
        total += 7;
        if (hasText(user.getFirstName()))    filled++;
        if (hasText(user.getLastName()))      filled++;
        if (hasText(user.getPhone()))         filled++;
        if (user.getDateOfBirth() != null)    filled++;
        if (hasText(user.getBio()))           filled++;
        if (hasText(user.getCity()))          filled++;
        if (hasText(user.getCountry()))       filled++;

        if (user.getRole() == User.UserRole.TENANT) {
            // -- Renter personality fields --
            total += 5;
            if (hasText(user.getHobbies()))       filled++;
            if (hasText(user.getDailyRoutine()))   filled++;
            if (hasText(user.getLifestyleTags()))   filled++;
            if (user.getSmokingStatus() != null)   filled++;
            if (user.getPetOwner() != null)        filled++;
        } else if (user.getRole() == User.UserRole.LANDLORD) {
            // -- Landlord-specific fields --
            total += 3;
            if (hasText(user.getCompanyName()))         filled++;
            if (user.getNumberOfProperties() != null)  filled++;
            if (hasText(user.getLandlordDescription())) filled++;
        }

        return total == 0 ? 0 : Math.round((float) filled / total * 100);
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }
}
