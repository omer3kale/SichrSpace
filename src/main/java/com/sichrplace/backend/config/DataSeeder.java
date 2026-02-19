package com.sichrplace.backend.config;

import com.sichrplace.backend.model.*;
import com.sichrplace.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Seeds the database with synthetic "workplace" data on first startup.
 * <p>
 * Active only when the {@code beta-mssql} or {@code local-mssql} profile is set.
 * The runner checks whether the {@code users} table is empty — if it already
 * contains rows, seeding is skipped (idempotent).
 * <p>
 * <strong>Teaching note:</strong> This class uses Spring's {@link CommandLineRunner}
 * interface, which Spring Boot invokes after the application context is fully
 * initialised.  The {@link Profile} annotation limits it to non-production
 * profiles, so it can never accidentally run against the real database.
 */
@Component
@Profile({"beta-mssql", "local-mssql"})
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ApartmentRepository apartmentRepository;
    private final ListingRepository listingRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ViewingRequestRepository viewingRequestRepository;
    private final ViewingRequestTransitionRepository transitionRepository;
    private final SavedSearchRepository savedSearchRepository;
    private final ApartmentReviewRepository apartmentReviewRepository;
    private final UserFavoriteRepository userFavoriteRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;

    /** Shared password for every seed account. */
    private static final String SEED_PASSWORD = "password123";

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("DataSeeder: database already contains users – skipping seed.");
            return;
        }

        log.info("DataSeeder: populating SichrPlace workplace seed data …");

        // ── Users ────────────────────────────────────────────────────
        String encodedPw = passwordEncoder.encode(SEED_PASSWORD);

        User admin = userRepository.save(User.builder()
                .email("admin@sichrplace.com").password(encodedPw)
                .firstName("Admin").lastName("SichrPlace")
                .bio("Platform administrator for SichrPlace.")
                .role(User.UserRole.ADMIN).emailVerified(true)
                .city("Aachen").country("Germany")
                .isActive(true).gdprConsent(true)
                .gdprConsentDate(Instant.parse("2025-09-01T00:00:00Z"))
                .marketingConsent(false).build());

        User alice = userRepository.save(User.builder()
                .email("alice.tutor@rwth-aachen.de").password(encodedPw)
                .firstName("Alice").lastName("Schmidt")
                .bio("SE tutor at RWTH Aachen. Rents two apartments near the university.")
                .phone("+49 241 555 0001")
                .role(User.UserRole.LANDLORD).emailVerified(true)
                .city("Aachen").country("Germany")
                .isActive(true).gdprConsent(true)
                .gdprConsentDate(Instant.parse("2025-09-15T10:00:00Z"))
                .marketingConsent(false).build());

        User bob = userRepository.save(User.builder()
                .email("bob.landlord@gmail.com").password(encodedPw)
                .firstName("Bob").lastName("Mueller")
                .bio("Private landlord offering student housing in Aachen city centre.")
                .phone("+49 241 555 0002")
                .role(User.UserRole.LANDLORD).emailVerified(true)
                .city("Aachen").country("Germany")
                .isActive(true).gdprConsent(true)
                .gdprConsentDate(Instant.parse("2025-10-01T08:00:00Z"))
                .marketingConsent(false).build());

        User charlie = userRepository.save(User.builder()
                .email("charlie.student@rwth-aachen.de").password(encodedPw)
                .firstName("Charlie").lastName("Weber")
                .bio("MSc Informatik student at RWTH, looking for a flat near campus.")
                .phone("+49 176 555 1001")
                .role(User.UserRole.TENANT).emailVerified(true)
                .city("Aachen").country("Germany")
                .isActive(true).gdprConsent(true)
                .gdprConsentDate(Instant.parse("2025-10-05T14:00:00Z"))
                .marketingConsent(true).build());

        User diana = userRepository.save(User.builder()
                .email("diana.student@rwth-aachen.de").password(encodedPw)
                .firstName("Diana").lastName("Fischer")
                .bio("BSc SE student starting her thesis. Searching for a quiet WG-Zimmer.")
                .phone("+49 176 555 1002")
                .role(User.UserRole.TENANT).emailVerified(true)
                .city("Aachen").country("Germany")
                .isActive(true).gdprConsent(true)
                .gdprConsentDate(Instant.parse("2025-10-06T09:30:00Z"))
                .marketingConsent(false).build());

        User erik = userRepository.save(User.builder()
                .email("erik.student@rwth-aachen.de").password(encodedPw)
                .firstName("Erik").lastName("Braun")
                .bio("Erasmus exchange student from Sweden, here for two semesters.")
                .phone("+49 176 555 1003")
                .role(User.UserRole.TENANT).emailVerified(false)
                .city("Aachen").country("Germany")
                .isActive(true).gdprConsent(true)
                .gdprConsentDate(Instant.parse("2025-10-10T16:00:00Z"))
                .marketingConsent(true).build());

        log.info("  ✓ 6 users created");

        // ── Apartments ───────────────────────────────────────────────
        Apartment ponttor = apartmentRepository.save(Apartment.builder()
                .owner(alice).title("Gemütliche 2-Zimmer-Wohnung am Ponttor")
                .description("Helle, renovierte Wohnung direkt am Ponttor, 5 Min. zur RWTH. "
                        + "Einbauküche, Holzdielen, ruhiger Innenhof.")
                .city("Aachen").district("Ponttor").address("Pontstraße 42")
                .latitude(50.7780).longitude(6.0780)
                .monthlyRent(new BigDecimal("620.00")).depositAmount(new BigDecimal("1240.00"))
                .sizeSquareMeters(55.0).numberOfBedrooms(2).numberOfBathrooms(1)
                .furnished(true).petFriendly(false).hasParking(false).hasElevator(true).hasBalcony(true)
                .amenities("WiFi, Waschmaschine, Einbauküche, Keller")
                .availableFrom(LocalDate.of(2026, 4, 1))
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .numberOfViews(87L).averageRating(4.5).reviewCount(2).build());

        Apartment lousberg = apartmentRepository.save(Apartment.builder()
                .owner(alice).title("Helles Studio am Lousberg")
                .description("Kompaktes Apartment mit Blick über Aachen. Ideal für Einzelpersonen. Möbliert.")
                .city("Aachen").district("Lousberg").address("Lousbergstraße 18")
                .latitude(50.7850).longitude(6.0720)
                .monthlyRent(new BigDecimal("450.00")).depositAmount(new BigDecimal("900.00"))
                .sizeSquareMeters(28.0).numberOfBedrooms(1).numberOfBathrooms(1)
                .furnished(true).petFriendly(false).hasParking(true).hasElevator(false).hasBalcony(false)
                .amenities("WiFi, Möbliert, Stellplatz, Keller")
                .availableFrom(LocalDate.of(2026, 3, 1))
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .numberOfViews(54L).averageRating(4.0).reviewCount(1).build());

        Apartment wgZimmer = apartmentRepository.save(Apartment.builder()
                .owner(bob).title("WG-Zimmer nahe RWTH Informatikzentrum")
                .description("Zimmer in einer 3er-WG, nur 3 Gehminuten vom Informatikzentrum. "
                        + "Großes Wohnzimmer wird geteilt. Waschmaschine im Keller.")
                .city("Aachen").district("Hörn").address("Ahornstraße 17")
                .latitude(50.7795).longitude(6.0610)
                .monthlyRent(new BigDecimal("380.00")).depositAmount(new BigDecimal("760.00"))
                .sizeSquareMeters(16.0).numberOfBedrooms(1).numberOfBathrooms(1)
                .furnished(false).petFriendly(true).hasParking(false).hasElevator(false).hasBalcony(false)
                .amenities("WiFi, Gemeinschaftsküche, Waschmaschine")
                .availableFrom(LocalDate.of(2026, 2, 15))
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .numberOfViews(112L).averageRating(3.8).reviewCount(3).build());

        Apartment mitte = apartmentRepository.save(Apartment.builder()
                .owner(bob).title("Moderne 1-Zimmer-Wohnung Aachen Mitte")
                .description("Neubau-Apartment im Stadtzentrum, barrierefrei. "
                        + "Fußbodenheizung, Einbauküche, TG-Stellplatz optional.")
                .city("Aachen").district("Mitte").address("Markt 5")
                .latitude(50.7753).longitude(6.0839)
                .monthlyRent(new BigDecimal("720.00")).depositAmount(new BigDecimal("1440.00"))
                .sizeSquareMeters(38.0).numberOfBedrooms(1).numberOfBathrooms(1)
                .furnished(true).petFriendly(false).hasParking(true).hasElevator(true).hasBalcony(true)
                .amenities("WiFi, Einbauküche, Fußbodenheizung, Tiefgarage, Balkon")
                .availableFrom(LocalDate.of(2026, 5, 1))
                .status(Apartment.ApartmentStatus.PENDING)
                .numberOfViews(23L).averageRating(null).reviewCount(0).build());

        log.info("  ✓ 4 apartments created");

        // ── Listings ─────────────────────────────────────────────────
        listingRepository.save(Listing.builder()
                .title("Gemütliche 2-Zimmer-Wohnung am Ponttor")
                .description("Helle, renovierte Wohnung direkt am Ponttor.")
                .city("Aachen").district("Ponttor")
                .monthlyRent(new BigDecimal("620.00"))
                .sizeSquareMeters(55.0).furnished(true)
                .availableFrom(LocalDate.of(2026, 4, 1))
                .ownerId(alice.getId()).build());

        listingRepository.save(Listing.builder()
                .title("WG-Zimmer nahe RWTH Informatikzentrum")
                .description("Zimmer in einer 3er-WG, 3 Min. zum IZ.")
                .city("Aachen").district("Hörn")
                .monthlyRent(new BigDecimal("380.00"))
                .sizeSquareMeters(16.0).furnished(false)
                .availableFrom(LocalDate.of(2026, 2, 15))
                .ownerId(bob.getId()).build());

        log.info("  ✓ 2 listings created");

        // ── Conversations ────────────────────────────────────────────
        Conversation conv1 = conversationRepository.save(Conversation.builder()
                .apartment(ponttor).participant1(charlie).participant2(alice)
                .lastMessageAt(Instant.parse("2025-11-12T15:45:00Z")).build());

        Conversation conv2 = conversationRepository.save(Conversation.builder()
                .apartment(wgZimmer).participant1(diana).participant2(bob)
                .lastMessageAt(Instant.parse("2025-11-15T18:20:00Z")).build());

        Conversation conv3 = conversationRepository.save(Conversation.builder()
                .apartment(lousberg).participant1(erik).participant2(alice)
                .lastMessageAt(Instant.parse("2025-11-18T20:10:00Z")).build());

        log.info("  ✓ 3 conversations created");

        // ── Messages ─────────────────────────────────────────────────
        // Conv 1: Charlie ↔ Alice
        saveMsg(conv1, charlie, "Hallo Frau Schmidt, ist die Wohnung am Ponttor noch verfügbar? Ich studiere Informatik an der RWTH und suche ab April.",
                true, "2025-11-10T11:00:00Z", "2025-11-10T10:00:00Z");
        saveMsg(conv1, alice, "Hallo Charlie! Ja, die Wohnung ist noch frei. Möchtest du einen Besichtigungstermin vereinbaren?",
                true, "2025-11-10T14:30:00Z", "2025-11-10T11:15:00Z");
        saveMsg(conv1, charlie, "Sehr gerne! Passt Samstag um 14 Uhr?",
                true, "2025-11-11T09:00:00Z", "2025-11-10T14:45:00Z");
        saveMsg(conv1, alice, "Perfekt, Samstag 14 Uhr passt mir. Bis dann!",
                true, "2025-11-12T10:00:00Z", "2025-11-11T09:30:00Z");
        saveMsg(conv1, charlie, "Danke! Ich freue mich. Muss ich etwas mitbringen?",
                false, null, "2025-11-12T15:45:00Z");

        // Conv 2: Diana ↔ Bob
        saveMsg(conv2, diana, "Hi Bob, ich interessiere mich für das WG-Zimmer in der Ahornstraße. Wie ist die WG-Atmosphäre?",
                true, "2025-11-13T10:00:00Z", "2025-11-13T08:30:00Z");
        saveMsg(conv2, bob, "Hi Diana! Die WG ist super – zwei Informatik-Studenten, sehr ruhig unter der Woche, am Wochenende wird auch mal gekocht. Komm gerne vorbei!",
                true, "2025-11-14T12:00:00Z", "2025-11-13T10:45:00Z");
        saveMsg(conv2, diana, "Das klingt toll! Kann ich Mittwoch Nachmittag kommen?",
                true, "2025-11-15T08:00:00Z", "2025-11-14T14:00:00Z");
        saveMsg(conv2, bob, "Mittwoch 15 Uhr? Die anderen Mitbewohner sind dann auch da.",
                false, null, "2025-11-15T18:20:00Z");

        // Conv 3: Erik ↔ Alice
        saveMsg(conv3, erik, "Hello! I am an Erasmus student from Sweden. Is the studio at Lousberg available for two semesters starting March?",
                true, "2025-11-16T14:00:00Z", "2025-11-16T12:00:00Z");
        saveMsg(conv3, alice, "Hi Erik, welcome to Aachen! Yes, the studio is available from March. The minimum lease is 6 months, so two semesters works perfectly.",
                true, "2025-11-17T09:00:00Z", "2025-11-16T18:30:00Z");
        saveMsg(conv3, erik, "Great! Can I schedule a viewing this weekend?",
                false, null, "2025-11-18T20:10:00Z");

        log.info("  ✓ 12 messages created");

        // ── Viewing Requests ─────────────────────────────────────────
        ViewingRequest vr1 = viewingRequestRepository.save(ViewingRequest.builder()
                .apartment(ponttor).tenant(charlie)
                .proposedDateTime(LocalDateTime.of(2025, 11, 16, 14, 0))
                .message("Ich möchte die Wohnung gerne am Samstag besichtigen.")
                .status(ViewingRequest.ViewingStatus.CONFIRMED)
                .respondedAt(LocalDateTime.of(2025, 11, 11, 9, 30))
                .confirmedDateTime(LocalDateTime.of(2025, 11, 16, 14, 0))
                .build());

        ViewingRequest vr2 = viewingRequestRepository.save(ViewingRequest.builder()
                .apartment(wgZimmer).tenant(diana)
                .proposedDateTime(LocalDateTime.of(2025, 11, 20, 15, 0))
                .message("Mittwoch Nachmittag wäre ideal für mich.")
                .status(ViewingRequest.ViewingStatus.PENDING).build());

        ViewingRequest vr3 = viewingRequestRepository.save(ViewingRequest.builder()
                .apartment(lousberg).tenant(erik)
                .proposedDateTime(LocalDateTime.of(2025, 11, 23, 11, 0))
                .message("Weekend viewing if possible, please.")
                .status(ViewingRequest.ViewingStatus.PENDING).build());

        log.info("  ✓ 3 viewing requests created");

        // ── Viewing Request Transitions ──────────────────────────────
        // VR 1 (Charlie → Ponttor): PENDING → CONFIRMED
        transitionRepository.save(ViewingRequestTransition.builder()
                .viewingRequest(vr1).fromStatus(null)
                .toStatus("PENDING").changedBy(charlie)
                .changedAt(LocalDateTime.of(2025, 11, 10, 10, 0))
                .reason("Viewing request created").build());
        transitionRepository.save(ViewingRequestTransition.builder()
                .viewingRequest(vr1).fromStatus("PENDING")
                .toStatus("CONFIRMED").changedBy(alice)
                .changedAt(LocalDateTime.of(2025, 11, 11, 9, 30))
                .build());

        // VR 2 (Diana → WG-Zimmer): only initial PENDING
        transitionRepository.save(ViewingRequestTransition.builder()
                .viewingRequest(vr2).fromStatus(null)
                .toStatus("PENDING").changedBy(diana)
                .changedAt(LocalDateTime.of(2025, 11, 14, 16, 0))
                .reason("Viewing request created").build());

        // VR 3 (Erik → Lousberg): only initial PENDING
        transitionRepository.save(ViewingRequestTransition.builder()
                .viewingRequest(vr3).fromStatus(null)
                .toStatus("PENDING").changedBy(erik)
                .changedAt(LocalDateTime.of(2025, 11, 17, 12, 0))
                .reason("Viewing request created").build());

        log.info("  ✓ 4 viewing request transitions created");

        // ── Saved Searches ───────────────────────────────────────────
        savedSearchRepository.save(SavedSearch.builder()
                .user(charlie).name("Ponttor unter 650€")
                .filterJson("{\"city\":\"Aachen\",\"district\":\"Ponttor\",\"maxRent\":650,\"furnished\":true}")
                .isActive(true).matchCount(0).build());

        savedSearchRepository.save(SavedSearch.builder()
                .user(diana).name("WG-Zimmer Aachen")
                .filterJson("{\"city\":\"Aachen\",\"maxRent\":400,\"minBedrooms\":1,\"petFriendly\":true}")
                .isActive(true).matchCount(0).build());

        log.info("  ✓ 2 saved searches created");

        // ── Reviews ──────────────────────────────────────────────────
        apartmentReviewRepository.save(ApartmentReview.builder()
                .apartment(ponttor).reviewer(charlie).rating(5)
                .title("Perfekte Lage für Studenten")
                .comment("Die Wohnung liegt direkt am Ponttor – man ist in 5 Minuten an der RWTH. "
                        + "Die Vermieterin ist sehr freundlich und reagiert schnell.")
                .pros("Lage, Ausstattung, freundliche Vermieterin")
                .cons("Etwas laut am Wochenende wegen der Pontstraße")
                .wouldRecommend(true).landlordRating(5).locationRating(5).valueRating(4)
                .status(ApartmentReview.ReviewStatus.APPROVED)
                .moderatedBy(admin).moderatedAt(Instant.parse("2025-12-01T10:00:00Z"))
                .moderationNotes("Approved – genuine review.").build());

        apartmentReviewRepository.save(ApartmentReview.builder()
                .apartment(ponttor).reviewer(diana).rating(4)
                .title("Sehr schöne Wohnung")
                .comment("Meine Freundin hat hier gewohnt. Tolle Einbauküche und netter Innenhof.")
                .pros("Küche, Innenhof").cons("Kein Aufzug, 3. Stock")
                .wouldRecommend(true).landlordRating(4).locationRating(5).valueRating(4)
                .status(ApartmentReview.ReviewStatus.APPROVED)
                .moderatedBy(admin).moderatedAt(Instant.parse("2025-12-02T09:00:00Z")).build());

        apartmentReviewRepository.save(ApartmentReview.builder()
                .apartment(wgZimmer).reviewer(charlie).rating(4)
                .title("Gute WG, nette Mitbewohner")
                .comment("Ich habe mich bei der Besichtigung direkt wohlgefühlt. "
                        + "Die Mitbewohner sind entspannt und das Zimmer ist okay für den Preis.")
                .pros("Mitbewohner, Nähe zum IZ, Preis").cons("Zimmer ist etwas klein")
                .wouldRecommend(true).landlordRating(4).locationRating(5).valueRating(4)
                .status(ApartmentReview.ReviewStatus.PENDING).build());

        log.info("  ✓ 3 reviews created");

        // ── Favorites ────────────────────────────────────────────────
        userFavoriteRepository.save(UserFavorite.builder().user(charlie).apartment(ponttor).build());
        userFavoriteRepository.save(UserFavorite.builder().user(charlie).apartment(wgZimmer).build());
        userFavoriteRepository.save(UserFavorite.builder().user(diana).apartment(wgZimmer).build());
        userFavoriteRepository.save(UserFavorite.builder().user(erik).apartment(lousberg).build());
        userFavoriteRepository.save(UserFavorite.builder().user(diana).apartment(mitte).build());

        log.info("  ✓ 5 favorites created");

        // ── Notifications ────────────────────────────────────────────
        notificationRepository.save(Notification.builder()
                .user(charlie).type(Notification.NotificationType.VIEWING_APPROVED)
                .title("Besichtigungstermin bestätigt")
                .message("Ihr Termin für \"Gemütliche 2-Zimmer-Wohnung am Ponttor\" wurde bestätigt: Sa 16. Nov, 14:00 Uhr.")
                .relatedEntityType("VIEWING_REQUEST").relatedEntityId(1L)
                .readAt(Instant.parse("2025-11-12T10:00:00Z"))
                .actionUrl("/viewings/1").priority(Notification.NotificationPriority.HIGH)
                .expiresAt(Instant.parse("2025-11-17T00:00:00Z")).build());

        notificationRepository.save(Notification.builder()
                .user(alice).type(Notification.NotificationType.VIEWING_REQUEST)
                .title("Neue Besichtigungsanfrage")
                .message("Charlie Weber möchte Ihre Wohnung \"Gemütliche 2-Zimmer-Wohnung am Ponttor\" besichtigen.")
                .relatedEntityType("VIEWING_REQUEST").relatedEntityId(1L)
                .readAt(Instant.parse("2025-11-10T15:00:00Z"))
                .actionUrl("/viewings/1").priority(Notification.NotificationPriority.NORMAL).build());

        notificationRepository.save(Notification.builder()
                .user(alice).type(Notification.NotificationType.NEW_MESSAGE)
                .title("Neue Nachricht von Erik Braun")
                .message("Erik Braun hat Ihnen eine Nachricht zum \"Helles Studio am Lousberg\" geschrieben.")
                .relatedEntityType("CONVERSATION").relatedEntityId(conv3.getId())
                .actionUrl("/messages/" + conv3.getId())
                .priority(Notification.NotificationPriority.NORMAL).build());

        notificationRepository.save(Notification.builder()
                .user(admin).type(Notification.NotificationType.SYSTEM_ANNOUNCEMENT)
                .title("Willkommen bei SichrPlace")
                .message("Das MSSQL-Beta-System wurde erfolgreich eingerichtet. Alle Seed-Daten sind geladen.")
                .actionUrl("/").priority(Notification.NotificationPriority.LOW)
                .expiresAt(Instant.parse("2026-06-01T00:00:00Z")).build());

        notificationRepository.save(Notification.builder()
                .user(diana).type(Notification.NotificationType.FAVORITE_APARTMENT_UPDATED)
                .title("Aktualisierung einer Merkliste")
                .message("Die Wohnung \"Moderne 1-Zimmer-Wohnung Aachen Mitte\" hat neue Informationen.")
                .relatedEntityType("APARTMENT").relatedEntityId(mitte.getId())
                .actionUrl("/apartments/" + mitte.getId())
                .priority(Notification.NotificationPriority.NORMAL).build());

        log.info("  ✓ 5 notifications created");

        log.info("═══════════════════════════════════════════════════════");
        log.info("  SichrPlace workplace seed complete! (11 tables)");
        log.info("  Login with any seed account: password123");
        log.info("═══════════════════════════════════════════════════════");
    }

    // ── Helper ───────────────────────────────────────────────────────

    private void saveMsg(Conversation conv, User sender, String content,
                         boolean read, String readAtStr, String createdAtStr) {
        Message.MessageBuilder builder = Message.builder()
                .conversation(conv).sender(sender).content(content)
                .messageType(Message.MessageType.TEXT)
                .readByRecipient(read).isDeleted(false);
        if (readAtStr != null) {
            builder.readAt(Instant.parse(readAtStr));
        }
        // Note: createdAt is managed by @CreatedDate / AuditingEntityListener,
        // so we don't set it manually here.  The audit timestamp will reflect
        // the moment the seed runs, which is acceptable for dev/teaching.
        messageRepository.save(builder.build());
    }
}
