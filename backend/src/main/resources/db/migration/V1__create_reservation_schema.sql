CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE app_users (
    id UUID PRIMARY KEY,
    role VARCHAR(16) NOT NULL CHECK (role IN ('STUDENT', 'TEACHER')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    login VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE consultation_slots (
    id UUID PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES app_users(id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('ACTIVE', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (ends_at > starts_at)
);

ALTER TABLE consultation_slots
    ADD CONSTRAINT no_overlapping_active_teacher_slots
    EXCLUDE USING gist (
        teacher_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
    ) WHERE (status = 'ACTIVE');

CREATE TABLE reservations (
    id UUID PRIMARY KEY,
    slot_id UUID NOT NULL REFERENCES consultation_slots(id),
    student_id UUID NOT NULL REFERENCES app_users(id),
    reason_title VARCHAR(150) NOT NULL,
    reason_description TEXT NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
    cancelled_by_user_id UUID REFERENCES app_users(id),
    cancellation_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX one_active_reservation_per_slot
    ON reservations(slot_id) WHERE status IN ('PENDING', 'CONFIRMED');

CREATE TABLE reservation_history (
    id UUID PRIMARY KEY,
    reservation_id UUID NOT NULL REFERENCES reservations(id),
    action VARCHAR(16) NOT NULL CHECK (action IN ('CREATED', 'CONFIRMED', 'CANCELLED')),
    previous_status VARCHAR(16),
    new_status VARCHAR(16) NOT NULL,
    actor_user_id UUID NOT NULL REFERENCES app_users(id),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX reservation_history_reservation_id_idx ON reservation_history(reservation_id, created_at);
CREATE INDEX consultation_slots_teacher_id_idx ON consultation_slots(teacher_id, starts_at);
