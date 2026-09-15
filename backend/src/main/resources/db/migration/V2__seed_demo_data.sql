-- Development-only demonstration accounts. Every seeded account uses password: password
INSERT INTO app_users (id, role, first_name, last_name, login, email, password_hash)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'TEACHER', 'Jan', 'Novak', 'jan.novak', 'jan.novak@university.test', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
    ('22222222-2222-2222-2222-222222222222', 'TEACHER', 'Eva', 'Svobodova', 'eva.svobodova', 'eva.svobodova@university.test', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
    ('33333333-3333-3333-3333-333333333333', 'STUDENT', 'Petr', 'Dvorak', 'petr.dvorak', 'petr.dvorak@student.test', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
    ('44444444-4444-4444-4444-444444444444', 'STUDENT', 'Anna', 'Kralova', 'anna.kralova', 'anna.kralova@student.test', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON CONFLICT (id) DO NOTHING;

INSERT INTO consultation_slots (id, teacher_id, starts_at, ends_at, status)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '1 day 10 hours', date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '1 day 10 hours 30 minutes', 'ACTIVE'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '1 day 11 hours', date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '1 day 11 hours 30 minutes', 'ACTIVE'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '22222222-2222-2222-2222-222222222222', date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '2 days 13 hours', date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '2 days 13 hours 45 minutes', 'ACTIVE'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '22222222-2222-2222-2222-222222222222', date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '2 days 15 hours', date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '2 days 15 hours 45 minutes', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations (id, slot_id, student_id, reason_title, reason_description, status, confirmed_at)
VALUES
    ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '33333333-3333-3333-3333-333333333333', 'Navrh databaze', 'Konzultace ER modelu a migraci pro semestralni projekt.', 'PENDING', NULL),
    ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '44444444-4444-4444-4444-444444444444', 'Priprava na zkousku', 'Konzultace k tematům z prednasek.', 'CONFIRMED', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservation_history (id, reservation_id, action, previous_status, new_status, actor_user_id, note)
VALUES
    ('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'CREATED', NULL, 'PENDING', '33333333-3333-3333-3333-333333333333', NULL),
    ('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'CREATED', NULL, 'PENDING', '44444444-4444-4444-4444-444444444444', NULL),
    ('dddddddd-dddd-dddd-dddd-ddddddddddd3', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'CONFIRMED', 'PENDING', 'CONFIRMED', '22222222-2222-2222-2222-222222222222', 'Termin potvrzen.')
ON CONFLICT (id) DO NOTHING;
