package consultation_reservation_backend;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import consultation_reservation_backend.api.ApiException;
import consultation_reservation_backend.api.ReservationTransitionRequest;
import consultation_reservation_backend.domain.*;
import consultation_reservation_backend.repository.ReservationHistoryRepository;
import consultation_reservation_backend.security.AuthenticatedUser;
import consultation_reservation_backend.service.NotificationService;
import consultation_reservation_backend.service.ReservationService;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** PostgreSQL-backed checks for automatic expiration and cutoff behavior. */
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ReservationExpiryPersistenceTests {
  private static final String SCHEMA =
      "c08_expiry_" + UUID.randomUUID().toString().replace("-", "");
  private static final Instant NOW = Instant.parse("2030-01-07T06:00:00Z");

  @TestConfiguration
  static class FixedClockConfiguration {
    @Bean
    @Primary
    Clock testClock() {
      return Clock.fixed(NOW, ZoneOffset.UTC);
    }
  }

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
    properties.add("app.reservations.expiry-poll-interval-ms", () -> "3600000");
  }

  @Autowired ReservationService service;
  @Autowired EntityManager entityManager;
  @Autowired JdbcTemplate jdbc;
  @Autowired PlatformTransactionManager transactions;
  @Autowired Clock clock;
  @MockitoSpyBean ReservationHistoryRepository history;
  @MockitoSpyBean NotificationService notifications;

  UUID reservationId;
  UUID teacherId;
  UUID studentId;
  TransactionTemplate transaction;

  @BeforeEach
  void prepare() {
    transaction = new TransactionTemplate(transactions);
    assertTrue(AopUtils.isAopProxy(service));
    reset(history, notifications);
  }

  private void createReservation(OffsetDateTime startsAt) {
    transaction.executeWithoutResult(
        ignored -> {
          String suffix = UUID.randomUUID().toString();
          AppUser teacher = user(UserRole.TEACHER, "teacher-" + suffix);
          AppUser student = user(UserRole.STUDENT, "student-" + suffix);
          entityManager.persist(teacher);
          entityManager.persist(student);
          var slot = new ConsultationSlot(teacher, startsAt, startsAt.plusHours(1));
          entityManager.persist(slot);
          var reservation = new Reservation(slot, student, "C08 test", "Automatic expiry");
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
  }

  private AppUser user(UserRole role, String login) {
    return new AppUser(role, "C08", "Test", login, login + "@example.test", "unused");
  }

  private String status() {
    return jdbc.queryForObject(
        "SELECT status FROM reservations WHERE id = ?", String.class, reservationId);
  }

  private long historyCount() {
    return jdbc.queryForObject(
        "SELECT count(*) FROM reservation_history WHERE reservation_id = ?",
        Long.class,
        reservationId);
  }

  private long cancellationNotificationCount() {
    return jdbc.queryForObject(
        "SELECT count(*) FROM notifications WHERE reservation_id = ? AND type = 'RESERVATION_CANCELLED'",
        Long.class,
        reservationId);
  }

  @Test
  void expiresAtExactThreeHourBoundaryAndDoesNotDuplicateAuditOrNotification() {
    var startsAt = OffsetDateTime.now(clock).plusHours(3);
    createReservation(startsAt);

    service.cancelExpiredPendingReservations();

    assertEquals("CANCELLED", status());
    assertEquals(2, historyCount());
    assertEquals(1, cancellationNotificationCount());
    assertEquals(
        "Pedagog žádost včas neschválil.",
        jdbc.queryForObject(
            "SELECT cancellation_note FROM reservations WHERE id = ?",
            String.class,
            reservationId));
    assertNull(
        jdbc.queryForObject(
            "SELECT actor_user_id FROM reservation_history WHERE reservation_id = ? AND action = 'CANCELLED'",
            UUID.class,
            reservationId));
    assertEquals(
        "Pedagog žádost včas neschválil.",
        jdbc.queryForObject(
            "SELECT note FROM reservation_history WHERE reservation_id = ? AND action = 'CANCELLED'",
            String.class,
            reservationId));
    String notification =
        jdbc.queryForObject(
            "SELECT message FROM notifications WHERE reservation_id = ? AND type = 'RESERVATION_CANCELLED'",
            String.class,
            reservationId);
    assertTrue(notification.contains("7. 1. 2030 v 10:00"));
    assertTrue(notification.contains("C08 Test"));
    assertTrue(notification.contains("Pedagog žádost včas neschválil."));

    service.cancelExpiredPendingReservations();
    assertEquals(2, historyCount());
    assertEquals(1, cancellationNotificationCount());
  }

  @Test
  void doesNotExpireOrBlockApprovalBeforeTheThreeHourBoundary() {
    createReservation(OffsetDateTime.now(clock).plusHours(3).plusSeconds(1));

    service.cancelExpiredPendingReservations();
    assertEquals("PENDING", status());

    var response =
        service.approve(
            reservationId,
            new AuthenticatedUser(teacherId, UserRole.TEACHER),
            new ReservationTransitionRequest(null));
    assertEquals(ReservationStatus.CONFIRMED, response.status());
    assertEquals(2, historyCount());
    assertEquals(0, cancellationNotificationCount());
  }

  @Test
  void approvalAtExactBoundaryIsRejectedAndCommitsAutomaticCancellation() {
    createReservation(OffsetDateTime.now(clock).plusHours(3));

    var error =
        assertThrows(
            ApiException.class,
            () ->
                service.approve(
                    reservationId,
                    new AuthenticatedUser(teacherId, UserRole.TEACHER),
                    new ReservationTransitionRequest(null)));

    assertEquals(409, error.getStatus().value());
    assertEquals("CANCELLED", status());
    assertEquals(2, historyCount());
    assertEquals(1, cancellationNotificationCount());
  }

  @Test
  void manualCancellationAtExactBoundaryIsRejected() {
    createReservation(OffsetDateTime.now(clock).plusHours(3));

    var error =
        assertThrows(
            ApiException.class,
            () ->
                service.cancel(
                    reservationId,
                    new AuthenticatedUser(studentId, UserRole.STUDENT),
                    new ReservationTransitionRequest("Too late")));

    assertEquals(409, error.getStatus().value());
    assertEquals("PENDING", status());
    assertEquals(1, historyCount());
    assertEquals(0, cancellationNotificationCount());
  }

  @Test
  void historyFailureRollsBackAutomaticCancellationAndNotification() {
    createReservation(OffsetDateTime.now(clock).plusHours(3));
    var failure = new IllegalStateException("Injected history failure");
    doThrow(failure).when(history).save(any(ReservationHistory.class));

    assertSame(
        failure,
        assertThrows(IllegalStateException.class, service::cancelExpiredPendingReservations));
    assertEquals("PENDING", status());
    assertEquals(1, historyCount());
    assertEquals(0, cancellationNotificationCount());
  }

  @Test
  void notificationFailureRollsBackAutomaticCancellationAndHistory() {
    createReservation(OffsetDateTime.now(clock).plusHours(3));
    var failure = new IllegalStateException("Injected notification failure");
    doThrow(failure)
        .when(notifications)
        .create(any(), any(), anyString(), anyString(), anyString());

    assertSame(
        failure,
        assertThrows(IllegalStateException.class, service::cancelExpiredPendingReservations));
    assertEquals("PENDING", status());
    assertEquals(1, historyCount());
    assertEquals(0, cancellationNotificationCount());
  }

  @AfterAll
  static void removeOwnedSchema(@Autowired DataSource dataSource) throws Exception {
    try (var connection = dataSource.getConnection();
        var statement = connection.createStatement()) {
      statement.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }
  }
}
