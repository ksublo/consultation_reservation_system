ALTER TABLE consultation_slots
    ADD COLUMN online_available BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN offline_available BOOLEAN NOT NULL DEFAULT TRUE,
    ADD CONSTRAINT at_least_one_consultation_mode_available
        CHECK (online_available OR offline_available);
