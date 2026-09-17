package consultation_reservation_backend.service;

import consultation_reservation_backend.api.*;
import consultation_reservation_backend.domain.*;
import consultation_reservation_backend.repository.ConsultationSlotRepository;
import consultation_reservation_backend.repository.ReservationRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ConsultationSlotService {
    private static final LocalTime WORKDAY_START = LocalTime.of(7, 15);
    private static final LocalTime WORKDAY_END = LocalTime.of(19, 15);
    private static final List<Long> ALLOWED_DURATIONS = List.of(15L, 30L, 45L, 60L, 90L);
    private final ConsultationSlotRepository slots;
    private final UserService users;
    private final ReservationRepository reservations;
    public ConsultationSlotService(ConsultationSlotRepository slots, UserService users, ReservationRepository reservations) { this.slots = slots; this.users = users; this.reservations = reservations; }
    public SlotResponse create(CreateSlotRequest request) {
        if (!request.endsAt().isAfter(request.startsAt())) throw new ApiException(HttpStatus.BAD_REQUEST, "Slot end must be after its start.");
        if (!request.startsAt().isAfter(OffsetDateTime.now())) throw new ApiException(HttpStatus.BAD_REQUEST, "A slot must start in the future.");
        validateDuration(request);
        validateWorkingHours(request);
        AppUser teacher = users.get(request.teacherId());
        if (!teacher.hasRole(UserRole.TEACHER)) throw new ApiException(HttpStatus.FORBIDDEN, "Only a teacher can create slots.");
        try { return SlotResponse.from(slots.saveAndFlush(new ConsultationSlot(teacher, request.startsAt(), request.endsAt()))); }
        catch (DataIntegrityViolationException exception) { throw new ApiException(HttpStatus.CONFLICT, "This slot overlaps another active slot of the teacher."); }
    }
    @Transactional(readOnly = true)
    public List<SlotResponse> forTeacher(UUID teacherId) { return slots.findByTeacher_IdOrderByStartsAt(teacherId).stream().map(SlotResponse::from).toList(); }

    public List<SlotResponse> available(OffsetDateTime from) {
        return slots.findAvailable(SlotStatus.ACTIVE, from == null ? OffsetDateTime.now() : from, List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED)).stream().map(SlotResponse::from).toList();
    }
    public void cancel(UUID slotId, UUID teacherId) {
        ConsultationSlot slot = slots.findById(slotId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Slot not found."));
        if (!slot.getTeacher().getId().equals(teacherId)) throw new ApiException(HttpStatus.FORBIDDEN, "Only the slot owner can cancel it.");
        if (reservations.findBySlotIdAndStatusIn(slot.getId(), List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED)).isPresent()) throw new ApiException(HttpStatus.CONFLICT, "Obsazený termín nelze zrušit.");
        slot.cancel();
    }

    private void validateDuration(CreateSlotRequest request) {
        long minutes = Duration.between(request.startsAt(), request.endsAt()).toMinutes();
        if (!ALLOWED_DURATIONS.contains(minutes)) throw new ApiException(HttpStatus.BAD_REQUEST, "Consultation duration must be 15, 30, 45, 60, or 90 minutes.");
    }

    private void validateWorkingHours(CreateSlotRequest request) {
        if (request.startsAt().getDayOfWeek().getValue() > 5 || request.endsAt().getDayOfWeek().getValue() > 5) throw new ApiException(HttpStatus.BAD_REQUEST, "Consultations can be created only Monday to Friday.");
        LocalTime start = request.startsAt().toLocalTime();
        LocalTime end = request.endsAt().toLocalTime();
        if (start.isBefore(WORKDAY_START) || end.isAfter(WORKDAY_END)) throw new ApiException(HttpStatus.BAD_REQUEST, "Consultations must be within working hours 07:15-19:15.");
    }
}
