package consultation_reservation_backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import consultation_reservation_backend.domain.AppUser;
import consultation_reservation_backend.domain.AuthSession;
import consultation_reservation_backend.domain.ConsultationSlot;
import consultation_reservation_backend.domain.Notification;
import consultation_reservation_backend.domain.Reservation;
import consultation_reservation_backend.domain.ReservationAction;
import consultation_reservation_backend.domain.ReservationHistory;
import consultation_reservation_backend.domain.ReservationStatus;
import consultation_reservation_backend.domain.UserRole;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Executes TC-C08-02 against the unmodified main@99210f0 application code. */
@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ReservationLateApprovalBaselineTests {
  private static final String SCHEMA =
      "c08_baseline_" + UUID.randomUUID().toString().replace("-", "");

  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) {
    properties.add(
        "spring.datasource.url",
        () ->
            "jdbc:postgresql://localhost:5432/consultation_reservation?currentSchema="
                + SCHEMA
                + ",public");
    properties.add("spring.datasource.username", () -> "consultation_reservation");
    properties.add("spring.datasource.password", () -> "change-me");
    properties.add("spring.flyway.schemas", () -> SCHEMA);
    properties.add("spring.flyway.default-schema", () -> SCHEMA);
    properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    properties.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
  }

  @Autowired MockMvc mvc;
  @Autowired EntityManager entityManager;
  @Autowired JdbcTemplate jdbc;
  @Autowired PlatformTransactionManager transactions;

  UUID reservationId;
  UUID teacherId;
  UUID studentId;
  UUID token;
  OffsetDateTime startsAt;
  TransactionTemplate transaction;

  record Snapshot(
      String status,
      Object confirmedAt,
      long historyCount,
      long notificationCount,
      UUID confirmationActor,
      UUID approvalRecipient) {}

  @BeforeEach
  void preparePendingDirectlyInIsolatedDatabase() {
    transaction = new TransactionTemplate(transactions);
    transaction.executeWithoutResult(
        ignored -> {
          String suffix = UUID.randomUUID().toString();
          AppUser teacher =
              new AppUser(
                  UserRole.TEACHER,
                  "C08",
                  "Teacher",
                  "c08-teacher-" + suffix,
                  "c08-teacher-" + suffix + "@example.test",
                  "unused");
          AppUser student =
              new AppUser(
                  UserRole.STUDENT,
                  "C08",
                  "Student",
                  "c08-student-" + suffix,
                  "c08-student-" + suffix + "@example.test",
                  "unused");
          entityManager.persist(teacher);
          entityManager.persist(student);

          startsAt = OffsetDateTime.now().plusHours(2).plusMinutes(59);
          ConsultationSlot slot = new ConsultationSlot(teacher, startsAt, startsAt.plusHours(1));
          entityManager.persist(slot);
          Reservation reservation =
              new Reservation(slot, student, "C08 baseline", "Late approval baseline");
          entityManager.persist(reservation);
          entityManager.persist(
              new ReservationHistory(
                  reservation,
                  ReservationAction.CREATED,
                  null,
                  ReservationStatus.PENDING,
                  student,
                  null));
          entityManager.persist(
              new Notification(teacher, reservation, "RESERVATION_CREATED", "Test", "Test"));
          AuthSession session = new AuthSession(teacher, UserRole.TEACHER);
          entityManager.persist(session);

          reservationId = reservation.getId();
          teacherId = teacher.getId();
          studentId = student.getId();
          token = session.getId();
        });

    assertEquals("PENDING", databaseStatus());
  }

  @Test
  void lateApprovalIsAcceptedOnBaselineAndCommitted() throws Exception {
    String apiBody =
        mvc.perform(
                post("/api/reservations/" + reservationId + "/approve")
                    .header("Authorization", "Bearer " + token)
                    .contentType("application/json")
                    .content("{\"note\":\"TC-C08-02 baseline approval\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(reservationId.toString()))
            .andExpect(jsonPath("$.status").value("CONFIRMED"))
            .andReturn()
            .getResponse()
            .getContentAsString();

    Snapshot sql = snapshot();
    assertEquals("CONFIRMED", sql.status());
    assertNotNull(sql.confirmedAt());
    assertEquals(2, sql.historyCount());
    assertEquals(2, sql.notificationCount());
    assertEquals(teacherId, sql.confirmationActor());
    assertEquals(studentId, sql.approvalRecipient());

    System.out.println("TC-C08-02 BASELINE=" + "99210f0");
    System.out.println("TC-C08-02 SCHEMA=" + SCHEMA);
    System.out.println("TC-C08-02 STARTS_AT=" + startsAt);
    System.out.println("TC-C08-02 API_STATUS=200");
    System.out.println("TC-C08-02 API_BODY=" + apiBody);
    System.out.println("TC-C08-02 SQL=" + sql);
  }

  private String databaseStatus() {
    return jdbc.queryForObject(
        "SELECT status FROM reservations WHERE id = ?", String.class, reservationId);
  }

  private Snapshot snapshot() {
    return jdbc.queryForObject(
        """
        SELECT r.status, r.confirmed_at,
          (SELECT count(*) FROM reservation_history WHERE reservation_id = r.id) histories,
          (SELECT count(*) FROM notifications WHERE reservation_id = r.id) notifications,
          (SELECT actor_user_id FROM reservation_history
             WHERE reservation_id = r.id AND action = 'CONFIRMED') confirmation_actor,
          (SELECT recipient_user_id FROM notifications
             WHERE reservation_id = r.id AND type = 'RESERVATION_APPROVED') approval_recipient
        FROM reservations r WHERE r.id = ?
        """,
        (row, index) ->
            new Snapshot(
                row.getString("status"),
                row.getObject("confirmed_at"),
                row.getLong("histories"),
                row.getLong("notifications"),
                row.getObject("confirmation_actor", UUID.class),
                row.getObject("approval_recipient", UUID.class)),
        reservationId);
  }
}

