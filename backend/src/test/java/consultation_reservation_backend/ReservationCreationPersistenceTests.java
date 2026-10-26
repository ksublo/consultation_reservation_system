package consultation_reservation_backend;

import static org.junit.jupiter.api.Assertions.*;

import consultation_reservation_backend.api.ApiException;
import consultation_reservation_backend.api.CreateReservationRequest;
import consultation_reservation_backend.domain.*;
import consultation_reservation_backend.security.AuthenticatedUser;
import consultation_reservation_backend.service.ReservationService;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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
  @Autowired PlatformTransactionManager transactions;

  private TransactionTemplate transaction;
  private AuthenticatedUser student;
  private UUID blockedSlotId;
  private UUID overlappingSlotId;
  private UUID nextSlotId;
  private UUID previousSlotId;

  @BeforeEach
  void prepareSlots() {
    transaction = new TransactionTemplate(transactions);
    transaction.executeWithoutResult(
        ignored -> {
          AppUser studentUser = user(UserRole.STUDENT, "student-" + UUID.randomUUID());
          entityManager.persist(studentUser);
          student = new AuthenticatedUser(studentUser.getId(), UserRole.STUDENT);

          var start =
              OffsetDateTime.now().plusDays(1).withHour(13).withMinute(0).withSecond(0).withNano(0);
          var blocked = slot("blocked", start, start.plusMinutes(30));
          var overlapping = slot("overlap", start.plusMinutes(15), start.plusMinutes(45));
          var next = slot("next", start.plusMinutes(30), start.plusHours(1));
          var previous = slot("previous", start.minusMinutes(30), start);
          blockedSlotId = blocked.getId();
          overlappingSlotId = overlapping.getId();
          nextSlotId = next.getId();
          previousSlotId = previous.getId();
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
