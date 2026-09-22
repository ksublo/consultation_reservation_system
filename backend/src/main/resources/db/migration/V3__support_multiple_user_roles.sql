CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL CHECK (role IN ('STUDENT', 'TEACHER')),
    PRIMARY KEY (user_id, role)
);

INSERT INTO user_roles (user_id, role)
SELECT id, role FROM app_users;

ALTER TABLE app_users DROP COLUMN role;
