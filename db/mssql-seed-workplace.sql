-- ══════════════════════════════════════════════════════════════════════
-- SichrPlace – MSSQL Workplace Seed Data
-- ══════════════════════════════════════════════════════════════════════
-- Target:  sichrplace database on MSSQL 2025 (local or droplet)
-- Purpose: Populate a realistic but fully synthetic "workplace" for
--          development, teaching labs, and the SE tutorium.
--
-- Password for ALL seed users: password123
-- BCrypt hash ($2a$10, cost 10) pre-computed below.
--
-- Usage (manual):
--   docker exec -it sichrplace-mssql /opt/mssql-tools18/bin/sqlcmd \
--     -S localhost -U sichrplace_user -P "<MSSQL_APP_PASSWORD>" \
--     -d sichrplace -C -i /opt/sichrplace/seed.sql
--
-- ⚠ This script is IDEMPOTENT: it checks whether users already exist
--   before inserting.  Re-running it on a populated DB is safe.
-- ══════════════════════════════════════════════════════════════════════

USE sichrplace;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Guard: skip everything if seed data already present
IF EXISTS (SELECT 1 FROM users WHERE email = 'admin@sichrplace.com')
BEGIN
    PRINT '⚠ Seed data already present – skipping.';
    -- Return early (the rest of the script is inside the ELSE block)
END
ELSE
BEGIN
    PRINT '▶ Inserting SichrPlace workplace seed data …';

    -- ── 1. USERS ─────────────────────────────────────────────────────
    -- Password for all accounts: password123
    -- BCrypt($2a$10): $2a$10$G7DfeYTW6JoE.v0jqPFzoe7TGw0wNXYAINfn3UxhAxtp82jCvfYia
    SET IDENTITY_INSERT users ON;

    INSERT INTO users (id, email, password, first_name, last_name, bio, phone, role,
                       email_verified, profile_image_url, city, country,
                       is_active, gdpr_consent, gdpr_consent_date,
                       marketing_consent, created_at, updated_at)
    VALUES
    -- Admin
    (1, 'admin@sichrplace.com',
     '$2a$10$G7DfeYTW6JoE.v0jqPFzoe7TGw0wNXYAINfn3UxhAxtp82jCvfYia',
     'Admin', 'SichrPlace',
     'Platform administrator for SichrPlace.', NULL, 'ADMIN',
     1, NULL, 'Aachen', 'Germany',
     1, 1, '2025-09-01T00:00:00Z', 0,
     '2025-09-01T00:00:00Z', '2025-09-01T00:00:00Z'),

    -- Tutor / Landlord 1
    (2, 'alice.tutor@rwth-aachen.de',
     '$2a$10$G7DfeYTW6JoE.v0jqPFzoe7TGw0wNXYAINfn3UxhAxtp82jCvfYia',
     'Alice', 'Schmidt',
     'SE tutor at RWTH Aachen. Rents two apartments near the university.',
     '+49 241 555 0001', 'LANDLORD',
     1, NULL, 'Aachen', 'Germany',
     1, 1, '2025-09-15T10:00:00Z', 0,
     '2025-09-15T10:00:00Z', '2025-09-15T10:00:00Z'),

    -- Landlord 2
    (3, 'bob.landlord@gmail.com',
     '$2a$10$G7DfeYTW6JoE.v0jqPFzoe7TGw0wNXYAINfn3UxhAxtp82jCvfYia',
     'Bob', 'Mueller',
     'Private landlord offering student housing in Aachen city centre.',
     '+49 241 555 0002', 'LANDLORD',
     1, NULL, 'Aachen', 'Germany',
     1, 1, '2025-10-01T08:00:00Z', 0,
     '2025-10-01T08:00:00Z', '2025-10-01T08:00:00Z'),

    -- Student / Tenant 1
    (4, 'charlie.student@rwth-aachen.de',
     '$2a$10$G7DfeYTW6JoE.v0jqPFzoe7TGw0wNXYAINfn3UxhAxtp82jCvfYia',
     'Charlie', 'Weber',
     'MSc Informatik student at RWTH, looking for a flat near campus.',
     '+49 176 555 1001', 'TENANT',
     1, NULL, 'Aachen', 'Germany',
     1, 1, '2025-10-05T14:00:00Z', 1,
     '2025-10-05T14:00:00Z', '2025-10-05T14:00:00Z'),

    -- Student / Tenant 2
    (5, 'diana.student@rwth-aachen.de',
     '$2a$10$G7DfeYTW6JoE.v0jqPFzoe7TGw0wNXYAINfn3UxhAxtp82jCvfYia',
     'Diana', 'Fischer',
     'BSc SE student starting her thesis.  Searching for a quiet WG-Zimmer.',
     '+49 176 555 1002', 'TENANT',
     1, NULL, 'Aachen', 'Germany',
     1, 1, '2025-10-06T09:30:00Z', 0,
     '2025-10-06T09:30:00Z', '2025-10-06T09:30:00Z'),

    -- Student / Tenant 3
    (6, 'erik.student@rwth-aachen.de',
     '$2a$10$G7DfeYTW6JoE.v0jqPFzoe7TGw0wNXYAINfn3UxhAxtp82jCvfYia',
     'Erik', 'Braun',
     'Erasmus exchange student from Sweden, here for two semesters.',
     '+49 176 555 1003', 'TENANT',
     0, NULL, 'Aachen', 'Germany',
     1, 1, '2025-10-10T16:00:00Z', 1,
     '2025-10-10T16:00:00Z', '2025-10-10T16:00:00Z');

    SET IDENTITY_INSERT users OFF;
    PRINT '  ✓ 6 users inserted (1 admin, 2 landlords, 3 tenants)';

    -- ── 2. APARTMENTS ────────────────────────────────────────────────
    SET IDENTITY_INSERT apartments ON;

    INSERT INTO apartments (id, user_id, title, description, city, district, address,
                            latitude, longitude, monthly_rent, deposit_amount,
                            size_square_meters, number_of_bedrooms, number_of_bathrooms,
                            furnished, pet_friendly, has_parking, has_elevator,
                            has_balcony, amenities, available_from, status,
                            number_of_views, average_rating, review_count,
                            created_at, updated_at)
    VALUES
    (1, 2, 'Gemütliche 2-Zimmer-Wohnung am Ponttor',
     'Helle, renovierte Wohnung direkt am Ponttor, 5 Min. zur RWTH.  '
     + 'Einbauküche, Holzdielen, ruhiger Innenhof.',
     'Aachen', 'Ponttor', 'Pontstraße 42',
     50.7780, 6.0780, 620.00, 1240.00,
     55.0, 2, 1,
     1, 0, 0, 1, 1,
     'WiFi, Waschmaschine, Einbauküche, Keller',
     '2026-04-01', 'AVAILABLE',
     87, 4.5, 2,
     '2025-10-20T12:00:00Z', '2025-10-20T12:00:00Z'),

    (2, 2, 'Helles Studio am Lousberg',
     'Kompaktes Apartment mit Blick über Aachen.  '
     + 'Ideal für Einzelpersonen.  Möbliert.',
     'Aachen', 'Lousberg', 'Lousbergstraße 18',
     50.7850, 6.0720, 450.00, 900.00,
     28.0, 1, 1,
     1, 0, 1, 0, 0,
     'WiFi, Möbliert, Stellplatz, Keller',
     '2026-03-01', 'AVAILABLE',
     54, 4.0, 1,
     '2025-10-22T09:00:00Z', '2025-10-22T09:00:00Z'),

    (3, 3, 'WG-Zimmer nahe RWTH Informatikzentrum',
     'Zimmer in einer 3er-WG, nur 3 Gehminuten vom Informatikzentrum.  '
     + 'Großes Wohnzimmer wird geteilt.  Waschmaschine im Keller.',
     'Aachen', 'Hörn', 'Ahornstraße 17',
     50.7795, 6.0610, 380.00, 760.00,
     16.0, 1, 1,
     0, 1, 0, 0, 0,
     'WiFi, Gemeinschaftsküche, Waschmaschine',
     '2026-02-15', 'AVAILABLE',
     112, 3.8, 3,
     '2025-11-01T14:30:00Z', '2025-11-01T14:30:00Z'),

    (4, 3, 'Moderne 1-Zimmer-Wohnung Aachen Mitte',
     'Neubau-Apartment im Stadtzentrum, barrierefrei.  '
     + 'Fußbodenheizung, Einbauküche, TG-Stellplatz optional.',
     'Aachen', 'Mitte', 'Markt 5',
     50.7753, 6.0839, 720.00, 1440.00,
     38.0, 1, 1,
     1, 0, 1, 1, 1,
     'WiFi, Einbauküche, Fußbodenheizung, Tiefgarage, Balkon',
     '2026-05-01', 'PENDING',
     23, NULL, 0,
     '2025-12-01T11:00:00Z', '2025-12-01T11:00:00Z');

    SET IDENTITY_INSERT apartments OFF;
    PRINT '  ✓ 4 apartments inserted (2 per landlord)';

    -- ── 3. LISTINGS ──────────────────────────────────────────────────
    SET IDENTITY_INSERT listings ON;

    INSERT INTO listings (id, title, description, city, district, monthly_rent,
                          size_square_meters, furnished, available_from,
                          created_at, updated_at, owner_id)
    VALUES
    (1, 'Gemütliche 2-Zimmer-Wohnung am Ponttor',
     'Helle, renovierte Wohnung direkt am Ponttor.',
     'Aachen', 'Ponttor', 620.00,
     55.0, 1, '2026-04-01',
     '2025-10-20T12:00:00Z', '2025-10-20T12:00:00Z', 2),

    (2, 'WG-Zimmer nahe RWTH Informatikzentrum',
     'Zimmer in einer 3er-WG, 3 Min. zum IZ.',
     'Aachen', 'Hörn', 380.00,
     16.0, 0, '2026-02-15',
     '2025-11-01T14:30:00Z', '2025-11-01T14:30:00Z', 3);

    SET IDENTITY_INSERT listings OFF;
    PRINT '  ✓ 2 listings inserted';

    -- ── 4. CONVERSATIONS ─────────────────────────────────────────────
    SET IDENTITY_INSERT conversations ON;

    INSERT INTO conversations (id, apartment_id, participant_1_id, participant_2_id,
                               last_message_at, created_at, updated_at)
    VALUES
    -- Charlie asks Alice about Ponttor apartment
    (1, 1, 4, 2,
     '2025-11-12T15:45:00Z',
     '2025-11-10T10:00:00Z', '2025-11-12T15:45:00Z'),

    -- Diana asks Bob about WG-Zimmer
    (2, 3, 5, 3,
     '2025-11-15T18:20:00Z',
     '2025-11-13T08:30:00Z', '2025-11-15T18:20:00Z'),

    -- Erik asks Alice about Lousberg studio
    (3, 2, 6, 2,
     '2025-11-18T20:10:00Z',
     '2025-11-16T12:00:00Z', '2025-11-18T20:10:00Z');

    SET IDENTITY_INSERT conversations OFF;
    PRINT '  ✓ 3 conversations inserted';

    -- ── 5. MESSAGES ──────────────────────────────────────────────────
    SET IDENTITY_INSERT messages ON;

    INSERT INTO messages (id, conversation_id, sender_id, content, message_type,
                          read_by_recipient, read_at, is_deleted, created_at)
    VALUES
    -- Conversation 1: Charlie ↔ Alice (Ponttor apartment)
    (1, 1, 4,
     'Hallo Frau Schmidt, ist die Wohnung am Ponttor noch verfügbar? Ich studiere Informatik an der RWTH und suche ab April.',
     'TEXT', 1, '2025-11-10T11:00:00Z', 0, '2025-11-10T10:00:00Z'),

    (2, 1, 2,
     'Hallo Charlie! Ja, die Wohnung ist noch frei. Möchtest du einen Besichtigungstermin vereinbaren?',
     'TEXT', 1, '2025-11-10T14:30:00Z', 0, '2025-11-10T11:15:00Z'),

    (3, 1, 4,
     'Sehr gerne! Passt Samstag um 14 Uhr?',
     'TEXT', 1, '2025-11-11T09:00:00Z', 0, '2025-11-10T14:45:00Z'),

    (4, 1, 2,
     'Perfekt, Samstag 14 Uhr passt mir. Bis dann!',
     'TEXT', 1, '2025-11-12T10:00:00Z', 0, '2025-11-11T09:30:00Z'),

    (5, 1, 4,
     'Danke! Ich freue mich. Muss ich etwas mitbringen?',
     'TEXT', 0, NULL, 0, '2025-11-12T15:45:00Z'),

    -- Conversation 2: Diana ↔ Bob (WG-Zimmer)
    (6, 2, 5,
     'Hi Bob, ich interessiere mich für das WG-Zimmer in der Ahornstraße. Wie ist die WG-Atmosphäre?',
     'TEXT', 1, '2025-11-13T10:00:00Z', 0, '2025-11-13T08:30:00Z'),

    (7, 2, 3,
     'Hi Diana! Die WG ist super – zwei Informatik-Studenten, sehr ruhig unter der Woche, am Wochenende wird auch mal gekocht. Komm gerne vorbei!',
     'TEXT', 1, '2025-11-14T12:00:00Z', 0, '2025-11-13T10:45:00Z'),

    (8, 2, 5,
     'Das klingt toll! Kann ich Mittwoch Nachmittag kommen?',
     'TEXT', 1, '2025-11-15T08:00:00Z', 0, '2025-11-14T14:00:00Z'),

    (9, 2, 3,
     'Mittwoch 15 Uhr? Die anderen Mitbewohner sind dann auch da.',
     'TEXT', 0, NULL, 0, '2025-11-15T18:20:00Z'),

    -- Conversation 3: Erik ↔ Alice (Lousberg studio)
    (10, 3, 6,
     'Hello! I am an Erasmus student from Sweden. Is the studio at Lousberg available for two semesters starting March?',
     'TEXT', 1, '2025-11-16T14:00:00Z', 0, '2025-11-16T12:00:00Z'),

    (11, 3, 2,
     'Hi Erik, welcome to Aachen! Yes, the studio is available from March. The minimum lease is 6 months, so two semesters works perfectly.',
     'TEXT', 1, '2025-11-17T09:00:00Z', 0, '2025-11-16T18:30:00Z'),

    (12, 3, 6,
     'Great! Can I schedule a viewing this weekend?',
     'TEXT', 0, NULL, 0, '2025-11-18T20:10:00Z');

    SET IDENTITY_INSERT messages OFF;
    PRINT '  ✓ 12 messages inserted (3 conversations)';

    -- ── 6. VIEWING REQUESTS ──────────────────────────────────────────
    SET IDENTITY_INSERT viewing_requests ON;

    INSERT INTO viewing_requests (id, apartment_id, tenant_id, proposed_date_time,
                                  message, status, responded_at, confirmed_date_time,
                                  decline_reason, created_at, updated_at)
    VALUES
    -- Charlie viewing Ponttor → confirmed
    (1, 1, 4, '2025-11-16T14:00:00',
     'Ich möchte die Wohnung gerne am Samstag besichtigen.',
     'CONFIRMED', '2025-11-11T09:30:00', '2025-11-16T14:00:00',
     NULL,
     '2025-11-10T14:45:00Z', '2025-11-11T09:30:00Z'),

    -- Diana viewing WG → pending
    (2, 3, 5, '2025-11-20T15:00:00',
     'Mittwoch Nachmittag wäre ideal für mich.',
     'PENDING', NULL, NULL,
     NULL,
     '2025-11-14T14:00:00Z', '2025-11-14T14:00:00Z'),

    -- Erik viewing Lousberg → pending
    (3, 2, 6, '2025-11-23T11:00:00',
     'Weekend viewing if possible, please.',
     'PENDING', NULL, NULL,
     NULL,
     '2025-11-18T20:10:00Z', '2025-11-18T20:10:00Z');

    SET IDENTITY_INSERT viewing_requests OFF;
    PRINT '  ✓ 3 viewing requests inserted (1 confirmed, 2 pending)';

    -- ── 7. APARTMENT REVIEWS ─────────────────────────────────────────
    SET IDENTITY_INSERT apartment_reviews ON;

    INSERT INTO apartment_reviews (id, apartment_id, reviewer_id, rating, title,
                                   comment, pros, cons, would_recommend,
                                   landlord_rating, location_rating, value_rating,
                                   status, moderated_by, moderated_at,
                                   moderation_notes, created_at, updated_at)
    VALUES
    (1, 1, 4, 5, 'Perfekte Lage für Studenten',
     'Die Wohnung liegt direkt am Ponttor – man ist in 5 Minuten an der RWTH. '
     + 'Die Vermieterin ist sehr freundlich und reagiert schnell.',
     'Lage, Ausstattung, freundliche Vermieterin',
     'Etwas laut am Wochenende wegen der Pontstraße',
     1, 5, 5, 4, 'APPROVED', 1,
     '2025-12-01T10:00:00Z', 'Approved – genuine review.',
     '2025-11-28T14:00:00Z', '2025-12-01T10:00:00Z'),

    (2, 1, 5, 4, 'Sehr schöne Wohnung',
     'Meine Freundin hat hier gewohnt. Tolle Einbauküche und netter Innenhof.',
     'Küche, Innenhof',
     'Kein Aufzug, 3. Stock',
     1, 4, 5, 4, 'APPROVED', 1,
     '2025-12-02T09:00:00Z', NULL,
     '2025-12-01T16:00:00Z', '2025-12-02T09:00:00Z'),

    (3, 3, 4, 4, 'Gute WG, nette Mitbewohner',
     'Ich habe mich bei der Besichtigung direkt wohlgefühlt. '
     + 'Die Mitbewohner sind entspannt und das Zimmer ist okay für den Preis.',
     'Mitbewohner, Nähe zum IZ, Preis',
     'Zimmer ist etwas klein',
     1, 4, 5, 4, 'PENDING', NULL,
     NULL, NULL,
     '2025-12-05T11:30:00Z', '2025-12-05T11:30:00Z');

    SET IDENTITY_INSERT apartment_reviews OFF;
    PRINT '  ✓ 3 apartment reviews inserted (2 approved, 1 pending)';

    -- ── 8. USER FAVORITES ────────────────────────────────────────────
    SET IDENTITY_INSERT user_favorites ON;

    INSERT INTO user_favorites (id, user_id, apartment_id, created_at)
    VALUES
    (1, 4, 1, '2025-11-10T10:05:00Z'),   -- Charlie ♥ Ponttor
    (2, 4, 3, '2025-11-12T08:00:00Z'),   -- Charlie ♥ WG-Zimmer
    (3, 5, 3, '2025-11-13T08:35:00Z'),   -- Diana  ♥ WG-Zimmer
    (4, 6, 2, '2025-11-16T12:05:00Z'),   -- Erik   ♥ Lousberg
    (5, 5, 4, '2025-12-02T10:00:00Z');   -- Diana  ♥ Mitte apartment

    SET IDENTITY_INSERT user_favorites OFF;
    PRINT '  ✓ 5 user favorites inserted';

    -- ── 9. NOTIFICATIONS ─────────────────────────────────────────────
    SET IDENTITY_INSERT notifications ON;

    INSERT INTO notifications (id, user_id, type, title, message,
                               related_entity_type, related_entity_id,
                               read_at, action_url, priority,
                               created_at, expires_at)
    VALUES
    (1, 4, 'VIEWING_APPROVED', 'Besichtigungstermin bestätigt',
     'Ihr Termin für "Gemütliche 2-Zimmer-Wohnung am Ponttor" wurde bestätigt: Sa 16. Nov, 14:00 Uhr.',
     'VIEWING_REQUEST', 1,
     '2025-11-12T10:00:00Z', '/viewings/1', 'HIGH',
     '2025-11-11T09:30:00Z', '2025-11-17T00:00:00Z'),

    (2, 2, 'VIEWING_REQUEST', 'Neue Besichtigungsanfrage',
     'Charlie Weber möchte Ihre Wohnung "Gemütliche 2-Zimmer-Wohnung am Ponttor" besichtigen.',
     'VIEWING_REQUEST', 1,
     '2025-11-10T15:00:00Z', '/viewings/1', 'NORMAL',
     '2025-11-10T14:45:00Z', NULL),

    (3, 2, 'NEW_MESSAGE', 'Neue Nachricht von Erik Braun',
     'Erik Braun hat Ihnen eine Nachricht zum "Helles Studio am Lousberg" geschrieben.',
     'CONVERSATION', 3,
     NULL, '/messages/3', 'NORMAL',
     '2025-11-18T20:10:00Z', NULL),

    (4, 1, 'SYSTEM_ANNOUNCEMENT', 'Willkommen bei SichrPlace',
     'Das MSSQL-Beta-System wurde erfolgreich eingerichtet. Alle Seed-Daten sind geladen.',
     NULL, NULL,
     NULL, '/', 'LOW',
     '2025-12-01T00:00:00Z', '2026-06-01T00:00:00Z'),

    (5, 5, 'FAVORITE_APARTMENT_UPDATED', 'Aktualisierung einer Merkliste',
     'Die Wohnung "Moderne 1-Zimmer-Wohnung Aachen Mitte" hat neue Informationen.',
     'APARTMENT', 4,
     NULL, '/apartments/4', 'NORMAL',
     '2025-12-03T09:00:00Z', NULL);

    SET IDENTITY_INSERT notifications OFF;
    PRINT '  ✓ 5 notifications inserted';

    -- ══════════════════════════════════════════════════════════════════
    PRINT '';
    PRINT '═══════════════════════════════════════════════════════════';
    PRINT '  SichrPlace workplace seed complete!';
    PRINT '  • 6 users  • 4 apartments  • 2 listings';
    PRINT '  • 3 conversations (12 messages)';
    PRINT '  • 3 viewing requests  • 3 reviews  • 5 favorites';
    PRINT '  • 5 notifications';
    PRINT '';
    PRINT '  Login with any seed account: password123';
    PRINT '═══════════════════════════════════════════════════════════';
END
GO
