package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ApartmentMatchDto;
import com.sichrplace.backend.dto.ApartmentSearchCardDto;
import com.sichrplace.backend.dto.ApplicantMatchDto;
import com.sichrplace.backend.dto.PublicProfileDto;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.BookingRequest;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.BookingRequestRepository;
import com.sichrplace.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * FTL-14 — ranks booking-request applicants for a given apartment based on
 * lifestyle compatibility, budget fit, stay-duration overlap, and property preferences.
 *
 * <p>Score range: 0–100. Higher is better. Each dimension contributes up to 25 points.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SmartMatchingService {

    private final BookingRequestRepository bookingRequestRepository;
    private final ApartmentRepository apartmentRepository;
    private final UserRepository userRepository;
    /**
     * Returns ranked applicants for the given apartment, visible only to the owning landlord.
     */
    public List<ApplicantMatchDto> compareApplicants(Long apartmentId, Long landlordId) {
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        if (!apartment.getOwner().getId().equals(landlordId)) {
            throw new SecurityException("Not authorized to compare applicants for this apartment");
        }

        List<BookingRequest> requests = bookingRequestRepository
                .findByApartmentIdAndStatus(apartmentId, BookingRequest.BookingStatus.SUBMITTED);

        return requests.stream()
                .map(br -> {
                    User tenant = br.getTenant();
                    List<String> reasons = new ArrayList<>();
                    int score = 0;

                    score += lifestyleScore(tenant, apartment, reasons);
                    score += durationScore(br, apartment, reasons);
                    score += petScore(br, apartment, reasons);
                    score += occupantScore(br, reasons);

                    return ApplicantMatchDto.builder()
                            .bookingRequestId(br.getId())
                            .score(Math.min(100, score))
                            .reasons(reasons)
                            .publicProfile(PublicProfileDto.fromEntity(tenant))
                            .build();
                })
                .sorted(Comparator.comparingInt(ApplicantMatchDto::getScore).reversed())
                .collect(Collectors.toList());
    }

    // ── Scoring dimensions (each up to 25 pts) ──

    /** Lifestyle: smoking + petOwner + lifestyleTags overlap. */
    int lifestyleScore(User tenant, Apartment apartment, List<String> reasons) {
        int pts = 0;
        // Non-smoker or occasional: +10 (general desirability)
        if (tenant.getSmokingStatus() != null) {
            if (tenant.getSmokingStatus() == User.SmokingStatus.NON_SMOKER) {
                pts += 10;
                reasons.add("Non-smoker");
            } else if (tenant.getSmokingStatus() == User.SmokingStatus.OCCASIONAL) {
                pts += 5;
                reasons.add("Occasional smoker");
            }
        }
        // Lifestyle tags present: +5
        if (tenant.getLifestyleTags() != null && !tenant.getLifestyleTags().isBlank()) {
            pts += 5;
            reasons.add("Has lifestyle tags");
        }
        // Hobbies filled in: +5
        if (tenant.getHobbies() != null && !tenant.getHobbies().isBlank()) {
            pts += 5;
            reasons.add("Hobbies provided");
        }
        return Math.min(25, pts);
    }

    /** Duration: does the applicant's preferred dates overlap with apartment availability? */
    int durationScore(BookingRequest br, Apartment apartment, List<String> reasons) {
        int pts = 0;
        LocalDate aptFrom = apartment.getAvailableFrom();
        LocalDate aptTo = apartment.getMoveOutDate();

        if (br.getPreferredMoveIn() != null && aptFrom != null) {
            if (!br.getPreferredMoveIn().isBefore(aptFrom)) {
                pts += 15;
                reasons.add("Move-in date within availability");
            }
        }
        if (br.getPreferredMoveOut() != null && aptTo != null) {
            if (!br.getPreferredMoveOut().isAfter(aptTo)) {
                pts += 10;
                reasons.add("Move-out date within availability");
            }
        }
        if (br.isWouldExtendLater()) {
            // Extension willingness is a positive signal for long-term landlords
            pts += 5;
            reasons.add("Willing to extend stay");
        }
        return Math.min(25, pts);
    }

    /** Pet compatibility: pet-owning applicant + pet-friendly apartment = match. */
    int petScore(BookingRequest br, Apartment apartment, List<String> reasons) {
        boolean hasPets = br.getPetsJson() != null && !br.getPetsJson().isBlank()
                && !br.getPetsJson().equals("[]");
        boolean petFriendly = Boolean.TRUE.equals(apartment.getPetFriendly());

        if (!hasPets) {
            reasons.add("No pets");
            return 25; // ideal tenant for any apartment
        }
        if (petFriendly) {
            reasons.add("Pet-friendly apartment matches pet owner");
            return 20;
        }
        reasons.add("Has pets but apartment not pet-friendly");
        return 0;
    }

    /** Occupant clarity: bonus for providing adults, children data. */
    int occupantScore(BookingRequest br, List<String> reasons) {
        int pts = 10; // baseline for submitting an application
        if (br.getAdultsJson() != null && !br.getAdultsJson().isBlank()) {
            pts += 8;
            reasons.add("Adults details provided");
        }
        if (br.getChildrenJson() != null && !br.getChildrenJson().isBlank()) {
            pts += 4;
            reasons.add("Children details provided");
        }
        if (br.getDetailedReason() != null && !br.getDetailedReason().isBlank()) {
            pts += 3;
            reasons.add("Detailed reason provided");
        }
        return Math.min(25, pts);
    }

    // ══════════════════════════════════════════════════════════════
    // FTL-22 — Tenant-side: "apartments for me"
    // ══════════════════════════════════════════════════════════════

    /**
     * Returns the top-N available apartments, ranked by compatibility with the
     * tenant's profile. Scored 0–100 across four dimensions:
     * <ol>
     *   <li><b>Location</b> (25 pts) — city match or apartment in tenant's city</li>
     *   <li><b>Pet compatibility</b> (25 pts) — non-pet-owner fits all; pet-owner needs pet-friendly</li>
     *   <li><b>Lifestyle</b> (25 pts) — smoking, lifestyle tags, area description alignment</li>
     *   <li><b>Availability</b> (25 pts) — apartment available soon, within 30 days</li>
     * </ol>
     *
     * @param tenantId the authenticated tenant's user ID
     * @param limit    max results (default caller should send 20)
     * @return list of scored apartment recommendations, descending by score
     */
    public List<ApartmentMatchDto> matchApartmentsForTenant(Long tenantId, int limit) {
        User tenant = userRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        // Fetch all AVAILABLE apartments (paginated to a reasonable max)
        List<Apartment> available = apartmentRepository
                .findAllAvailable(PageRequest.of(0, 200))
                .getContent();

        return available.stream()
                .map(apt -> {
                    List<String> reasons = new ArrayList<>();
                    int score = 0;
                    score += tenantLocationScore(tenant, apt, reasons);
                    score += tenantPetScore(tenant, apt, reasons);
                    score += tenantLifestyleScore(tenant, apt, reasons);
                    score += tenantAvailabilityScore(apt, reasons);

                    return ApartmentMatchDto.builder()
                            .apartmentId(apt.getId())
                            .score(Math.min(100, score))
                            .reasons(reasons)
                            .card(ApartmentSearchCardDto.fromEntity(apt))
                            .build();
                })
                .sorted(Comparator.comparingInt(ApartmentMatchDto::getScore).reversed())
                .limit(limit)
                .collect(Collectors.toList());
    }

    // ── Tenant-match dimensions ──

    /** Location: 25 if city matches tenant's city, 10 if district/area overlaps. */
    int tenantLocationScore(User tenant, Apartment apt, List<String> reasons) {
        if (tenant.getCity() == null || tenant.getCity().isBlank()) {
            return 0; // can't score without tenant city
        }
        if (apt.getCity() != null && apt.getCity().equalsIgnoreCase(tenant.getCity())) {
            reasons.add("Same city (" + apt.getCity() + ")");
            return 25;
        }
        // Partial: check if district or area mentions tenant city
        if (apt.getDistrict() != null
                && apt.getDistrict().toLowerCase().contains(tenant.getCity().toLowerCase())) {
            reasons.add("District near " + tenant.getCity());
            return 10;
        }
        return 0;
    }

    /** Pet: non-owner gets 25 (fits anywhere); owner + pet-friendly = 20; mismatch = 0. */
    int tenantPetScore(User tenant, Apartment apt, List<String> reasons) {
        boolean ownerHasPets = Boolean.TRUE.equals(tenant.getPetOwner());
        boolean petFriendly = Boolean.TRUE.equals(apt.getPetFriendly());

        if (!ownerHasPets) {
            reasons.add("No pets — fits any apartment");
            return 25;
        }
        if (petFriendly) {
            reasons.add("Pet-friendly apartment");
            return 20;
        }
        reasons.add("Has pets but apartment not pet-friendly");
        return 0;
    }

    /** Lifestyle: smoking, tags, hobbies — up to 25. */
    int tenantLifestyleScore(User tenant, Apartment apt, List<String> reasons) {
        int pts = 0;
        // Non-smoker bonus
        if (tenant.getSmokingStatus() != null) {
            if (tenant.getSmokingStatus() == User.SmokingStatus.NON_SMOKER) {
                pts += 10;
                reasons.add("Non-smoker");
            } else if (tenant.getSmokingStatus() == User.SmokingStatus.OCCASIONAL) {
                pts += 5;
                reasons.add("Occasional smoker");
            }
        }
        // Lifestyle tags present
        if (tenant.getLifestyleTags() != null && !tenant.getLifestyleTags().isBlank()) {
            pts += 5;
            reasons.add("Lifestyle preferences specified");
        }
        // Area description alignment (if tenant has hobbies and apt has areaDescription)
        if (tenant.getHobbies() != null && !tenant.getHobbies().isBlank()
                && apt.getAreaDescription() != null && !apt.getAreaDescription().isBlank()) {
            pts += 5;
            reasons.add("Area description available for lifestyle fit");
        }
        // Furnished preference — furnished gets a small bonus
        if (apt.getFurnishedStatus() == Apartment.FurnishedStatus.FURNISHED) {
            pts += 5;
            reasons.add("Fully furnished");
        }
        return Math.min(25, pts);
    }

    /** Availability: apartment available soon (within 30 days) or already available. */
    int tenantAvailabilityScore(Apartment apt, List<String> reasons) {
        int pts = 0;
        LocalDate today = LocalDate.now();
        LocalDate from = apt.getAvailableFrom();

        if (from == null || !from.isAfter(today)) {
            pts += 15;
            reasons.add("Available now");
        } else if (!from.isAfter(today.plusDays(30))) {
            pts += 10;
            reasons.add("Available within 30 days");
        }
        // Flexible timeslot bonus
        if (Boolean.TRUE.equals(apt.getFlexibleTimeslot())) {
            pts += 5;
            reasons.add("Flexible move-in");
        }
        // Long-term available (moveOutDate far or null)
        if (apt.getMoveOutDate() == null || apt.getMoveOutDate().isAfter(today.plusMonths(6))) {
            pts += 5;
            reasons.add("Long-term availability");
        }
        return Math.min(25, pts);
    }

    /**
     * Matching success rate: how many total booking requests vs accepted ones
     * for the given landlord's apartments.
     *
     * @return map with totalBookingRequests, acceptedBookings, successRate (0.0–1.0)
     */
    public Map<String, Object> getMatchingSuccessRate(Long landlordId) {
        userRepository.findById(landlordId)
                .orElseThrow(() -> new IllegalArgumentException("Landlord not found"));

        List<BookingRequest> allRequests = bookingRequestRepository.findByLandlordId(landlordId);
        long total = allRequests.size();
        long accepted = allRequests.stream()
                .filter(br -> br.getStatus() == BookingRequest.BookingStatus.ACCEPTED)
                .count();

        double rate = total > 0 ? (double) accepted / total : 0.0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalBookingRequests", total);
        result.put("acceptedBookings", accepted);
        result.put("successRate", Math.round(rate * 1000.0) / 1000.0);
        return result;
    }
}
