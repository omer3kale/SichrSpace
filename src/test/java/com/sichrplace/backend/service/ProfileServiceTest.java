package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ProfileDto;
import com.sichrplace.backend.dto.ProfileRequest;
import com.sichrplace.backend.dto.PublicProfileDto;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * FTL Sprint-2 tests: ProfileService (FTL-05, FTL-06, FTL-07).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ProfileService — Sprint 2")
class ProfileServiceTest {

    @Mock private UserRepository userRepository;
    @InjectMocks private ProfileServiceImpl profileService;

    private User tenant;
    private User landlord;

    @BeforeEach
    void setUp() {
        tenant = User.builder()
                .id(1L).email("tenant@example.com").role(User.UserRole.TENANT)
                .firstName("Alice").lastName("Tester").isActive(true).emailVerified(true)
                .build();

        landlord = User.builder()
                .id(2L).email("landlord@example.com").role(User.UserRole.LANDLORD)
                .firstName("Bob").lastName("Vermieter").isActive(true).emailVerified(true)
                .build();
    }

    // ─── FTL-05: Renter profile ─────────────────────────────────────

    @Nested
    @DisplayName("FTL-05 — Renter profile with personality/habits")
    class RenterProfileTests {

        @Test
        @DisplayName("getMyProfile returns all personality fields + completionPercentage")
        void getMyProfile_returnsAllFields() {
            tenant.setHobbies("reading,cycling");
            tenant.setDailyRoutine("early-riser");
            tenant.setLifestyleTags("vegan,fitness");
            tenant.setSmokingStatus(User.SmokingStatus.NON_SMOKER);
            tenant.setPetOwner(false);
            tenant.setGender(User.Gender.FEMALE);
            tenant.setPhone("+49123");
            tenant.setDateOfBirth(LocalDate.of(1995, 5, 15));
            tenant.setBio("Hello!");
            tenant.setCity("Berlin");
            tenant.setCountry("DE");
            when(userRepository.findById(1L)).thenReturn(Optional.of(tenant));

            ProfileDto dto = profileService.getMyProfile(1L);

            assertEquals("reading,cycling", dto.getHobbies());
            assertEquals("early-riser", dto.getDailyRoutine());
            assertEquals("vegan,fitness", dto.getLifestyleTags());
            assertEquals("NON_SMOKER", dto.getSmokingStatus());
            assertFalse(dto.getPetOwner());
            assertEquals("FEMALE", dto.getGender());
            assertEquals(100, dto.getCompletionPercentage());
        }

        @Test
        @DisplayName("update all personality fields → round-trip verified")
        void updateAllPersonalityFields() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(tenant));
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ProfileRequest req = ProfileRequest.builder()
                    .firstName("Alice")
                    .lastName("Tester")
                    .phone("+49123")
                    .dateOfBirth(LocalDate.of(1995, 5, 15))
                    .bio("Bio here")
                    .city("Berlin")
                    .country("DE")
                    .hobbies("reading,cycling")
                    .dailyRoutine("early-riser, works from home")
                    .lifestyleTags("vegan,fitness,music")
                    .smokingStatus("NON_SMOKER")
                    .petOwner(false)
                    .gender("FEMALE")
                    .build();

            ProfileDto dto = profileService.updateMyProfile(1L, req);

            assertEquals("reading,cycling", dto.getHobbies());
            assertEquals("early-riser, works from home", dto.getDailyRoutine());
            assertEquals("vegan,fitness,music", dto.getLifestyleTags());
            assertEquals("NON_SMOKER", dto.getSmokingStatus());
            assertFalse(dto.getPetOwner());
            assertEquals("FEMALE", dto.getGender());
            assertEquals(100, dto.getCompletionPercentage());
        }

        @Test
        @DisplayName("partial update → completionPercentage < 100%")
        void partialUpdate_lowerCompletion() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(tenant));
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ProfileRequest req = ProfileRequest.builder()
                    .hobbies("reading")
                    .build();

            ProfileDto dto = profileService.updateMyProfile(1L, req);

            // Only firstName + lastName pre-set from builder, plus hobbies → 3 of 12 = 25%
            assertTrue(dto.getCompletionPercentage() < 100,
                    "Partial profile must have < 100% completion");
            assertTrue(dto.getCompletionPercentage() > 0,
                    "Profile with some fields should have > 0% completion");
        }

        @Test
        @DisplayName("renter cannot set landlord-only fields")
        void renter_cannotSetLandlordFields() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(tenant));
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ProfileRequest req = ProfileRequest.builder()
                    .companyName("Evil Corp")
                    .numberOfProperties(99)
                    .landlordDescription("I have many flats")
                    .build();

            ProfileDto dto = profileService.updateMyProfile(1L, req);

            // Landlord fields silently ignored for tenant
            assertNull(dto.getCompanyName());
            assertNull(dto.getNumberOfProperties());
            assertNull(dto.getLandlordDescription());
        }
    }

    // ─── FTL-06: Landlord profile ───────────────────────────────────

    @Nested
    @DisplayName("FTL-06 — Landlord profile")
    class LandlordProfileTests {

        @Test
        @DisplayName("landlord can update company fields")
        void landlordProfile_updateCompanyFields() {
            when(userRepository.findById(2L)).thenReturn(Optional.of(landlord));
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ProfileRequest req = ProfileRequest.builder()
                    .companyName("Wohnraum GmbH")
                    .numberOfProperties(12)
                    .landlordDescription("Professional property management")
                    .build();

            ProfileDto dto = profileService.updateMyProfile(2L, req);

            assertEquals("Wohnraum GmbH", dto.getCompanyName());
            assertEquals(12, dto.getNumberOfProperties());
            assertEquals("Professional property management", dto.getLandlordDescription());
        }

        @Test
        @DisplayName("landlord profile read returns correct completion")
        void landlordProfile_completion() {
            landlord.setCompanyName("Immobilien AG");
            landlord.setNumberOfProperties(5);
            landlord.setLandlordDescription("Trusted landlord");
            landlord.setPhone("+49456");
            landlord.setDateOfBirth(LocalDate.of(1980, 1, 1));
            landlord.setBio("Experienced");
            landlord.setCity("Munich");
            landlord.setCountry("DE");
            when(userRepository.findById(2L)).thenReturn(Optional.of(landlord));

            ProfileDto dto = profileService.getMyProfile(2L);

            // 7 basic + 3 landlord = 10 total, all 10 filled: 100%
            assertEquals(100, dto.getCompletionPercentage());
        }

        @Test
        @DisplayName("landlord can also set personality fields")
        void landlordCanSetPersonalityFields() {
            when(userRepository.findById(2L)).thenReturn(Optional.of(landlord));
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ProfileRequest req = ProfileRequest.builder()
                    .hobbies("golf")
                    .smokingStatus("NON_SMOKER")
                    .build();

            ProfileDto dto = profileService.updateMyProfile(2L, req);

            assertEquals("golf", dto.getHobbies());
            assertEquals("NON_SMOKER", dto.getSmokingStatus());
        }
    }

    // ─── FTL-07: Limited profile view ───────────────────────────────

    @Nested
    @DisplayName("FTL-07 — Public profile view")
    class PublicProfileTests {

        @Test
        @DisplayName("public profile includes matching-safe fields only")
        void publicProfile_noSensitiveData() {
            tenant.setHobbies("reading,cycling");
            tenant.setLifestyleTags("vegan,fitness");
            tenant.setSmokingStatus(User.SmokingStatus.OCCASIONAL);
            tenant.setPetOwner(true);
            tenant.setPhone("+49-secret-123");
            tenant.setDateOfBirth(LocalDate.of(1995, 5, 15));
            tenant.setCity("Berlin");
            tenant.setProfileImageUrl("https://cdn.example.com/avatar.jpg");
            when(userRepository.findById(1L)).thenReturn(Optional.of(tenant));

            PublicProfileDto dto = profileService.getPublicProfile(1L);

            // Included
            assertEquals("Alice", dto.getFirstName());
            assertEquals("https://cdn.example.com/avatar.jpg", dto.getProfileImageUrl());
            assertEquals("reading,cycling", dto.getHobbies());
            assertEquals("vegan,fitness", dto.getLifestyleTags());
            assertEquals("OCCASIONAL", dto.getSmokingStatus());
            assertTrue(dto.getPetOwner());
            assertEquals("TENANT", dto.getRole());

            // NOT included (PublicProfileDto has no email/phone/dob/city fields)
            assertNull(dto.getCompanyName()); // tenant has no company
        }

        @Test
        @DisplayName("landlord public profile shows companyName")
        void landlordPublicProfile_showsCompany() {
            landlord.setCompanyName("Wohnraum GmbH");
            landlord.setProfileImageUrl("https://cdn.example.com/landlord.jpg");
            when(userRepository.findById(2L)).thenReturn(Optional.of(landlord));

            PublicProfileDto dto = profileService.getPublicProfile(2L);

            assertEquals("Wohnraum GmbH", dto.getCompanyName());
            assertEquals("LANDLORD", dto.getRole());
            assertEquals("Bob", dto.getFirstName());
        }

        @Test
        @DisplayName("non-existent user throws")
        void publicProfile_unknownUser_throws() {
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> profileService.getPublicProfile(999L));
        }
    }
}
