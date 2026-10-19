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

/** Real PostgreSQL and Spring transactions; each run owns an isolated, temporary schema. */
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ReservationApprovalPersistenceTests {
  private static final String SCHEMA = "c05_test_" + UUID.randomUUID().toString().replace("-", "");

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

  record Snapshot(String status, Object confirmedAt, long historyCount, long notificationCount) {}

  @BeforeEach
  void prepareCommittedFixture() {
    transaction = new TransactionTemplate(transactions);
    assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
    assertTrue(
        AopUtils.isAopProxy(service), "Approval must run through Spring's transaction proxy");
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
          var reservation = new Reservation(slot, student, "C05 test", "Atomic approval");
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
          reservationId = reservation.getId();
          teacherId = teacher.getId();
          studentId = student.getId();
        });
    before = snapshot();
    assertEquals(new Snapshot("PENDING", null, 1, 1), before);
  }

  private AppUser user(UserRole role, String login) {
    return new AppUser(role, "C05", "Test", login, login + "@example.test", "unused");
  }

  // Each check starts a fresh transaction and reads SQL, never a cached entity.
  private Snapshot snapshot() {
    return transaction.execute(
        ignored ->
            jdbc.queryForObject(
                """
            SELECT status, confirmed_at,
              (SELECT count(*) FROM reservation_history WHERE reservation_id = r.id) AS histories,
              (SELECT count(*) FROM notifications WHERE reservation_id = r.id) AS notifications
            FROM reservations r WHERE id = ?
            """,
                (row, index) ->
                    new Snapshot(
                        row.getString("status"),
                        row.getObject("confirmed_at"),
                        row.getLong("histories"),
                        row.getLong("notifications")),
                reservationId));
  }

  private void approve() {
    service.approve(
        reservationId,
        new AuthenticatedUser(teacherId, UserRole.TEACHER),
        new ReservationTransitionRequest("Approved in C05 test"));
  }

  @Test
  void successfulApprovalCommitsStateHistoryAndNotification() {
    approve();
    var after = snapshot();
    assertEquals("CONFIRMED", after.status());
    assertNotNull(after.confirmedAt());
    assertEquals(before.historyCount() + 1, after.historyCount());
    assertEquals(before.notificationCount() + 1, after.notificationCount());
    assertEquals(
        teacherId,
        jdbc.queryForObject(
            "SELECT actor_user_id FROM reservation_history WHERE reservation_id = ? AND action = 'CONFIRMED'",
            UUID.class,
            reservationId));
    assertEquals(
        studentId,
        jdbc.queryForObject(
            "SELECT recipient_user_id FROM notifications WHERE reservation_id = ? AND type = 'RESERVATION_APPROVED'",
            UUID.class,
            reservationId));
  }

  @Test
  void historyFailureRollsBackApproval() {
    var failure = new IllegalStateException("Injected history write failure");
    doAnswer(
            invocation -> {
              assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
              // Force SQL before failing: rollback must undo both the entity and the audit write.
              entityManager.persist(invocation.getArgument(0, ReservationHistory.class));
              entityManager.flush();
              assertEquals(
                  "CONFIRMED",
                  jdbc.queryForObject(
                      "SELECT status FROM reservations WHERE id = ?", String.class, reservationId));
              throw failure;
            })
        .when(history)
        .save(any(ReservationHistory.class));

    assertSame(failure, assertThrows(IllegalStateException.class, this::approve));
    verifyNoInteractions(notifications);
    assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
    assertEquals(before, snapshot());
  }

  @Test
  void notificationFailureRollsBackApprovalAndHistory() {
    var failure = new IllegalStateException("Injected notification write failure");
    doAnswer(
            invocation -> {
              assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
              invocation.callRealMethod();
              // Flush all three writes, then fail before commit to demonstrate real rollback.
              entityManager.flush();
              assertEquals(
                  before.historyCount() + 1,
                  jdbc.queryForObject(
                      "SELECT count(*) FROM reservation_history WHERE reservation_id = ?",
                      Long.class,
                      reservationId));
              assertEquals(
                  before.notificationCount() + 1,
                  jdbc.queryForObject(
                      "SELECT count(*) FROM notifications WHERE reservation_id = ?",
                      Long.class,
                      reservationId));
              throw failure;
            })
        .when(notifications)
        .create(any(), any(), any(), any(), any());

    assertSame(failure, assertThrows(IllegalStateException.class, this::approve));
    assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
    assertEquals(before, snapshot());
  }

  @AfterAll
  static void removeOwnedSchema(@Autowired DataSource dataSource) throws Exception {
    // Only this run's randomly named schema is removed; application data is untouched.
    try (var connection = dataSource.getConnection();
        var statement = connection.createStatement()) {
      statement.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }
  }
}
