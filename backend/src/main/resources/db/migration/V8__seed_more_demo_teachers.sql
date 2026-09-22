-- Development-only teacher accounts. Every seeded account uses password: password
WITH teacher_seed(id, first_name, last_name, login, email) AS (
    VALUES
        ('55555555-5555-5555-5555-555555555501'::uuid, 'Karel', 'Cerny', 'CER0001', 'karel.cerny@university.test'),
        ('55555555-5555-5555-5555-555555555502'::uuid, 'Marta', 'Prochazkova', 'PRO0001', 'marta.prochazkova@university.test'),
        ('55555555-5555-5555-5555-555555555503'::uuid, 'Tomas', 'Kucera', 'KUC0001', 'tomas.kucera@university.test'),
        ('55555555-5555-5555-5555-555555555504'::uuid, 'Lucie', 'Horakova', 'HOR0001', 'lucie.horakova@university.test'),
        ('55555555-5555-5555-5555-555555555505'::uuid, 'Pavel', 'Marek', 'MAR0001', 'pavel.marek@university.test'),
        ('55555555-5555-5555-5555-555555555506'::uuid, 'Jana', 'Novotna', 'NOV0002', 'jana.novotna@university.test'),
        ('55555555-5555-5555-5555-555555555507'::uuid, 'Martin', 'Pokorny', 'POK0001', 'martin.pokorny@university.test'),
        ('55555555-5555-5555-5555-555555555508'::uuid, 'Eva', 'Dvorakova', 'DVO0002', 'eva.dvorakova@university.test'),
        ('55555555-5555-5555-5555-555555555509'::uuid, 'Radek', 'Vesely', 'VES0001', 'radek.vesely@university.test'),
        ('55555555-5555-5555-5555-555555555510'::uuid, 'Petra', 'Malikova', 'MAL0001', 'petra.malikova@university.test')
),
upserted_users AS (
    INSERT INTO app_users (id, first_name, last_name, login, email, password_hash)
    SELECT id, first_name, last_name, login, email, '$2a$10$YEXZ46.9Mq3UA0/98LIKDeE4mxfTMWrJGDPWsmxQ6/elo2g5G9O.e'
    FROM teacher_seed
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        login = EXCLUDED.login,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash
    RETURNING id
)
INSERT INTO user_roles (user_id, role)
SELECT id, 'TEACHER' FROM upserted_users
ON CONFLICT (user_id, role) DO NOTHING;
