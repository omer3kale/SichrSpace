-- =============================================================================
-- V005__seed_transitions_and_saved_searches.sql
-- SichrPlace — Seed data for viewing_request_transitions and saved_searches
--
-- Purpose:   Provides sample rows for the two new tables added in V003/V004.
--            Mirrors what the updated DataSeeder.java creates at startup.
--
-- IMPORTANT: This script is IDEMPOTENT — safe to run multiple times.
--            Assumes V002 seed data (users id 1–6, viewing_requests id 1–3)
--            has already been loaded.
--
-- Generated: February 2026
-- =============================================================================

-- Guard: only seed if viewing_request_transitions table is empty
IF (SELECT COUNT(*) FROM viewing_request_transitions) > 0
BEGIN
    PRINT 'V005 — viewing_request_transitions already seeded — skipping.';
END
ELSE
BEGIN
    PRINT 'V005 — Seeding viewing_request_transitions …';

    -- Viewing request 1 (Charlie → Ponttor): PENDING → CONFIRMED
    --   Charlie (id=4) created it, Alice (id=2) confirmed it
    SET IDENTITY_INSERT viewing_request_transitions ON;

    INSERT INTO viewing_request_transitions
        (id, viewing_request_id, from_status, to_status, changed_by, changed_at, reason)
    VALUES
    (1, 1, NULL,      'PENDING',   4, '2025-11-10T10:00:00', 'Viewing request created'),
    (2, 1, 'PENDING', 'CONFIRMED', 2, '2025-11-11T09:30:00', NULL),

    -- Viewing request 2 (Diana → WG-Zimmer): PENDING (no further transitions yet)
    --   Diana (id=5) created it
    (3, 2, NULL,      'PENDING',   5, '2025-11-14T16:00:00', 'Viewing request created'),

    -- Viewing request 3 (Erik → Lousberg): PENDING (no further transitions yet)
    --   Erik (id=6) created it
    (4, 3, NULL,      'PENDING',   6, '2025-11-17T12:00:00', 'Viewing request created');

    SET IDENTITY_INSERT viewing_request_transitions OFF;

    PRINT '  ✓ 4 viewing_request_transitions created';
END
GO

-- Guard: only seed if saved_searches table is empty
IF (SELECT COUNT(*) FROM saved_searches) > 0
BEGIN
    PRINT 'V005 — saved_searches already seeded — skipping.';
END
ELSE
BEGIN
    PRINT 'V005 — Seeding saved_searches …';

    SET IDENTITY_INSERT saved_searches ON;

    INSERT INTO saved_searches
        (id, user_id, name, filter_json, is_active, last_matched_at, match_count, created_at, updated_at)
    VALUES
    -- Charlie: searching for affordable furnished places near Ponttor
    (1, 4, 'Ponttor unter 650€',
     '{"city":"Aachen","district":"Ponttor","maxRent":650,"furnished":true}',
     1, NULL, 0,
     '2025-10-10T14:00:00', '2025-10-10T14:00:00'),

    -- Diana: searching for quiet WG rooms
    (2, 5, 'WG-Zimmer Aachen',
     '{"city":"Aachen","maxRent":400,"minBedrooms":1,"petFriendly":true}',
     1, NULL, 0,
     '2025-10-12T09:30:00', '2025-10-12T09:30:00');

    SET IDENTITY_INSERT saved_searches OFF;

    PRINT '  ✓ 2 saved_searches created';
END
GO

-- ---------------------------------------------------------------------------
-- Summary
-- ---------------------------------------------------------------------------
PRINT '═══════════════════════════════════════════════════════';
PRINT '  V005 — Seed transitions & saved searches complete.';
PRINT '  4 viewing_request_transitions, 2 saved_searches';
PRINT '═══════════════════════════════════════════════════════';
GO
