# C07 clean-start evidence — 2 Nov 2026

## Assignment and attribution

- **Owner/reviewer:** Fatima Tangatarova.
- **Executed by:** C07 verification run (Codex) in an isolated source copy. This record does not claim Fatima personally ran the commands.
- **Review comment for Fatima:** please review the attached Compose and smoke outputs, confirm the result is acceptable for the team, and add the team's agreed due dates/backups to the action plan.

## Environment

The source tree was copied to a new temporary directory without `.git`, `node_modules`, `target`, or `dist`. Docker Compose ran as project `c07-clean-smoke`, using a new isolated PostgreSQL volume and ports 55434 (database), 18083 (backend), and 15177 (frontend). The tested tree is commit `31a22ad` on `fix/docs-c07&corrections`, based on `main@3c25e78`, and includes the C07 concurrency-lock change.

## Result

- `docker compose up -d --build backend frontend` completed with exit code 0.
- PostgreSQL 17.11 became healthy; Flyway applied 14 migrations, ending at v14; the backend started.
- Demo teacher `NOV0001` authenticated successfully.
- Authenticated `GET /api/slots` returned 12 seeded slots.
- The frontend returned HTTP 200.
- All three containers were reported `Up`; the database health check was `healthy`.

Review record: the user checked the stored Compose, migration and smoke outputs on 2 Nov 2026 and confirmed that the clean-start result is acceptable. This confirmation is a review of the evidence, not a claim that the user personally executed the Docker commands.

## Attached machine-readable evidence

- `compose-up.log` — clean Compose image build and startup.
- `startup-and-migrations.txt` — filtered backend startup and Flyway migration output.
- `compose-ps.txt` — container status and port mapping.
- `smoke-test.json` — HTTP status, authenticated role, returned slot count, owner and executor attribution.
