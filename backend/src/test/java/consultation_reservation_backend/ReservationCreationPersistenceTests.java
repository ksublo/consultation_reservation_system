package consultation_reservation_backend;

import static org.junit.jupiter.api.Assertions.*;

import consultation_reservation_backend.api.ApiException;
import consultation_reservation_backend.api.CreateReservationRequest;
import consultation_reservation_backend.domain.*;
import consultation_reservation_backend.security.AuthenticatedUser;
import consultation_reservation_backend.service.ConsultationSlotService;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** C02 creation verification against the real service, repositories and PostgreSQL. */
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ReservationCreationPersistenceTests {
  private static final String SCHEMA =
      "c02_create_" + UUID.randomUUID().toString().replace("-", "");
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
  }

  @Autowired ReservationService service;
  @Autowired ConsultationSlotService consultationSlots;
  @Autowired EntityManager entityManager;
  @Autowired PlatformTransactionManager transactions;
  @Autowired Clock clock;

  private TransactionTemplate transaction;
  private AuthenticatedUser student;
  private UUID blockedSlotId;
  private UUID overlappingSlotId;
  private UUID nextSlotId;
  private UUID previousSlotId;
  private UUID exactBoundarySlotId;
  private UUID afterBoundarySlotId;

  @BeforeEach
  void prepareSlots() {
    transaction = new TransactionTemplate(transactions);
    transaction.executeWithoutResult(
        ignored -> {
          AppUser studentUser = user(UserRole.STUDENT, "student-" + UUID.randomUUID());
          entityManager.persist(studentUser);
          student = new AuthenticatedUser(studentUser.getId(), UserRole.STUDENT);

          var now = OffsetDateTime.now(clock);
          var start = now.plusDays(1).withHour(13).withMinute(0).withSecond(0).withNano(0);
          var blocked = slot("blocked", start, start.plusMinutes(30));
          var overlapping = slot("overlap", start.plusMinutes(15), start.plusMinutes(45));
          var next = slot("next", start.plusMinutes(30), start.plusHours(1));
          var previous = slot("previous", start.minusMinutes(30), start);
          blockedSlotId = blocked.getId();
          overlappingSlotId = overlapping.getId();
          nextSlotId = next.getId();
          previousSlotId = previous.getId();
          var exactBoundary = slot("exact-boundary", now.plusHours(3), now.plusHours(4));
          var afterBoundary =
              slot("after-boundary", now.plusHours(3).plusSeconds(1), now.plusHours(4));
          exactBoundarySlotId = exactBoundary.getId();
          afterBoundarySlotId = afterBoundary.getId();
        });
  }

  private ConsultationSlot slot(String suffix, OffsetDateTime start, OffsetDateTime end) {
    AppUser teacher = user(UserRole.TEACHER, "teacher-" + suffix + "-" + UUID.randomUUID());
    entityManager.persist(teacher);
    ConsultationSlot slot = new ConsultationSlot(teacher, start, end);
    entityManager.persist(slot);
    return slot;
  }

  private AppUser user(UserRole role, String login) {
    return new AppUser(role, "C02", "Test", login, login + "@example.test", "unused");
  }

  private void create(UUID slotId) {
    service.create(
        student,
        new CreateReservationRequest(
            slotId, "C02 interval", "Interval verification", ConsultationMode.OFFLINE));
  }

  @Test
  void creationRejectsOccupiedAndOverlappingSlotsButAllowsAdjacentIntervals() {
    create(blockedSlotId);

    ApiException occupied = assertThrows(ApiException.class, () -> create(blockedSlotId));
    assertEquals(409, occupied.getStatus().value());

    ApiException overlap = assertThrows(ApiException.class, () -> create(overlappingSlotId));
    assertEquals(409, overlap.getStatus().value());

    assertEquals(ReservationStatus.PENDING, createAndGetStatus(nextSlotId));
    assertEquals(ReservationStatus.PENDING, createAndGetStatus(previousSlotId));
  }

  @Test
  void creationRejectsTheExactThreeHourBoundary() {
    ApiException error = assertThrows(ApiException.class, () -> create(exactBoundarySlotId));

    assertEquals(409, error.getStatus().value());
    assertEquals(
        "Reservations must be created more than 3 hours before the consultation starts.",
        error.getMessage());
  }

  @Test
  void creationAndAvailabilityUseTheSameExclusiveBoundary() {
    var availableIds =
        consultationSlots.available(null).stream().map(response -> response.id()).toList();

    assertFalse(availableIds.contains(exactBoundarySlotId));
    assertTrue(availableIds.contains(afterBoundarySlotId));
    assertEquals(ReservationStatus.PENDING, createAndGetStatus(afterBoundarySlotId));
  }

  private ReservationStatus createAndGetStatus(UUID slotId) {
    return service
        .create(
            student,
            new CreateReservationRequest(
                slotId, "Adjacent interval", "Should be allowed", ConsultationMode.OFFLINE))
        .status();
  }

  @AfterAll
  static void removeOwnedSchema(@Autowired DataSource dataSource) throws Exception {
    try (var connection = dataSource.getConnection();
        var statement = connection.createStatement()) {
      statement.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }
  }
}
