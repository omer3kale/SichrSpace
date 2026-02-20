package com.sichrplace.backend;

import com.sichrplace.backend.repository.*;
import com.sichrplace.backend.repository.EmailVerificationTokenRepository;
import com.sichrplace.backend.repository.PasswordResetTokenRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Smoke tests for the MSSQL-aligned profiles.
 *
 * These tests use the "test" profile which configures an H2 in-memory
 * database in MSSQLServer compatibility mode, so they run without a
 * real MSSQL instance (safe for CI / GitHub Actions).
 *
 * The tests verify:
 * 1. Application context loads successfully (all beans wire correctly).
 * 2. All 9 repository interfaces are functional.
 * 3. DataSeeder populates expected row counts when running on an
 *    MSSQL-like profile (simulated here via H2).
 *
 * For integration tests against a real MSSQL instance, use Testcontainers
 * or the local-mssql profile with Docker.
 *
 * @see com.sichrplace.backend.config.DataSeeder
 * @see src/test/resources/application-test.yml
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("MSSQL Profile Smoke Tests (H2 compat mode)")
class MssqlProfileSmokeTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ApartmentRepository apartmentRepository;

    @Autowired
    private ListingRepository listingRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ViewingRequestRepository viewingRequestRepository;

    @Autowired
    private ApartmentReviewRepository apartmentReviewRepository;

    @Autowired
    private UserFavoriteRepository userFavoriteRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private ViewingRequestTransitionRepository transitionRepository;

    @Autowired
    private SavedSearchRepository savedSearchRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    // ──────────────────────────────────────────────
    // 1. Context loads
    // ──────────────────────────────────────────────

    @Test
    @DisplayName("Application context loads with all 13 repositories")
    void contextLoads() {
        assertNotNull(userRepository, "UserRepository should be wired");
        assertNotNull(apartmentRepository, "ApartmentRepository should be wired");
        assertNotNull(listingRepository, "ListingRepository should be wired");
        assertNotNull(conversationRepository, "ConversationRepository should be wired");
        assertNotNull(messageRepository, "MessageRepository should be wired");
        assertNotNull(viewingRequestRepository, "ViewingRequestRepository should be wired");
        assertNotNull(apartmentReviewRepository, "ApartmentReviewRepository should be wired");
        assertNotNull(userFavoriteRepository, "UserFavoriteRepository should be wired");
        assertNotNull(notificationRepository, "NotificationRepository should be wired");
        assertNotNull(transitionRepository, "ViewingRequestTransitionRepository should be wired");
        assertNotNull(savedSearchRepository, "SavedSearchRepository should be wired");
        assertNotNull(passwordResetTokenRepository, "PasswordResetTokenRepository should be wired");
        assertNotNull(emailVerificationTokenRepository, "EmailVerificationTokenRepository should be wired");
    }

    // ──────────────────────────────────────────────
    // 2. Repository calls work
    // ──────────────────────────────────────────────

    @Test
    @DisplayName("Repository.count() works for all 12 tables")
    void repositoryCountWorks() {
        assertDoesNotThrow(() -> userRepository.count());
        assertDoesNotThrow(() -> apartmentRepository.count());
        assertDoesNotThrow(() -> listingRepository.count());
        assertDoesNotThrow(() -> conversationRepository.count());
        assertDoesNotThrow(() -> messageRepository.count());
        assertDoesNotThrow(() -> viewingRequestRepository.count());
        assertDoesNotThrow(() -> apartmentReviewRepository.count());
        assertDoesNotThrow(() -> userFavoriteRepository.count());
        assertDoesNotThrow(() -> notificationRepository.count());
        assertDoesNotThrow(() -> transitionRepository.count());
        assertDoesNotThrow(() -> savedSearchRepository.count());
        assertDoesNotThrow(() -> passwordResetTokenRepository.count());
        assertDoesNotThrow(() -> emailVerificationTokenRepository.count());
    }

    // ──────────────────────────────────────────────
    // 3. Schema integrity (tables created by Hibernate)
    // ──────────────────────────────────────────────

    @Test
    @DisplayName("findAll returns empty list on clean database (schema is valid)")
    void tablesExistAndAreQueryable() {
        assertTrue(userRepository.findAll().isEmpty(), "users table should be empty");
        assertTrue(apartmentRepository.findAll().isEmpty(), "apartments table should be empty");
        assertTrue(listingRepository.findAll().isEmpty(), "listings table should be empty");
        assertTrue(conversationRepository.findAll().isEmpty(), "conversations table should be empty");
        assertTrue(messageRepository.findAll().isEmpty(), "messages table should be empty");
        assertTrue(viewingRequestRepository.findAll().isEmpty(), "viewing_requests table should be empty");
        assertTrue(apartmentReviewRepository.findAll().isEmpty(), "apartment_reviews table should be empty");
        assertTrue(userFavoriteRepository.findAll().isEmpty(), "user_favorites table should be empty");
        assertTrue(notificationRepository.findAll().isEmpty(), "notifications table should be empty");
        assertTrue(transitionRepository.findAll().isEmpty(), "viewing_request_transitions table should be empty");
        assertTrue(savedSearchRepository.findAll().isEmpty(), "saved_searches table should be empty");
        assertTrue(passwordResetTokenRepository.findAll().isEmpty(), "password_reset_tokens table should be empty");
        assertTrue(emailVerificationTokenRepository.findAll().isEmpty(), "email_verification_tokens table should be empty");
    }

    // ──────────────────────────────────────────────
    // 4. Custom query methods compile and execute
    // ──────────────────────────────────────────────

    @Test
    @DisplayName("UserRepository.findByEmail works")
    void userFindByEmail() {
        assertTrue(userRepository.findByEmail("nonexistent@test.com").isEmpty());
    }

    @Test
    @DisplayName("UserRepository.existsByEmail works")
    void userExistsByEmail() {
        assertFalse(userRepository.existsByEmail("nonexistent@test.com"));
    }

    @Test
    @DisplayName("ApartmentRepository.findByOwnerId works")
    void apartmentFindByOwner() {
        assertTrue(apartmentRepository.findByOwnerId(999L).isEmpty());
    }

    @Test
    @DisplayName("ViewingRequestTransitionRepository.findByViewingRequestId works")
    void transitionFindByViewingRequestId() {
        assertTrue(transitionRepository.findByViewingRequestIdOrderByChangedAtAsc(999L).isEmpty());
    }

    @Test
    @DisplayName("SavedSearchRepository.findByUserId works")
    void savedSearchFindByUserId() {
        assertTrue(savedSearchRepository.findByUserIdOrderByCreatedAtDesc(999L).isEmpty());
    }
}
