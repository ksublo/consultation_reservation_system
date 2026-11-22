# TC-C08-02 — baseline late approval evidence

## Scope

- Date: 2026-11-22, Europe/Prague
- Production baseline: `main@99210f0158993b2b8a81f9b327f63e5736556c62`
- Runtime: Java 21.0.12, Spring Boot 4.1.1, PostgreSQL 17.11
- Test source: `ReservationLateApprovalBaselineTests.java` in this directory
- Database isolation: random schema `c08_baseline_9434cd5b2c254447a37bc753229939b8`, migrated independently through Flyway V14

The baseline source was exported with `git archive 99210f0` to a clean temporary directory. Production files were not modified. The test harness directly persisted the teacher, student, slot, PENDING reservation, initial CREATED history, initial notification, and teacher bearer session. Direct persistence bypassed only `ReservationService.create()`, because that endpoint intentionally rejects a slot less than three hours away and therefore cannot construct the historical PENDING state needed by this before-change case.

The approve action itself used the real application chain:

`MockMvc HTTP POST -> BearerTokenFilter -> AuthService -> ReservationController -> ReservationService -> PostgreSQL`

## Command

```bash
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 \
PATH=/usr/lib/jvm/java-21-openjdk-amd64/bin:$PATH \
bash backend/mvnw -f backend/pom.xml --batch-mode --no-transfer-progress \
  -Dtest=ReservationLateApprovalBaselineTests test
```

## Actual API and SQL evidence

Fixture time:

```text
startsAt = 2026-11-22T21:02:36.035779557+01:00
```

HTTP output, with generated identifiers and personal fixture fields redacted:

```text
HTTP 200
{
  "id": "<reservation-id>",
  "status": "CONFIRMED",
  "startsAt": "2026-11-22T20:02:36.03578Z",
  "confirmedAt": "2026-11-22T18:03:36.261089142+01:00"
}
```

Fresh SQL/JdbcTemplate read after the HTTP transaction committed:

```text
status=CONFIRMED
confirmed_at=2026-11-22 18:03:36.261089
history_count=2
notification_count=2
confirmation_actor=<teacher-id>
approval_recipient=<student-id>
```

The test also asserted that `confirmation_actor` equals the fixture teacher and `approval_recipient` equals the fixture student.

## Result

```text
Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

TC-C08-02 is **PASS** on the before-change baseline: a PENDING reservation already present 2 hours 59 minutes before the slot could be approved, and the committed database state became CONFIRMED with the expected history and notification.
