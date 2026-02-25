package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ProfileDto;
import com.sichrplace.backend.dto.ProfileRequest;
import com.sichrplace.backend.dto.PublicProfileDto;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Profile management service covering FTL-05, FTL-06, and FTL-07.
 *
 * <p>Role-based guard: landlord-only fields ({@code companyName}, {@code numberOfProperties},
 * {@code landlordDescription}) are silently ignored when the caller is a TENANT.
 * Conversely, personality fields ({@code hobbies}, {@code dailyRoutine}, etc.) are accepted
 * from any role — a landlord filling them in prepares their data for future smart-matching.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ProfileServiceImpl implements ProfileService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public ProfileDto getMyProfile(Long userId) {
        User user = findUser(userId);
        return ProfileDto.fromEntity(user);
    }

    @Override
    public ProfileDto updateMyProfile(Long userId, ProfileRequest req) {
        User user = findUser(userId);

        // ── shared basic fields ──
        applyIfPresent(req.getFirstName(),      user::setFirstName);
        applyIfPresent(req.getLastName(),       user::setLastName);
        applyIfPresent(req.getPhone(),          user::setPhone);
        if (req.getDateOfBirth() != null) user.setDateOfBirth(req.getDateOfBirth());
        applyIfPresent(req.getBio(),            user::setBio);
        applyIfPresent(req.getCity(),           user::setCity);
        applyIfPresent(req.getCountry(),        user::setCountry);
        applyIfPresent(req.getPreferredLocale(),user::setPreferredLocale);
        applyIfPresent(req.getProfileImageUrl(),user::setProfileImageUrl);

        // ── personality / habits ──
        applyIfPresent(req.getHobbies(),        user::setHobbies);
        applyIfPresent(req.getDailyRoutine(),   user::setDailyRoutine);
        applyIfPresent(req.getLifestyleTags(),  user::setLifestyleTags);
        if (req.getPetOwner() != null) user.setPetOwner(req.getPetOwner());
        if (req.getSmokingStatus() != null) {
            user.setSmokingStatus(User.SmokingStatus.valueOf(req.getSmokingStatus()));
        }
        if (req.getGender() != null) {
            user.setGender(User.Gender.valueOf(req.getGender()));
        }

        // ── landlord-only fields — silently skipped for non-landlord roles ──
        if (user.getRole() == User.UserRole.LANDLORD || user.getRole() == User.UserRole.ADMIN) {
            applyIfPresent(req.getCompanyName(),        user::setCompanyName);
            if (req.getNumberOfProperties() != null) user.setNumberOfProperties(req.getNumberOfProperties());
            applyIfPresent(req.getLandlordDescription(), user::setLandlordDescription);
        }

        user = userRepository.save(user);
        log.info("Profile updated userId={}, role={}", userId, user.getRole());
        return ProfileDto.fromEntity(user);
    }

    @Override
    @Transactional(readOnly = true)
    public PublicProfileDto getPublicProfile(Long userId) {
        User user = findUser(userId);
        return PublicProfileDto.fromEntity(user);
    }

    // ── helpers ────────────────────────────────────────────────────

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    @Override
    public ProfileDto updateProfileImage(Long userId, String imageUrl) {
        User user = findUser(userId);
        user.setProfileImageUrl(imageUrl);
        user = userRepository.save(user);
        log.info("Profile image updated userId={}", userId);
        return ProfileDto.fromEntity(user);
    }

    /** Applies a non-null string value to a setter. */
    private void applyIfPresent(String value, java.util.function.Consumer<String> setter) {
        if (value != null) {
            setter.accept(value);
        }
    }
}
