package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * FTL-07 — Limited profile view returned from GET /api/profiles/{userId}/public.
 *
 * <p>Includes <strong>only</strong> compatibility-relevant and non-PII fields:
 * <ul>
 *   <li>firstName, profileImageUrl — identity (no last name, no email)</li>
 *   <li>lifestyleTags, hobbies, smokingStatus, petOwner — matching signals</li>
 *   <li>companyName (landlords only) — business identity</li>
 * </ul>
 *
 * <p>Deliberately excluded: email, phone, dateOfBirth, city, country, exact address.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicProfileDto {

    private Long id;
    private String firstName;
    private String profileImageUrl;
    private String role;

    // ── matching-safe personality fields ──
    private String lifestyleTags;
    private String hobbies;
    private String smokingStatus;
    private Boolean petOwner;

    // ── landlord badge (null for tenants) ──
    private String companyName;

    public static PublicProfileDto fromEntity(User user) {
        return PublicProfileDto.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .profileImageUrl(user.getProfileImageUrl())
                .role(user.getRole().name())
                .lifestyleTags(user.getLifestyleTags())
                .hobbies(user.getHobbies())
                .smokingStatus(user.getSmokingStatus() != null ? user.getSmokingStatus().name() : null)
                .petOwner(user.getPetOwner())
                .companyName(user.getRole() == User.UserRole.LANDLORD ? user.getCompanyName() : null)
                .build();
    }
}
