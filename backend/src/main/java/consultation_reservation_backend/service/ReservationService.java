package consultation_reservation_backend.service;

import consultation_reservation_backend.api.*;
import consultation_reservation_backend.domain.*;
import consultation_reservation_backend.repository.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ReservationService {
    private static final List<ReservationStatus> ACTIVE = List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED);
    private final ReservationRepository reservations;
    private final ConsultationSlotRepository slots;
    private final ReservationHistoryRepository history;
    private final UserService users;
    public ReservationService(ReservationRepository reservations, ConsultationSlotRepository slots, ReservationHistoryRepository history, UserService users) { this.reservations = reservations; this.slots = slots; this.history = history; this.users = users; }
    public ReservationResponse create(CreateReservationRequest request) {
        AppUser student = users.get(request.studentId());
        if (student.getRole() != UserRole.STUDENT) throw new ApiException(HttpStatus.FORBIDDEN, "Only a student can create a reservation.");
        ConsultationSlot slot = slots.findById(request.slotId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Slot not found."));
        if (slot.getStatus() != SlotStatus.ACTIVE || !slot.getStartsAt().isAfter(java.time.OffsetDateTime.now())) throw new ApiException(HttpStatus.CONFLICT, "This slot is not available.");
        if (reservations.findBySlotIdAndStatusIn(slot.getId(), ACTIVE).isPresent()) throw new ApiException(HttpStatus.CONFLICT, "This slot is already reserved.");
        try {
            Reservation reservation = reservations.saveAndFlush(new Reservation(slot, student, request.reasonTitle(), request.reasonDescription()));
            history.save(new ReservationHistory(reservation, ReservationAction.CREATED, null, ReservationStatus.PENDING, student, null));
            return ReservationResponse.from(reservation);
        } catch (DataIntegrityViolationException exception) { throw new ApiException(HttpStatus.CONFLICT, "This slot was just reserved by another student."); }
    }
    public ReservationResponse approve(UUID reservationId, ActorRequest request) {
        Reservation reservation = get(reservationId);
        AppUser teacher = users.get(request.actorUserId());
        if (!reservation.getSlot().getTeacher().getId().equals(teacher.getId())) throw new ApiException(HttpStatus.FORBIDDEN, "Only the slot's teacher can approve it.");
        if (reservation.getStatus() != ReservationStatus.PENDING) throw new ApiException(HttpStatus.CONFLICT, "Only a pending reservation can be approved.");
        reservation.confirm();
        history.save(new ReservationHistory(reservation, ReservationAction.CONFIRMED, ReservationStatus.PENDING, ReservationStatus.CONFIRMED, teacher, request.note()));
        return ReservationResponse.from(reservation);
    }
    public ReservationResponse cancel(UUID reservationId, ActorRequest request) {
        Reservation reservation = get(reservationId);
        AppUser actor = users.get(request.actorUserId());
        boolean isStudent = reservation.getStudent().getId().equals(actor.getId());
        boolean isTeacher = reservation.getSlot().getTeacher().getId().equals(actor.getId());
        if (!isStudent && !isTeacher) throw new ApiException(HttpStatus.FORBIDDEN, "Only the student or the slot's teacher can cancel it.");
        if (reservation.getStatus() == ReservationStatus.CANCELLED) throw new ApiException(HttpStatus.CONFLICT, "Reservation is already cancelled.");
        ReservationStatus previous = reservation.getStatus();
        reservation.cancel(actor, request.note());
        history.save(new ReservationHistory(reservation, ReservationAction.CANCELLED, previous, ReservationStatus.CANCELLED, actor, request.note()));
        return ReservationResponse.from(reservation);
    }
    @Transactional(readOnly = true)
    public List<ReservationResponse> forUser(UUID userId) {
        return reservations.findByStudentIdOrSlotTeacherIdOrderByCreatedAtDesc(userId, userId).stream().map(ReservationResponse::from).toList();
    }
    private Reservation get(UUID id) { return reservations.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Reservation not found.")); }
}
