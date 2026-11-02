package consultation_reservation_backend;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import consultation_reservation_backend.api.ReservationTransitionRequest;
import consultation_reservation_backend.domain.*;
import consultation_reservation_backend.repository.ReservationHistoryRepository;
import consultation_reservation_backend.security.AuthenticatedUser;
import consultation_reservation_backend.service.NotificationService;
import consultation_reservation_backend.service.ReservationService;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Real PostgreSQL and Spring transactions for the cancellation lifecycle. */
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ReservationCancellationPersistenceTests {
  private static final String SCHEMA = "c03b_cancel_" + UUID.randomUUID().toString().replace("-", "");

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

  @Autowired ReservationService service;
  @Autowired EntityManager entityManager;
  @Autowired JdbcTemplate jdbc;
  @Autowired PlatformTransactionManager transactions;
  @MockitoSpyBean ReservationHistoryRepository history;
  @MockitoSpyBean NotificationService notifications;

  UUID reservationId;
  UUID teacherId;
  UUID studentId;
  TransactionTemplate transaction;
  Snapshot before;

  record Snapshot(
      String status,
      Object cancelledAt,
      UUID cancelledBy,
      String cancellationNote,
      long historyCount,
      long notificationCount) {}

  @BeforeEach
  void prepareCommittedFixture() {
    transaction = new TransactionTemplate(transactions);
    assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
    assertTrue(AopUtils.isAopProxy(service), "Cancellation must use Spring's transaction proxy");
    transaction.executeWithoutResult(
        ignored -> {
          String suffix = UUID.randomUUID().toString();
          AppUser teacher = user(UserRole.TEACHER, "teacher-" + suffix);
          AppUser student = user(UserRole.STUDENT, "student-" + suffix);
          entityManager.persist(teacher);
          entityManager.persist(student);
          var start = OffsetDateTime.parse("2030-01-07T10:00:00+01:00");
          var slot = new ConsultationSlot(teacher, start, start.plusHours(1));
          entityManager.persist(slot);
          var reservation = new Reservation(slot, student, "C03B test", "Atomic cancellation");
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
              new Notification(student, reservation, "RESERVATION_CREATED", "Test", "Test"));
          reservationId = reservation.getId();
          teacherId = teacher.getId();
          studentId = student.getId();
        });
    before = snapshot();
    assertEquals(new Snapshot("PENDING", null, null, null, 1, 1), before);
  }

  private AppUser user(UserRole role, String login) {
    return new AppUser(role, "C03B", "Test", login, login + "@example.test", "unused");
  }

  private Snapshot snapshot() {
    return transaction.execute(
        ignored ->
            jdbc.queryForObject(
                """
            SELECT status, cancelled_at, cancelled_by_user_id, cancellation_note,
              (SELECT count(*) FROM reservation_history WHERE reservation_id = r.id) AS histories,
              (SELECT count(*) FROM notifications WHERE reservation_id = r.id) AS notifications
            FROM reservations r WHERE id = ?
            """,
                (row, index) ->
                    new Snapshot(
                        row.getString("status"),
                        row.getObject("cancelled_at"),
                        row.getObject("cancelled_by_user_id", UUID.class),
                        row.getString("cancellation_note"),
                        row.getLong("histories"),
                        row.getLong("notifications")),
                reservationId));
  }

  private void cancel(String note) {
    service.cancel(
        reservationId,
        new AuthenticatedUser(teacherId, UserRole.TEACHER),
        new ReservationTransitionRequest(note));
  }

  @Test
  void successfulCancellationCommitsStateDetailsHistoryAndNotification() {
    cancel("Teacher unavailable");

    var after = snapshot();
    assertEquals("CANCELLED", after.status());
    assertNotNull(after.cancelledAt());
    assertEquals(teacherId, after.cancelledBy());
    assertEquals("Teacher unavailable", after.cancellationNote());
    assertEquals(before.historyCount() + 1, after.historyCount());
    assertEquals(before.notificationCount() + 1, after.notificationCount());
    assertEquals(
        teacherId,
        jdbc.queryForObject(
            "SELECT actor_user_id FROM reservation_history WHERE reservation_id = ? AND action = 'CANCELLED'",
            UUID.class,
            reservationId));
    assertEquals(
        studentId,
        jdbc.queryForObject(
            "SELECT recipient_user_id FROM notifications WHERE reservation_id = ? AND type = 'RESERVATION_CANCELLED'",
            UUID.class,
            reservationId));
  }

  @Test
  void cancellationWithoutReasonCommitsWithNullNote() {
    cancel(null);

    var after = snapshot();
    assertEquals("CANCELLED", after.status());
    assertEquals(teacherId, after.cancelledBy());
    assertNull(after.cancellationNote());
  }

  @Test
  void historyFailureRollsBackCancellation() {
    var failure = new IllegalStateException("Injected history write failure");
    doAnswer(
            invocation -> {
              assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
              entityManager.persist(invocation.getArgument(0, ReservationHistory.class));
              entityManager.flush();
              throw failure;
            })
        .when(history)
        .save(any(ReservationHistory.class));

    assertSame(failure, assertThrows(IllegalStateException.class, () -> cancel("Failure")));
    verifyNoInteractions(notifications);
    assertEquals(before, snapshot());
  }

  @Test
  void notificationFailureRollsBackCancellationAndHistory() {
    var failure = new IllegalStateException("Injected notification write failure");
    doAnswer(
            invocation -> {
              assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
              invocation.callRealMethod();
              entityManager.flush();
              throw failure;
            })
        .when(notifications)
        .create(any(), any(), any(), any(), any());

    assertSame(failure, assertThrows(IllegalStateException.class, () -> cancel("Failure")));
    assertEquals(before, snapshot());
  }

  @AfterAll
  static void removeOwnedSchema(@Autowired DataSource dataSource) throws Exception {
    try (var connection = dataSource.getConnection();
        var statement = connection.createStatement()) {
      statement.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }
  }
}
