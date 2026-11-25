# C11 — Validation plan

- Status: **PREPARED / NOT RUN**
- Plan version: `C11-plan-v1`
- Tracking issue: [#75](https://github.com/ksublo/consultation_reservation_system/issues/75)
- Planning baseline: `ebcc5fd177155d5fb95bff4d6c2e2322d105fab2`

This document prepares four validation approaches for the existing Consultation Reservation System. It contains protocols and blank records, not experimental results. Every result remains **NOT RUN** until C12 selects and executes a method.

## 0. Shared context

| Item                       | Prepared value                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product and repository     | Consultation Reservation System, `ksublo/consultation_reservation_system`. The Git revision containing this file is the authoritative delivery version; the planning baseline is recorded above.                                                                                                                                                                                                      |
| Intended users and purpose | University students need to find a suitable teacher slot, send a consultation request, understand whether it is still awaiting approval, and cancel it when plans change. Teachers publish slots, approve requests, and receive relevant notifications. The primary participant in this plan acts as a student; a moderator uses a teacher account only where the protocol calls for a real approval. |
| Real product contract      | Creating a request produces `PENDING`, not a final booking. The owning teacher can change it to `CONFIRMED`. A student or the slot's teacher can change an eligible reservation to `CANCELLED`. Creation, approval, and manual cancellation require the slot to start more than three hours in the future. An unapproved request at the cutoff is automatically cancelled.                            |
| Supported interface        | The ordinary React web UI at `http://localhost:15173`, in Czech or English. The participant may use only the normal UI and the README-level startup/help information. SQL and internal endpoints are private oracles for the team and are never participant instructions.                                                                                                                             |
| Runtime                    | Docker Compose; React/TypeScript frontend, Java 21/Spring Boot backend, PostgreSQL 17 and Flyway migrations.                                                                                                                                                                                                                                                                                          |
| Isolated environment       | Compose project `consultation-c11` with dedicated host ports `15173` (frontend), `18081` (backend), and `55431` (PostgreSQL). It must not share the ordinary development volume.                                                                                                                                                                                                                      |
| Primary proxy participant  | A student from another project team who has not used this application. This person is a convenience proxy for a university student, not a representative sample of the target population. Prior experience with reservation systems and software development must be noted.                                                                                                                           |
| Independent truth source   | Read-only SQL over reservation, slot, user, history and notification tables. A toast, visible badge, participant statement, or HTTP success alone is not proof of the stored state.                                                                                                                                                                                                                   |
| Results policy             | Observation cells, readbacks, interpretations and conclusions stay `NOT RUN`. No `PASS`, success rate, usability claim or C12 finding is recorded during C11.                                                                                                                                                                                                                                         |

### Environment preparation and safe reset

Use a fresh isolated database immediately before a C12 session:

```sh
docker compose -p consultation-c11 down -v
POSTGRES_PORT=55431 BACKEND_PORT=18081 FRONTEND_PORT=15173 \
  docker compose -p consultation-c11 up -d --build
docker compose -p consultation-c11 ps
```

`down -v` is intentionally scoped to `consultation-c11`; do not run it against the normal project. Flyway then recreates deterministic accounts and relative-date seed slots. Record the generated dates shown in the UI before printing participant cards, because the seed uses tomorrow and the following day relative to reset time. Confirm that all three services are running and that the selected slots remain more than three hours away.

### Prepared accounts and seed records

All development accounts below use password `password`. Give a participant only the account required for the current task.

| Purpose                  | Account / role                     | Prepared seed state after reset                                                                                                     |
| ------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| New student request      | `DVO0001` / STUDENT (Petr Dvorak)  | One existing `PENDING` request with Jan Novak; may create another request.                                                          |
| Independent cancellation | `KRA0001` / STUDENT (Anna Kralova) | Confirmed reservation `cccccccc-cccc-cccc-cccc-ccccccccccc2` with Eva Svobodova two calendar days after reset at 14:00 Prague time. |
| Approval during C/D      | `CER0001` / TEACHER (Karel Cerny)  | Free slot `66666666-6666-6666-6666-666666666501` tomorrow at 14:00–14:30 Prague time, online and in person.                         |

The moderator records the actual dates after reset. If a named slot is missing, inside the cutoff, or occupied, stop preparation and reset; do not silently substitute data after the participant starts.

### Private readback queries

The team may use these queries after a participant declares completion. Replace the title marker only when the protocol explicitly assigns a different one.

```sh
docker compose -p consultation-c11 exec -T database \
  psql -U consultation_reservation -d consultation_reservation -P pager=off -c "
SELECT r.id, student.login AS student_login, teacher.login AS teacher_login,
       r.reason_title, r.consultation_mode, r.status, s.starts_at,
       r.confirmed_at, r.cancelled_at, canceller.login AS cancelled_by,
       r.cancellation_note,
       (SELECT count(*) FROM reservations active
        WHERE active.slot_id = r.slot_id
          AND active.status IN ('PENDING', 'CONFIRMED')) AS active_on_slot
FROM reservations r
JOIN consultation_slots s ON s.id = r.slot_id
JOIN app_users student ON student.id = r.student_id
JOIN app_users teacher ON teacher.id = s.teacher_id
LEFT JOIN app_users canceller ON canceller.id = r.cancelled_by_user_id
WHERE r.reason_title IN ('C11-A1', 'C11-B', 'C11-C1', 'C11-D')
   OR r.id = 'cccccccc-cccc-cccc-cccc-ccccccccccc2'
ORDER BY r.created_at;"
```

For lifecycle evidence, use the returned reservation ID:

```sh
docker compose -p consultation-c11 exec -T database \
  psql -U consultation_reservation -d consultation_reservation -P pager=off -c "
SELECT action, previous_status, new_status, actor_user_id, note, created_at
FROM reservation_history
WHERE reservation_id = '<RESERVATION_ID>'
ORDER BY created_at;

SELECT type, title, message, created_at, read_at
FROM notifications
WHERE reservation_id = '<RESERVATION_ID>'
ORDER BY created_at;"
```

The operator copies only the necessary rows into the private record. Tokens, password hashes and unrelated personal data are never captured.

## A. Observed user tasks

**Validation question:** Can a first-time student complete two common goals through the normal UI and correctly distinguish a request awaiting approval from a cancelled reservation without procedural help?

### Participant card A

Give only this section to the participant, with the reset-specific dates filled in.

> **Role:** You are a student arranging university consultations. You may use the application's ordinary interface and documentation. Tell the observer when you believe each task is complete and what you think the reservation's current state means.
>
> **A1 — request a consultation:** Sign in as `DVO0001` with the supplied development password `password`. Arrange an **in-person** consultation with **Karel Cerny** in his prepared 14:00–14:30 slot. Use title `C11-A1` and note `Review the reservation-system validation plan.` Stop when you believe you have done everything currently possible as a student.
>
> **A2 — cancel a different consultation:** Start from a freshly reset system and sign in as `KRA0001` with the supplied development password `password`. Your already approved consultation with **Eva Svobodova** no longer fits your schedule. Cancel it and record `Schedule conflict` as the reason. Stop when you believe it is no longer booked.

The card deliberately states goals and business data, not screen sequence, button names, database values or expected status codes.

### Private team protocol A

| Item                              | A1                                                                                                                                                                                     | A2                                                                                                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starting state                    | Fresh reset; Karel's named slot is `ACTIVE`, unoccupied and more than three hours away.                                                                                                | Separate fresh reset; reservation `cccc...ccc2` is `CONFIRMED`, belongs to `KRA0001`, and starts more than three hours away.                                                    |
| Independence                      | Reset before A2. Do not carry the A1 reservation, learning or session into A2. Counterbalance task order if more than one participant is later used.                                   | Uses a different account, teacher and seeded reservation.                                                                                                                       |
| Help rule                         | Observer may restate the goal or explain a word from ordinary documentation. Naming a control, page, sequence or status meaning counts as procedural help and is logged verbatim.      | Same rule.                                                                                                                                                                      |
| Predeclared successful completion | One reservation with title `C11-A1`, student `DVO0001`, teacher `CER0001`, mode `OFFLINE`, selected slot and stored state `PENDING`; participant says it still needs teacher approval. | Seed reservation has state `CANCELLED`, non-null cancellation time, actor Anna, and reason `Schedule conflict`; no active (`PENDING`/`CONFIRMED`) reservation blocks that slot. |
| Oracle                            | Reservation query plus `CREATED` history and teacher `RESERVATION_CREATED` notification.                                                                                               | Reservation query plus `CANCELLED` history and teacher `RESERVATION_CANCELLED` notification.                                                                                    |

Start timing when the card is handed over and stop when the participant declares completion or after 10 minutes per task. Do not correct misconceptions during the task. After the declaration, ask only: “What is the reservation's state now, in your own words?” Then run the private readback.

### Blank observation record A

| Task | Time and material actions | Errors / hesitation | Assistance | Participant's exact completion words | Private readback | Interpretation |
| ---- | ------------------------- | ------------------- | ---------- | ------------------------------------ | ---------------- | -------------- |
| A1   | NOT RUN                   | NOT RUN             | NOT RUN    | NOT RUN                              | NOT RUN          | NOT RUN        |
| A2   | NOT RUN                   | NOT RUN             | NOT RUN    | NOT RUN                              | NOT RUN          | NOT RUN        |

**Interpretation rule:** report each task separately as completed without procedural help, completed with help, not completed, or apparent completion contradicted by readback. Time is descriptive, not a universal usability threshold. One proxy session cannot estimate population success rates, diagnose every hesitation, or prove accessibility and long-term learnability.

## B. Structured interview and product use

**Validation question:** What does a student expect “booked” to mean, and does the application's request/approval workflow communicate that meaning during real use?

### Participant questions B

Ask these in order before showing the prepared probe. Do not suggest product terminology in follow-ups.

1. When arranging a consultation with a teacher, how would you decide that the meeting is actually agreed?
2. What information would you want before sending a consultation request?
3. After sending a request, what would you expect to happen next?
4. What information would you need if your plans changed after the teacher accepted?
5. What would you expect if the teacher did not respond before the consultation was close to starting?

Permitted follow-ups are “Can you tell me more?” and “What makes that important?” Do not ask leading questions such as “Did the pending label confuse you?”

### Practical probe B

> Sign in as `DVO0001` with the supplied development password `password`. Using the prepared free 14:00–14:30 slot with Karel Cerny, request an **online** consultation titled `C11-B` with note `Discuss the validation evidence.` Tell us when you consider the task complete, what has happened, and what you expect next.

Use a fresh reset. The observer does not explain `PENDING` or teacher approval. After the participant finishes speaking, the team privately verifies the reservation, `CREATED` history and teacher notification.

### Blank interview and probe record B

| Source        | Exact statement / observed action | Inferred expectation (kept separate) | Product evidence | Alignment, mismatch or open question |
| ------------- | --------------------------------- | ------------------------------------ | ---------------- | ------------------------------------ |
| Question 1    | NOT RUN                           | NOT RUN                              | Not applicable   | NOT RUN                              |
| Question 2    | NOT RUN                           | NOT RUN                              | Not applicable   | NOT RUN                              |
| Question 3    | NOT RUN                           | NOT RUN                              | Not applicable   | NOT RUN                              |
| Question 4    | NOT RUN                           | NOT RUN                              | Not applicable   | NOT RUN                              |
| Question 5    | NOT RUN                           | NOT RUN                              | Not applicable   | NOT RUN                              |
| Product probe | NOT RUN                           | NOT RUN                              | NOT RUN          | NOT RUN                              |

**Interpretation rule:** interview statements reveal vocabulary, expectations and possible mismatches; they do not prove that the software works. The probe's stored state is evaluated independently. Do not convert an opinion into PASS/FAIL. A single proxy cannot establish prevalence of an expectation or represent all university students.

## C. Scenario-based acceptance review

**Validation question:** Are the outcomes of two important student scenarios suitable for the intended university workflow, and can the running system demonstrate the declared acceptance conditions?

### Prepared scenarios and acceptance conditions

| Scenario and user value                                                                                                                                     | Predeclared acceptance conditions                                                                                                                                                                                                                                                                                                           | Proxy review card                                                                                                                                                                             | Running-system verification                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1 — request and obtain approval.** A student needs assurance that a requested consultation has become agreed.                                            | Creating title `C11-C1` for Karel's prepared slot stores exactly one `PENDING` reservation and notifies Karel. Only Karel can approve it while outside the cutoff. Approval stores `CONFIRMED`, `confirmed_at`, one `CONFIRMED` history transition and a student approval notification. The student UI distinguishes waiting from approved. | “Review the request and approval outcome. Would it give you enough information to decide whether to attend? What essential condition or information is missing? Which assumption is unclear?” | In C12, the participant creates the request as `DVO0001`; the moderator then signs in as `CER0001` and approves that exact ID. Capture readbacks before and after approval. |
| **C2 — cancel an approved consultation after plans change.** The student and teacher need an auditable cancellation and the time must cease to be occupied. | Starting from seed reservation `cccc...ccc2`, cancellation by `KRA0001` with reason `Schedule conflict` stores `CANCELLED`, cancellation actor/time/reason, one transition and a teacher notification. No `PENDING` or `CONFIRMED` reservation remains on the slot.                                                                         | “Review the cancellation outcome. Could you tell whether the consultation will still happen? What essential confirmation or information is missing? Which assumption is unclear?”             | If selected for execution, cancel through the normal UI and verify reservation, active occupancy, history and notification using the private queries.                       |

The moderator records accept / accept with reservation / reject / unable to assess, the exact objection, and any unresolved assumption separately from technical execution.

### Blank acceptance record C

| Scenario | Proxy suitability decision and exact objection | Expected technical result | Actual readback | Interpretation |
| -------- | ---------------------------------------------- | ------------------------- | --------------- | -------------- |
| C1       | NOT RUN                                        | Declared above            | NOT RUN         | NOT RUN        |
| C2       | NOT RUN                                        | Declared above            | NOT RUN         | NOT RUN        |

**Limit:** another student is a proxy reviewer, not a product owner and not formal customer acceptance. Two scenarios do not cover every permission, race, cutoff boundary, notification failure, accessibility need or production condition. Execution of C1 demonstrates only the prepared path and revision.

## D. Short realistic pilot

**Validation question:** Can a student use the connected request → approval → changed plans → cancellation workflow while maintaining an accurate understanding of the consultation's state?

### Participant card D

> You are preparing a project review and want to consult Karel Cerny in his prepared 14:00–14:30 slot. Use the student account `DVO0001` with the supplied development password `password`, choose an in-person meeting, title it `C11-D`, and describe the topic as `Review the project before submission.` Tell the observer when you have done everything currently available to you.
>
> During the session you will receive new information. Respond to it as you would during an ordinary university day. You may use the application's normal interface and documentation.

The moderator reveals each later event only after the preceding readback:

1. **Teacher response:** “The teacher has now processed your request. Find out what happened and what it means for your meeting.” The moderator has approved the exact request as `CER0001` without showing the participant the teacher procedure.
2. **Change of plans:** “A required class has been moved into this time. Make sure the consultation will no longer take place and give `Required class moved` as the reason.”

### Private team protocol D

| Phase                | What to observe                                                                                                                      | Private checkpoint                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Request              | Discovery of teacher/slot, mode choice, form completion, response to the post-create message, and words used to describe completion. | Exact `C11-D` reservation is `PENDING`; `CREATED` history and teacher notification exist.                                                   |
| Approval event       | Moderator records the approved reservation ID and time. Participant is told only that the teacher processed it.                      | Same ID is `CONFIRMED`, `confirmed_at` is set, history has one transition, student approval notification exists.                            |
| Participant readback | Whether the participant finds and correctly interprets the confirmed state without procedural help.                                  | UI statement is compared with SQL state, not used as the oracle.                                                                            |
| Changed plans        | How the participant locates the reservation, reacts to confirmation, supplies a cancellation reason and checks the outcome.          | Same ID is `CANCELLED`; actor, time and reason are stored; teacher cancellation notification exists; no active reservation blocks the slot. |

Prepare a fresh isolated environment, fill the reset-specific date on the card, and allow 20–25 minutes. The participant may use ordinary UI documentation. Record interventions; do not expose SQL, IDs, status expectations or button sequences.

### Blank pilot timeline D

| Time / event                | Participant action and exact words | Assistance or problem | UI-visible state | Private readback | Interpretation |
| --------------------------- | ---------------------------------- | --------------------- | ---------------- | ---------------- | -------------- |
| Request                     | NOT RUN                            | NOT RUN               | NOT RUN          | NOT RUN          | NOT RUN        |
| Approval event              | NOT RUN                            | NOT RUN               | NOT RUN          | NOT RUN          | NOT RUN        |
| Participant checks response | NOT RUN                            | NOT RUN               | NOT RUN          | NOT RUN          | NOT RUN        |
| Change and cancellation     | NOT RUN                            | NOT RUN               | NOT RUN          | NOT RUN          | NOT RUN        |

Debrief with exactly these two initial questions:

1. At which points did you have to assume something about the consultation's state?
2. What information or control would you need for this workflow during a normal study week?

**Limit:** this is a short simulation with seeded data, one participant and an immediate moderator-driven approval. It cannot demonstrate long-term adoption, real teacher response times, workload, reliability, capacity, accessibility across populations or behavior during outages.

## C12 execution gate and completeness check

Do not execute a method until the instructor selects it and the team records the selected revision, participant consent/briefing approach, operator and date. Before execution confirm:

- [x] All four methods refer to implemented UI and lifecycle behavior.
- [x] Participant cards contain goals and normal credentials, not the hidden procedure or oracle.
- [x] Success/interpretation rules and private readbacks are predeclared.
- [x] The environment is isolated and has a targeted reset procedure.
- [x] Every method states its limits and the proxy limitation.
- [x] Blank records contain `NOT RUN`; there are no fabricated findings or `PASS` claims.
- [ ] Instructor-selected C12 method recorded — **NOT RUN / not selected in C11**.
- [ ] Actual participant observations and readbacks — **NOT RUN**.

The checked items describe review of this plan, not validation results. The two unchecked items intentionally remain for C12.
