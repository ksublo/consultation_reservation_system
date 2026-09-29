CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    recipient_user_id UUID NOT NULL REFERENCES app_users(id),
    reservation_id UUID REFERENCES reservations(id),
    type VARCHAR(40) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    read_at TIMESTAMPTZ
);

CREATE INDEX notifications_recipient_created_idx ON notifications(recipient_user_id, created_at DESC);
