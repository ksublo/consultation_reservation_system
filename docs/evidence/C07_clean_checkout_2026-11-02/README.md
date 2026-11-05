# C07 clean-start evidence — 2 Nov 2026

## Assignment and attribution

- **Owner/reviewer:** Fatima Tangatarova; review completed 2 Nov 2026.
- **Original run executor:** C07 verification run (Codex) in an isolated source copy.
- **Independent follow-up:** Fatima completed a separate Compose build/start and reviewed the original smoke evidence. The separate run's logs are in `../C07_independent_check_2026-11-02/`.
- **Team plan:** Backend/concurrency owner Kseniia Blokhina, backup Fatima Tangatarova; frontend/peer-evidence owner Fatima Tangatarova, backup Kseniia Blokhina. Final review due date: 2 Nov 2026.

## Environment

The source tree was copied to a new temporary directory without `.git`, `node_modules`, `target`, or `dist`. Docker Compose ran as project `c07-clean-smoke`, using a new isolated PostgreSQL volume and ports 55434 (database), 18083 (backend), and 15177 (frontend). The tested tree is commit `31a22ad` on `fix/docs-c07&corrections`, based on `main@3c25e78`, and includes the C07 concurrency-lock change. The evidence and review updates were later pushed in commit `50a2909`.

## Result

- `docker compose up -d --build backend frontend` completed with exit code 0.
- PostgreSQL 17.11 became healthy; Flyway applied 14 migrations, ending at v14; the backend started.
- Demo teacher `NOV0001` authenticated successfully.
- Authenticated `GET /api/slots` returned 12 seeded slots.
- The frontend returned HTTP 200.
- All three containers were reported `Up`; the database health check was `healthy`.

The original run includes the authenticated API smoke. Fatima's independent follow-up is a separate Compose build/start against a fresh PostgreSQL volume; its logs confirm PostgreSQL 17.11 healthy, 14 migrations to v14, and backend/frontend containers up. Those follow-up logs do not include another login or API request; the original smoke remains the evidence for `NOV0001`, 12 slots and frontend HTTP 200.

## Attached machine-readable evidence

- `compose-up.log` — clean Compose image build and startup.
- `startup-and-migrations.txt` — filtered backend startup and Flyway migration output.
- `compose-ps.txt` — container status and port mapping.
- `smoke-test.json` — HTTP status, authenticated role, returned slot count, owner and executor attribution.
- `../C07_independent_check_2026-11-02/` — Fatima's independent Compose startup and completed review record.
