package consultation_reservation_backend.service;

import consultation_reservation_backend.api.*;
import consultation_reservation_backend.domain.*;
import consultation_reservation_backend.repository.*;
import consultation_reservation_backend.security.AuthenticatedUser;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ReservationService {
  private static final List<ReservationStatus> ACTIVE =
      List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED);
  private static final int RESERVATION_CUTOFF_HOURS = 3;
  private static final int MAX_PENDING_RESERVATIONS = 5;
  private static final DateTimeFormatter APPOINTMENT_TIME =
      DateTimeFormatter.ofPattern("d. M. uuuu 'v' HH:mm").withZone(ZoneId.of("Europe/Prague"));
  private final ReservationRepository reservations;
  private final ConsultationSlotRepository slots;
  private final ReservationHistoryRepository history;
  private final NotificationService notifications;
  private final UserService users;

  public ReservationService(
      ReservationRepository reservations,
      ConsultationSlotRepository slots,
      ReservationHistoryRepository history,
      UserService users,
      NotificationService notifications) {
    this.reservations = reservations;
    this.slots = slots;
    this.history = history;
    this.users = users;
    this.notifications = notifications;
  }

  public ReservationResponse create(
      AuthenticatedUser authenticatedActor, CreateReservationRequest request) {
    if (authenticatedActor == null)
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required.");
    if (authenticatedActor.activeRole() != UserRole.STUDENT)
      throw new ApiException(HttpStatus.FORBIDDEN, "Only a student can create a reservation.");
    if (request == null)
      throw new ApiException(HttpStatus.BAD_REQUEST, "Reservation request is required.");
    AppUser student = users.get(authenticatedActor.id());
    if (!student.hasRole(UserRole.STUDENT))
      throw new ApiException(HttpStatus.FORBIDDEN, "Only a student can create a reservation.");
    ConsultationSlot slot =
        slots
            .findById(request.slotId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Slot not found."));
    OffsetDateTime now = OffsetDateTime.now();
    if (slot.getStatus() != SlotStatus.ACTIVE || !slot.getStartsAt().isAfter(now))
      throw new ApiException(HttpStatus.CONFLICT, "This slot is not available.");
    if ((request.consultationMode() == ConsultationMode.ONLINE && !slot.isOnlineAvailable())
        || (request.consultationMode() == ConsultationMode.OFFLINE && !slot.isOfflineAvailable()))
      throw new ApiException(
          HttpStatus.CONFLICT, "This consultation mode is not available for the slot.");
    if (slot.getStartsAt().isBefore(now.plusHours(RESERVATION_CUTOFF_HOURS)))
      throw new ApiException(
          HttpStatus.CONFLICT,
          "Reservations must be created at least 3 hours before the consultation starts.");
    if (reservations.findBySlotIdAndStatusIn(slot.getId(), ACTIVE).isPresent())
      throw new ApiException(HttpStatus.CONFLICT, "This slot is already reserved.");
    if (reservations.countByStudentIdAndStatus(student.getId(), ReservationStatus.PENDING)
        >= MAX_PENDING_RESERVATIONS)
      throw new ApiException(
          HttpStatus.CONFLICT, "A student can have at most 5 pending reservations.");
    if (!reservations
        .findOverlappingForStudent(student.getId(), slot.getStartsAt(), slot.getEndsAt(), ACTIVE)
        .isEmpty())
      throw new ApiException(
          HttpStatus.CONFLICT, "The student already has an overlapping reservation.");
    try {
      Reservation reservation =
          reservations.saveAndFlush(
              new Reservation(
                  slot,
                  student,
                  request.reasonTitle(),
                  request.reasonDescription(),
                  request.consultationMode()));
      history.save(
          new ReservationHistory(
              reservation,
              ReservationAction.CREATED,
              null,
              ReservationStatus.PENDING,
              student,
              null));
      notifications.create(
          slot.getTeacher(),
          reservation,
          "RESERVATION_CREATED",
          "Nová žádost o konzultaci",
          "Student "
              + student.getFirstName()
              + " "
              + student.getLastName()
              + " požádal o konzultaci.");
      return ReservationResponse.from(reservation);
    } catch (DataIntegrityViolationException exception) {
      throw new ApiException(
          HttpStatus.CONFLICT, "This slot was just reserved by another student.");
    }
  }

  public ReservationResponse approve(
      UUID reservationId,
      AuthenticatedUser authenticatedActor,
      ReservationTransitionRequest request) {
    if (authenticatedActor == null)
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required.");
    if (authenticatedActor.activeRole() != UserRole.TEACHER)
      throw new ApiException(HttpStatus.FORBIDDEN, "Only a teacher can approve a reservation.");
    if (reservationId == null || request == null)
      throw new ApiException(HttpStatus.BAD_REQUEST, "Reservation ID and request are required.");
    Reservation reservation = get(reservationId);
    AppUser teacher = users.get(authenticatedActor.id());
    if (!reservation.getSlot().getTeacher().getId().equals(teacher.getId()))
      throw new ApiException(HttpStatus.FORBIDDEN, "Only the slot's teacher can approve it.");
    if (reservation.getStatus() != ReservationStatus.PENDING)
      throw new ApiException(HttpStatus.CONFLICT, "Only a pending reservation can be approved.");
    reservation.confirm();
    history.save(
        new ReservationHistory(
            reservation,
            ReservationAction.CONFIRMED,
            ReservationStatus.PENDING,
            ReservationStatus.CONFIRMED,
            teacher,
            request.note()));
    notifications.create(
        reservation.getStudent(),
        reservation,
        "RESERVATION_APPROVED",
        "Rezervace byla schválena",
        "Pedagog "
            + teacher.getFirstName()
            + " "
            + teacher.getLastName()
            + " schválil vaši žádost o konzultaci.");
    return ReservationResponse.from(reservation);
  }

  public ReservationResponse cancel(
      UUID reservationId,
      AuthenticatedUser authenticatedActor,
      ReservationTransitionRequest request) {
    if (authenticatedActor == null)
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required.");
    if (request == null)
      throw new ApiException(HttpStatus.BAD_REQUEST, "Cancellation request is required.");
    Reservation reservation = get(reservationId);
    AppUser actor = users.get(authenticatedActor.id());
    return cancelReservation(reservation, authenticatedActor, actor, request);
  }

  public void cancelSlot(UUID slotId, AuthenticatedUser authenticatedActor) {
    AppUser teacher = requireTeacher(authenticatedActor);
    ConsultationSlot slot = getSlot(slotId);
    requireSlotOwner(slot, teacher);
    if (reservations.findBySlotIdAndStatusIn(slot.getId(), ACTIVE).isPresent())
      throw new ApiException(HttpStatus.CONFLICT, "An occupied slot cannot be cancelled.");
    slot.cancel();
  }

  public void cancelSlotWithReservation(
      UUID slotId, AuthenticatedUser authenticatedActor, ReservationTransitionRequest request) {
    AppUser teacher = requireTeacher(authenticatedActor);
    if (request == null)
      throw new ApiException(HttpStatus.BAD_REQUEST, "Cancellation request is required.");
    ConsultationSlot slot = getSlot(slotId);
    requireSlotOwner(slot, teacher);
    reservations
        .findBySlotIdAndStatusIn(slot.getId(), ACTIVE)
        .ifPresent(
            reservation -> cancelReservation(reservation, authenticatedActor, teacher, request));
    slot.cancel();
  }

  private ReservationResponse cancelReservation(
      Reservation reservation,
      AuthenticatedUser authenticatedActor,
      AppUser actor,
      ReservationTransitionRequest request) {
    boolean isStudent =
        authenticatedActor.activeRole() == UserRole.STUDENT
            && reservation.getStudent().getId().equals(actor.getId());
    boolean isTeacher =
        authenticatedActor.activeRole() == UserRole.TEACHER
            && reservation.getSlot().getTeacher().getId().equals(actor.getId());
    if (!isStudent && !isTeacher)
      throw new ApiException(
          HttpStatus.FORBIDDEN, "Only the student or the slot's teacher can cancel it.");
    if (reservation.getStatus() == ReservationStatus.CANCELLED)
      throw new ApiException(HttpStatus.CONFLICT, "Reservation is already cancelled.");
    if (reservation
        .getSlot()
        .getStartsAt()
        .isBefore(OffsetDateTime.now().plusHours(RESERVATION_CUTOFF_HOURS)))
      throw new ApiException(
          HttpStatus.CONFLICT,
          "Reservations cannot be cancelled less than 3 hours before the consultation starts.");
    ReservationStatus previous = reservation.getStatus();
    reservation.cancel(actor, request.note());
    history.save(
        new ReservationHistory(
            reservation,
            ReservationAction.CANCELLED,
            previous,
            ReservationStatus.CANCELLED,
            actor,
            request.note()));
    AppUser recipient = isStudent ? reservation.getSlot().getTeacher() : reservation.getStudent();
    String message =
        "Uživatel "
            + actor.getFirstName()
            + " "
            + actor.getLastName()
            + " zrušil konzultaci dne "
            + APPOINTMENT_TIME.format(reservation.getSlot().getStartsAt())
            + "."
            + (request.note() == null || request.note().isBlank()
                ? ""
                : " Důvod: " + request.note().trim() + ".");
    notifications.create(
        recipient,
        reservation,
        "RESERVATION_CANCELLED",
        "Rezervace byla zrušena",
        message);
    return ReservationResponse.from(reservation);
  }

  private AppUser requireTeacher(AuthenticatedUser authenticatedActor) {
    if (authenticatedActor == null)
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required.");
    if (authenticatedActor.activeRole() != UserRole.TEACHER)
      throw new ApiException(HttpStatus.FORBIDDEN, "Only the slot's teacher can cancel it.");
    AppUser teacher = users.get(authenticatedActor.id());
    if (!teacher.hasRole(UserRole.TEACHER))
      throw new ApiException(HttpStatus.FORBIDDEN, "Only the slot's teacher can cancel it.");
    return teacher;
  }

  private void requireSlotOwner(ConsultationSlot slot, AppUser teacher) {
    if (!slot.getTeacher().getId().equals(teacher.getId()))
      throw new ApiException(HttpStatus.FORBIDDEN, "Only the slot's teacher can cancel it.");
  }

  @Transactional(readOnly = true)
  public List<ReservationResponse> forUser(UUID userId) {
    return reservations.findAllForUser(userId).stream().map(ReservationResponse::from).toList();
  }

  private Reservation get(UUID id) {
    return reservations
        .findById(id)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Reservation not found."));
  }

  private ConsultationSlot getSlot(UUID id) {
    return slots
        .findById(id)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Slot not found."));
  }
}
