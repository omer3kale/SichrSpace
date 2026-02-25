package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ProfileDto;
import com.sichrplace.backend.dto.ProfileRequest;
import com.sichrplace.backend.dto.PublicProfileDto;

public interface ProfileService {

    /** Full profile of the authenticated user (GET /api/profiles/me). */
    ProfileDto getMyProfile(Long userId);

    /** Partial update of profile fields (PUT /api/profiles/me). */
    ProfileDto updateMyProfile(Long userId, ProfileRequest request);

    /** Limited, privacy-safe public profile (GET /api/profiles/{userId}/public). */
    PublicProfileDto getPublicProfile(Long userId);

    /** Update (or clear) the user's profile image URL. */
    ProfileDto updateProfileImage(Long userId, String imageUrl);
}
