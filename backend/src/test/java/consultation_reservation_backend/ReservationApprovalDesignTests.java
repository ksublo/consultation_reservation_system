package consultation_reservation_backend;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import consultation_reservation_backend.api.*;
import consultation_reservation_backend.domain.*;
import consultation_reservation_backend.repository.*;
import consultation_reservation_backend.security.AuthenticatedUser;
import consultation_reservation_backend.service.*;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

/** C05 service contract tests; collaborators are mocked, no database or Spring proxy. */
class ReservationApprovalDesignTests {
  ReservationRepository reservations;
  ConsultationSlotRepository slots;
  ReservationHistoryRepository history;
  UserService users;
  NotificationService notifications;
  ReservationService service;
  AppUser teacher, student;
  Reservation reservation;
  AuthenticatedUser actor;
  ReservationTransitionRequest request = new ReservationTransitionRequest("Schváleno");

  @BeforeEach
  void setup() {
    reservations = mock(ReservationRepository.class);
    slots = mock(ConsultationSlotRepository.class);
    history = mock(ReservationHistoryRepository.class);
    users = mock(UserService.class);
    notifications = mock(NotificationService.class);
    service = new ReservationService(reservations, slots, history, users, notifications);
    teacher = user(UserRole.TEACHER, "owner");
    student = user(UserRole.STUDENT, "student");
    var start = OffsetDateTime.now().plusDays(2);
    reservation =
        new Reservation(
            new ConsultationSlot(teacher, start, start.plusHours(1)),
            student,
            "Consultation",
            "Question");
    actor = new AuthenticatedUser(teacher.getId(), UserRole.TEACHER);
    when(reservations.findById(reservation.getId())).thenReturn(Optional.of(reservation));
    when(users.get(teacher.getId())).thenReturn(teacher);
  }

  private AppUser user(UserRole role, String name) {
    return new AppUser(role, name, "Test", name, name + "@example.test", "unused");
  }

  private void assertRejected(
      HttpStatus expected, UUID id, AuthenticatedUser identity, ReservationTransitionRequest body) {
    var status = reservation.getStatus();
    var confirmedAt = reservation.getConfirmedAt();
    var error = assertThrows(ApiException.class, () -> service.approve(id, identity, body));
    assertEquals(expected, error.getStatus());
    assertEquals(status, reservation.getStatus());
    assertEquals(confirmedAt, reservation.getConfirmedAt());
    verifyNoInteractions(history, notifications, slots);
  }

  @Test
  void missingActorIsRejectedBeforeReadingReservation() {
    assertRejected(HttpStatus.UNAUTHORIZED, UUID.randomUUID(), null, request);
    verifyNoInteractions(reservations, users);
  }

  @Test
  void studentIsRejectedBeforeReadingReservation() {
    assertRejected(
        HttpStatus.FORBIDDEN,
        UUID.randomUUID(),
        new AuthenticatedUser(student.getId(), UserRole.STUDENT),
        request);
    verifyNoInteractions(reservations, users);
  }

  @Test
  void missingIdIsRejectedBeforeReadingReservation() {
    assertRejected(HttpStatus.BAD_REQUEST, null, actor, request);
    verifyNoInteractions(reservations, users);
  }

  @Test
  void missingRequestIsRejectedBeforeReadingReservation() {
    assertRejected(HttpStatus.BAD_REQUEST, reservation.getId(), actor, null);
    verifyNoInteractions(reservations, users);
  }

  @Test
  void missingReservationReturnsNotFoundWithoutWrites() {
    assertRejected(HttpStatus.NOT_FOUND, UUID.randomUUID(), actor, request);
    verifyNoInteractions(users);
  }

  @Test
  void foreignTeacherCannotApproveEvenWhenStateIsInvalid() {
    AppUser other = user(UserRole.TEACHER, "other");
    when(users.get(other.getId())).thenReturn(other);
    reservation.confirm();
    assertRejected(
        HttpStatus.FORBIDDEN,
        reservation.getId(),
        new AuthenticatedUser(other.getId(), UserRole.TEACHER),
        request);
  }

  @Test
  void ownerCannotApproveConfirmedReservationAgain() {
    reservation.confirm();
    assertRejected(HttpStatus.CONFLICT, reservation.getId(), actor, request);
  }

  @Test
  void ownerCannotApproveCancelledReservation() {
    reservation.cancel(student, "Cannot attend");
    assertRejected(HttpStatus.CONFLICT, reservation.getId(), actor, request);
  }

  @Test
  void ownerApprovesWithCorrectAuditAndStudentNotification() {
    var before = OffsetDateTime.now();
    var result = service.approve(reservation.getId(), actor, request);
    assertEquals(ReservationStatus.CONFIRMED, result.status());
    assertEquals(reservation.getId(), result.id());
    assertEquals(student.getId(), result.studentId());
    assertEquals(teacher.getId(), result.teacherId());
    assertNotNull(result.confirmedAt());
    assertFalse(result.confirmedAt().isBefore(before));
    assertFalse(result.confirmedAt().isAfter(OffsetDateTime.now()));
    assertNull(result.cancelledAt());
    var saved = ArgumentCaptor.forClass(ReservationHistory.class);
    var order = inOrder(history, notifications);
    order.verify(history).save(saved.capture());
    assertEquals(reservation, ReflectionTestUtils.getField(saved.getValue(), "reservation"));
    assertEquals(teacher, ReflectionTestUtils.getField(saved.getValue(), "actor"));
    assertEquals(
        ReservationAction.CONFIRMED, ReflectionTestUtils.getField(saved.getValue(), "action"));
    assertEquals(
        ReservationStatus.PENDING,
        ReflectionTestUtils.getField(saved.getValue(), "previousStatus"));
    assertEquals(
        ReservationStatus.CONFIRMED, ReflectionTestUtils.getField(saved.getValue(), "newStatus"));
    assertEquals(request.note(), ReflectionTestUtils.getField(saved.getValue(), "note"));
    order
        .verify(notifications)
        .create(eq(student), eq(reservation), eq("RESERVATION_APPROVED"), anyString(), anyString());
    verifyNoMoreInteractions(history, notifications);
    verifyNoInteractions(slots);
  }

  @Test
  void optionalNoteMayBeNull() {
    assertEquals(
        ReservationStatus.CONFIRMED,
        service
            .approve(reservation.getId(), actor, new ReservationTransitionRequest(null))
            .status());
  }

  @Test
  void historyFailurePropagatesAndPreventsNotification() {
    var failure = new IllegalStateException("history unavailable");
    when(history.save(any(ReservationHistory.class))).thenThrow(failure);
    assertSame(
        failure,
        assertThrows(
            IllegalStateException.class,
            () -> service.approve(reservation.getId(), actor, request)));
    verifyNoInteractions(notifications);
  }

  @Test
  void notificationFailurePropagatesWithoutSuccessResponse() {
    var failure = new IllegalStateException("notification unavailable");
    doThrow(failure)
        .when(notifications)
        .create(any(), any(), anyString(), anyString(), anyString());
    assertSame(
        failure,
        assertThrows(
            IllegalStateException.class,
            () -> service.approve(reservation.getId(), actor, request)));
    verify(history).save(any(ReservationHistory.class));
    // No Spring proxy: verifies failure propagation, not database rollback.
  }
}
