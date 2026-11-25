# C11 — Validation plan

- Status: **PREPARED / NOT RUN**
- Plan version: `C11-plan-v2`
- Tracking issue: [#75](https://github.com/ksublo/consultation_reservation_system/issues/75)
- Planning baseline: `ebcc5fd177155d5fb95bff4d6c2e2322d105fab2`

This document prepares four validation approaches for the existing Consultation Reservation System. It contains protocols and blank records, not experimental results. Every result remains **NOT RUN** until C12 selects and executes a method.

**C11 preparation is complete; C12 execution is pending.** The assignment and its worked example explicitly require actual observations to remain empty. `NOT RUN` in a recording form is therefore intentional, not a missing scenario or acceptance criterion. All tasks, questions, starting conditions, evidence checks and interpretation rules below are prepared. Participant quotations, elapsed times and study conclusions can only be filled from a real session.

### Session procedure and recording rules

The moderator prepares the isolated instance, gives only the applicable participant card, delivers the planned events and logs any help. An observer records actions and runs the private checks; one team member may cover both roles, noting pauses for evidence collection. Use separate browser profiles for student and teacher so approval does not replace the participant's login. Never show this full internal plan or the C11 documentation tab to the participant.

Before a session record the selected method, `git rev-parse HEAD`, date/time/timezone, UI language, browser, moderator, observer, anonymous participant code and previous experience. Explain that the software is being evaluated, obtain agreement to take notes, and allow the participant to stop. Record actual slot dates from the prepared database in Europe/Prague; give these dates as ordinary scheduling information with the cards. Do not guess future session details now.

Observe A for up to 10 minutes per task; allow about 10 minutes for B's questions and 10 for its probe, 15–20 minutes for C, and 20–25 minutes for D. These are session limits, not product acceptance thresholds. Log elapsed time, material actions, exact statements, errors, hesitation and every intervention. If a prerequisite fails or the participant stops, record the interruption and last observed state; do not silently reset or complete their task. In D, stop dependent events if the preceding checkpoint fails.

For each checkpoint keep the participant's claim, UI observation, database evidence and interpretation separate. Record the reservation ID, timestamp and recipient of each relevant notification. Capture before/after history for seeded C2/A2 so existing seed events are not mistaken for new actions. A missing readback means **unverified**, not a successful completion. A correct stored state with an incorrect explanation means technical completion with a comprehension problem. Reusing a participant across methods introduces learning; run B's interview before showing the workflow and record method/task order.

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
       r.reason_title, r.consultation_mode, r.status,
       s.id AS slot_id, s.status AS slot_status, s.starts_at, s.ends_at,
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

SELECT n.type, recipient.login AS recipient_login,
       n.title, n.message, n.created_at, n.read_at
FROM notifications n
JOIN app_users recipient ON recipient.id = n.recipient_user_id
WHERE n.reservation_id = '<RESERVATION_ID>'
ORDER BY n.created_at;"
```

The operator copies only the necessary rows into the private record. Tokens, password hashes and unrelated personal data are never captured.

Match the returned slot ID, teacher, student, mode and time to the planned task; save the returned reservation ID and follow that exact ID through C/D. After a student cancellation, verify both zero active reservations and an `ACTIVE` future slot outside the cutoff, then compare availability in the ordinary UI. Zero occupancy alone does not prove that a cancelled or expired slot can be booked. Creation must notify the owning teacher (`RESERVATION_CREATED`), approval the student (`RESERVATION_APPROVED`), and student cancellation the teacher (`RESERVATION_CANCELLED`). These database records prove application notification creation, not email delivery or that a person read the notification.

## A. Observed user tasks

**Validation question:** Can a first-time student complete two common goals through the normal UI and correctly distinguish a request awaiting approval from a cancelled reservation without procedural help?

### Participant card A

Give only this section to the participant, with the reset-specific dates filled in.

> **Role:** You are a student arranging university consultations. You may use the application's ordinary interface and documentation. Tell the observer when you believe each task is complete and what you think the reservation's current state means.
>
> **A1 — request a consultation:** Sign in as `DVO0001` with the supplied development password `password`. Arrange an **in-person** consultation with **Karel Cerny** in his prepared 14:00–14:30 slot. Use title `C11-A1` and note `Review the reservation-system validation plan.` Stop when you believe you have done everything currently possible as a student.
>
> **A2 — cancel a different consultation:** Sign in as `KRA0001` with the supplied development password `password`. Your already approved consultation with **Eva Svobodova** on the supplied date at 14:00 no longer fits your schedule. Cancel it and record `Schedule conflict` as the reason. Stop when you believe it is no longer booked.

The card deliberately states goals and business data, not screen sequence, button names, database values or expected status codes.

### Private team protocol A

| Item                              | A1                                                                                                                                                                                     | A2                                                                                                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starting state                    | Fresh reset; Karel's named slot is `ACTIVE`, unoccupied and more than three hours away.                                                                                                | Separate fresh reset; reservation `cccc...ccc2` is `CONFIRMED`, belongs to `KRA0001`, and starts more than three hours away.                                                    |
| Independence                      | Reset before A2 so it does not depend on A1's success or data. A reset cannot remove participant learning: record task order and counterbalance it if multiple participants are used.  | Uses a different account, teacher and seeded reservation; data independence does not imply independent participant experience.                                                  |
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

The predeclared probe outcome is exactly one `C11-B` request by `DVO0001` for Karel's selected slot, mode `ONLINE`, stored as `PENDING`. Compare the participant's own meaning of completion with that state. This checks submission and understanding of the next step, not a completed agreement with the teacher. Record the five answers before product use; compare expected information, next actor and certainty of attendance with the observed UI and readback. Do not supply model answers.

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
| **C1 — request and obtain approval.** A student needs assurance that a requested consultation has become agreed.                                            | Creating title `C11-C1` for Karel's prepared slot stores exactly one `PENDING` reservation and notifies Karel. In this scenario Karel approves it while outside the cutoff. Approval stores `CONFIRMED`, `confirmed_at`, one `CONFIRMED` history transition and a student approval notification. The student UI distinguishes waiting from approved. | “Review the request and approval outcome. Would it give you enough information to decide whether to attend? What essential condition or information is missing? Which assumption is unclear?” | In C12, the participant creates the request as `DVO0001`; the moderator then signs in as `CER0001` and approves that exact ID. Capture readbacks before and after approval. |
| **C2 — cancel an approved consultation after plans change.** The student and teacher need an auditable cancellation and the time must cease to be occupied. | Starting from seed reservation `cccc...ccc2`, cancellation by `KRA0001` with reason `Schedule conflict` stores `CANCELLED`, cancellation actor/time/reason, one transition and a teacher notification. No `PENDING` or `CONFIRMED` reservation remains on the slot.                                                                         | “Review the cancellation outcome. Could you tell whether the consultation will still happen? What essential confirmation or information is missing? Which assumption is unclear?”             | If selected for execution, cancel through the normal UI and verify reservation, active occupancy, history and notification using the private queries.                       |

The moderator records accept / accept with reservation / reject / unable to assess, the exact objection, and any unresolved assumption separately from technical execution. Execute at least C1 when C is selected; C2 may be reviewed without execution, in which case its technical result remains NOT RUN. C1 demonstrates approval by the owning teacher; the rule that other users cannot approve is a product constraint, not a security property proven by this successful path. Record each executed criterion as met, unmet or unverified, with its evidence. A proxy acceptance does not override an unmet technical criterion, and a technically correct result does not erase a suitability objection.

### Participant cards C

> **C1:** You are a student arranging a project consultation with Karel Cerny in the supplied 14:00–14:30 slot. Use `DVO0001` / `password`, an in-person meeting, title `C11-C1` and note `Review the validation plan before submission.` Arrange the consultation and explain whether you can rely on it taking place. Later you will be told that the teacher has responded; find out what this means for your plans. Would the outcome be suitable for your university work? What information is missing or unclear?
>
> **C2:** Use `KRA0001` / `password`. Your approved consultation with Eva Svobodova on the supplied date at 14:00 no longer fits your schedule. Arrange for it not to take place and give `Schedule conflict` as the reason. Would the resulting information be enough to decide whether to attend? What is missing or unclear?

Only give the applicable card and ordinary access details. For C1, the moderator privately approves the matching request as `CER0001` after the creation checkpoint and then says: “The teacher has responded. Find out what this means for your plans.”

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

**Interpretation rule D:** assess continuity across the same reservation ID and the participant's understanding at each event. Distinguish an uninterrupted workflow without help, completion with help, an incomplete workflow, and apparent completion contradicted by stored state. Report the phase at which a mismatch occurred. Do not infer success for later phases after an earlier checkpoint fails. Teacher processing time is simulated by the moderator and cannot be reported as measured real-world response time.

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
