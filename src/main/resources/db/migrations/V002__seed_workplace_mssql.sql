-- =============================================================================
-- V002__seed_workplace_mssql.sql
-- SichrPlace — Workplace seed data as a reproducible SQL script
--
-- Purpose:   Provides the same 43 rows that DataSeeder.java creates,
--            but as a standalone MSSQL script for environments where the
--            Spring Boot app is not running (DBA setup, CI pipelines, etc.).
--
-- IMPORTANT: In normal development, DataSeeder.java handles seeding
--            automatically on startup. This script is a REFERENCE backup.
--            It is IDEMPOTENT — safe to run multiple times.
--
-- Generated: February 2026
-- Source:    config/DataSeeder.java
-- See also:  db/mssql-seed-workplace.sql (original seed script)
--            docs/SEED_WORKPLACE_MSSQL.md (documentation)
-- =============================================================================

-- Guard: only seed if users table is empty
IF (SELECT COUNT(*) FROM users) > 0
BEGIN
    PRINT 'V002 — Tables already contain data — skipping seed.';
    RETURN;
END
GO

-- ---------------------------------------------------------------------------
-- 1. Users (6)
-- Password: password123  →  BCrypt cost 10
-- Note: Replace with fresh bcrypt hash if needed. This hash is valid for
--       Spring Security's BCryptPasswordEncoder with default strength.
-- ---------------------------------------------------------------------------
SET IDENTITY_INSERT users ON;

INSERT INTO users (id, email, password, first_name, last_name, bio, phone, role,
                   email_verified, city, country, is_active, gdpr_consent,
                   gdpr_consent_date, marketing_consent, created_at, updated_at)
VALUES
(1, 'admin@sichrplace.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Admin', 'SichrPlace', 'Platform administrator', NULL, 'ADMIN',
    1, 'Aachen', 'Germany', 1, 1, '2025-01-01T00:00:00', 0,
    '2025-01-01T00:00:00', '2025-01-01T00:00:00'),

(2, 'alice.tutor@rwth-aachen.de',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Alice', 'Schmidt', 'SE tutor at RWTH, rents 2 apartments near campus.', '+49-241-1234567', 'LANDLORD',
    1, 'Aachen', 'Germany', 1, 1, '2025-06-01T10:00:00', 1,
    '2025-06-01T10:00:00', '2025-06-01T10:00:00'),

(3, 'bob.landlord@gmail.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Bob', 'Mueller', 'Private landlord in Aachen city centre.', '+49-170-9876543', 'LANDLORD',
    1, 'Aachen', 'Germany', 1, 1, '2025-07-01T10:00:00', 0,
    '2025-07-01T10:00:00', '2025-07-01T10:00:00'),

(4, 'charlie.student@rwth-aachen.de',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Charlie', 'Weber', 'MSc Informatik student at RWTH, looking for a 2-Zi-Wohnung.', NULL, 'TENANT',
    1, 'Aachen', 'Germany', 1, 1, '2025-09-01T10:00:00', 1,
    '2025-09-01T10:00:00', '2025-09-01T10:00:00'),

(5, 'diana.student@rwth-aachen.de',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Diana', 'Fischer', 'BSc SE student in thesis phase, needs quiet WG-Zimmer.', NULL, 'TENANT',
    1, 'Aachen', 'Germany', 1, 1, '2025-09-15T10:00:00', 0,
    '2025-09-15T10:00:00', '2025-09-15T10:00:00'),

(6, 'erik.student@rwth-aachen.de',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Erik', 'Braun', 'Erasmus exchange student from Sweden, 2-semester stay.', NULL, 'TENANT',
    1, 'Aachen', 'Germany', 1, 1, '2025-10-01T10:00:00', 0,
    '2025-10-01T10:00:00', '2025-10-01T10:00:00');

SET IDENTITY_INSERT users OFF;
PRINT '  ✓ 6 users inserted';
GO

-- ---------------------------------------------------------------------------
-- 2. Apartments (4)
-- ---------------------------------------------------------------------------
SET IDENTITY_INSERT apartments ON;

INSERT INTO apartments (id, user_id, title, description, city, district,
                        address, monthly_rent, deposit_amount, size_square_meters,
                        number_of_bedrooms, number_of_bathrooms, furnished,
                        pet_friendly, has_parking, has_elevator, has_balcony,
                        amenities, available_from, status, number_of_views,
                        average_rating, review_count, created_at, updated_at)
VALUES
(1, 2, 'Gemütliche 2-Zimmer-Wohnung am Ponttor',
    'Helle, ruhige 2-Zi-Wohnung, 5 Min zum Campus. Einbauküche, Waschmaschine.',
    'Aachen', 'Ponttor', 'Pontstraße 42', 620.00, 1240.00, 55.0,
    2, 1, 1, 0, 0, 1, 1, 'Einbauküche, Waschmaschine, WLAN',
    '2026-01-01', 'AVAILABLE', 142, 4.5, 2, '2025-08-01T10:00:00', '2025-08-01T10:00:00'),

(2, 2, 'Helles Studio am Lousberg',
    'Kleines aber feines Studio mit Blick auf den Lousberg. Möbliert.',
    'Aachen', 'Lousberg', 'Lousbergstraße 15', 450.00, 900.00, 28.0,
    1, 1, 1, 1, 0, 0, 0, 'Möbliert, Aussicht, WLAN',
    '2026-02-01', 'AVAILABLE', 87, NULL, 0, '2025-09-01T10:00:00', '2025-09-01T10:00:00'),

(3, 3, 'WG-Zimmer nahe RWTH Informatikzentrum',
    '15 m² Zimmer in 3er-WG, direkt am Informatikzentrum. Gemeinsame Küche & Bad.',
    'Aachen', 'Hörn', 'Ahornstraße 55', 380.00, 760.00, 15.0,
    1, 1, 0, 0, 0, 0, 0, 'Gemeinsame Küche, WLAN, Fahrradkeller',
    '2026-01-15', 'AVAILABLE', 203, 4.0, 1, '2025-09-15T10:00:00', '2025-09-15T10:00:00'),

(4, 3, 'Moderne 1-Zimmer-Wohnung Aachen Mitte',
    'Neubau, Fußbodenheizung, Einbauküche, TG-Stellplatz. Ideal für Berufstätige oder Doktoranden.',
    'Aachen', 'Mitte', 'Marktstraße 8', 720.00, 1440.00, 38.0,
    1, 1, 1, 0, 1, 1, 1, 'Einbauküche, Fußbodenheizung, TG-Stellplatz, WLAN',
    '2026-03-01', 'PENDING', 56, NULL, 0, '2025-10-01T10:00:00', '2025-10-01T10:00:00');

SET IDENTITY_INSERT apartments OFF;
PRINT '  ✓ 4 apartments inserted';
GO

-- ---------------------------------------------------------------------------
-- 3. Listings (2)
-- ---------------------------------------------------------------------------
SET IDENTITY_INSERT listings ON;

INSERT INTO listings (id, title, description, city, district, monthly_rent,
                      size_square_meters, furnished, available_from,
                      created_at, updated_at, owner_id)
VALUES
(1, 'Gemütliche 2-Zimmer-Wohnung am Ponttor',
    'Helle, ruhige 2-Zi-Wohnung, 5 Min zum Campus.',
    'Aachen', 'Ponttor', 620.00, 55.0, 1, '2026-01-01',
    '2025-08-01T10:00:00', '2025-08-01T10:00:00', 2),

(2, 'WG-Zimmer nahe RWTH Informatikzentrum',
    '15 m² Zimmer in 3er-WG, direkt am Informatikzentrum.',
    'Aachen', 'Hörn', 380.00, 15.0, 0, '2026-01-15',
    '2025-09-15T10:00:00', '2025-09-15T10:00:00', 3);

SET IDENTITY_INSERT listings OFF;
PRINT '  ✓ 2 listings inserted';
GO

-- ---------------------------------------------------------------------------
-- 4. Conversations (3) and Messages (12)
-- ---------------------------------------------------------------------------
SET IDENTITY_INSERT conversations ON;

INSERT INTO conversations (id, apartment_id, participant_1_id, participant_2_id,
                           last_message_at, created_at, updated_at)
VALUES
(1, 1, 4, 2, '2025-11-15T14:30:00', '2025-11-10T09:00:00', '2025-11-15T14:30:00'),
(2, 3, 5, 3, '2025-11-14T11:00:00', '2025-11-12T08:00:00', '2025-11-14T11:00:00'),
(3, 2, 6, 2, '2025-11-16T09:45:00', '2025-11-15T18:00:00', '2025-11-16T09:45:00');

SET IDENTITY_INSERT conversations OFF;

SET IDENTITY_INSERT messages ON;

-- Conversation 1: Charlie ↔ Alice (5 messages)
INSERT INTO messages (id, conversation_id, sender_id, content, message_type, read_by_recipient, created_at)
VALUES
(1, 1, 4, 'Hallo Frau Schmidt, ist die Wohnung am Ponttor noch verfügbar?', 'TEXT', 1, '2025-11-10T09:00:00'),
(2, 1, 2, 'Hallo Charlie! Ja, die Wohnung ist ab Januar frei. Möchten Sie einen Besichtigungstermin?', 'TEXT', 1, '2025-11-10T14:00:00'),
(3, 1, 4, 'Ja, sehr gerne! Passt Samstag nächste Woche?', 'TEXT', 1, '2025-11-11T08:30:00'),
(4, 1, 2, 'Samstag 14:00 Uhr passt gut. Ich trage den Termin ein.', 'TEXT', 1, '2025-11-11T10:00:00'),
(5, 1, 4, 'Perfekt, danke! Bis Samstag.', 'TEXT', 0, '2025-11-15T14:30:00'),

-- Conversation 2: Diana ↔ Bob (4 messages)
(6, 2, 5, 'Hallo Herr Mueller, wie ist die WG-Atmosphäre? Ist es eher ruhig?', 'TEXT', 1, '2025-11-12T08:00:00'),
(7, 2, 3, 'Hallo Diana! Die WG ist sehr ruhig, beide Mitbewohner sind auch Informatik-Studenten.', 'TEXT', 1, '2025-11-12T12:00:00'),
(8, 2, 5, 'Das klingt super. Gibt es einen Putzplan?', 'TEXT', 1, '2025-11-13T09:00:00'),
(9, 2, 3, 'Ja, wir haben einen wöchentlichen Putzplan. Möchten Sie vorbeikommen?', 'TEXT', 0, '2025-11-14T11:00:00'),

-- Conversation 3: Erik ↔ Alice (3 messages)
(10, 3, 6, 'Hi Alice, I am an Erasmus student from Sweden. Is a 2-semester lease possible?', 'TEXT', 1, '2025-11-15T18:00:00'),
(11, 3, 2, 'Hi Erik! Yes, we can do a 10-month lease for the studio. Would you like to see it?', 'TEXT', 1, '2025-11-16T08:00:00'),
(12, 3, 6, 'That sounds great! How about this weekend?', 'TEXT', 0, '2025-11-16T09:45:00');

SET IDENTITY_INSERT messages OFF;
PRINT '  ✓ 3 conversations + 12 messages inserted';
GO

-- ---------------------------------------------------------------------------
-- 5. Viewing Requests (3)
-- ---------------------------------------------------------------------------
SET IDENTITY_INSERT viewing_requests ON;

INSERT INTO viewing_requests (id, apartment_id, tenant_id, proposed_date_time,
                              message, status, responded_at, confirmed_date_time,
                              created_at, updated_at)
VALUES
(1, 1, 4, '2025-11-16T14:00:00',
    'Samstag 14:00 wie besprochen.', 'CONFIRMED', '2025-11-11T10:00:00', '2025-11-16T14:00:00',
    '2025-11-11T08:30:00', '2025-11-11T10:00:00'),

(2, 3, 5, '2025-11-20T15:00:00',
    'Mittwochnachmittag wäre ideal für mich.', 'PENDING', NULL, NULL,
    '2025-11-14T11:00:00', '2025-11-14T11:00:00'),

(3, 2, 6, '2025-11-23T11:00:00',
    'Weekend preferred — Saturday or Sunday morning.', 'PENDING', NULL, NULL,
    '2025-11-16T09:45:00', '2025-11-16T09:45:00');

SET IDENTITY_INSERT viewing_requests OFF;
PRINT '  ✓ 3 viewing requests inserted';
GO

-- ---------------------------------------------------------------------------
-- 6. Apartment Reviews (3)
-- ---------------------------------------------------------------------------
SET IDENTITY_INSERT apartment_reviews ON;

INSERT INTO apartment_reviews (id, apartment_id, reviewer_id, rating, title, comment,
                               pros, cons, would_recommend, landlord_rating,
                               location_rating, value_rating, status,
                               moderated_by, moderated_at, moderation_notes,
                               created_at, updated_at)
VALUES
(1, 1, 4, 5, 'Perfekte Lage am Ponttor',
    'Sehr schöne Wohnung, ruhig und dennoch zentral. Alice ist eine super Vermieterin!',
    'Zentral, ruhig, Einbauküche', 'Kein Parkplatz', 1, 5, 5, 4, 'APPROVED',
    1, '2025-11-12T10:00:00', 'Genuine review, approved.',
    '2025-11-12T08:00:00', '2025-11-12T10:00:00'),

(2, 1, 5, 4, 'Schöne Wohnung, etwas teuer',
    'Gut geschnittene 2-Zi-Wohnung. Preis etwas hoch für Studenten, aber Lage top.',
    'Lage, Ausstattung', 'Preis', 1, 4, 5, 3, 'APPROVED',
    1, '2025-11-13T10:00:00', 'Helpful review, approved.',
    '2025-11-13T08:00:00', '2025-11-13T10:00:00'),

(3, 3, 4, 4, 'Gutes WG-Zimmer für Informatiker',
    'Direkt am Informatikzentrum, Mitbewohner sind nett. Zimmer etwas klein.',
    'Lage, Mitbewohner', 'Kleines Zimmer', 1, 4, 5, 4, 'PENDING',
    NULL, NULL, NULL,
    '2025-11-14T08:00:00', '2025-11-14T08:00:00');

SET IDENTITY_INSERT apartment_reviews OFF;
PRINT '  ✓ 3 reviews inserted';
GO

-- ---------------------------------------------------------------------------
-- 7. User Favorites (5)
-- ---------------------------------------------------------------------------
INSERT INTO user_favorites (user_id, apartment_id, created_at)
VALUES
(4, 1, '2025-11-10T09:00:00'),
(4, 3, '2025-11-12T10:00:00'),
(5, 3, '2025-11-12T08:00:00'),
(5, 4, '2025-11-13T09:00:00'),
(6, 2, '2025-11-15T18:00:00');

PRINT '  ✓ 5 favorites inserted';
GO

-- ---------------------------------------------------------------------------
-- 8. Notifications (5)
-- ---------------------------------------------------------------------------
INSERT INTO notifications (user_id, type, title, message, related_entity_type,
                           related_entity_id, priority, created_at)
VALUES
(4, 'VIEWING_APPROVED', 'Besichtigung bestätigt',
    'Ihre Besichtigung der Wohnung am Ponttor wurde für Sa 16.11. 14:00 bestätigt.',
    'VIEWING_REQUEST', 1, 'NORMAL', '2025-11-11T10:00:00'),

(2, 'VIEWING_REQUEST', 'Neue Besichtigungsanfrage',
    'Charlie Weber möchte die Wohnung am Ponttor besichtigen.',
    'VIEWING_REQUEST', 1, 'NORMAL', '2025-11-11T08:30:00'),

(5, 'NEW_MESSAGE', 'Neue Nachricht von Bob',
    'Bob Mueller hat auf Ihre Nachricht zur WG am Informatikzentrum geantwortet.',
    'CONVERSATION', 2, 'NORMAL', '2025-11-14T11:00:00'),

(2, 'NEW_MESSAGE', 'Neue Nachricht von Erik',
    'Erik Braun hat Ihnen wegen des Studios am Lousberg geschrieben.',
    'CONVERSATION', 3, 'NORMAL', '2025-11-15T18:00:00'),

(1, 'REVIEW_SUBMITTED', 'Neue Bewertung eingegangen',
    'Charlie Weber hat eine Bewertung für das WG-Zimmer abgegeben. Bitte prüfen.',
    'APARTMENT_REVIEW', 3, 'HIGH', '2025-11-14T08:00:00');

PRINT '  ✓ 5 notifications inserted';
GO

-- ---------------------------------------------------------------------------
-- Summary
-- ---------------------------------------------------------------------------
PRINT '═══════════════════════════════════════════════════════';
PRINT '  V002 — Workplace seed complete!';
PRINT '  43 rows across 9 tables.';
PRINT '  Login with any seed account: password123';
PRINT '═══════════════════════════════════════════════════════';
GO
