package consultation_reservation_backend.service;

import consultation_reservation_backend.api.*;
import consultation_reservation_backend.domain.*;
import consultation_reservation_backend.repository.ConsultationSlotRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ConsultationSlotService {
    private final ConsultationSlotRepository slots;
    private final UserService users;
    public ConsultationSlotService(ConsultationSlotRepository slots, UserService users) { this.slots = slots; this.users = users; }
    public SlotResponse create(CreateSlotRequest request) {
        if (!request.endsAt().isAfter(request.startsAt())) throw new ApiException(HttpStatus.BAD_REQUEST, "Slot end must be after its start.");
        if (!request.startsAt().isAfter(OffsetDateTime.now())) throw new ApiException(HttpStatus.BAD_REQUEST, "A slot must start in the future.");
        AppUser teacher = users.get(request.teacherId());
        if (teacher.getRole() != UserRole.TEACHER) throw new ApiException(HttpStatus.FORBIDDEN, "Only a teacher can create slots.");
        try { return SlotResponse.from(slots.saveAndFlush(new ConsultationSlot(teacher, request.startsAt(), request.endsAt()))); }
        catch (DataIntegrityViolationException exception) { throw new ApiException(HttpStatus.CONFLICT, "This slot overlaps another active slot of the teacher."); }
    }
    @Transactional(readOnly = true)
    public List<SlotResponse> available(OffsetDateTime from) {
        return slots.findAvailable(SlotStatus.ACTIVE, from == null ? OffsetDateTime.now() : from, List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED)).stream().map(SlotResponse::from).toList();
    }
    public void cancel(UUID slotId, UUID teacherId) {
        ConsultationSlot slot = slots.findById(slotId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Slot not found."));
        if (!slot.getTeacher().getId().equals(teacherId)) throw new ApiException(HttpStatus.FORBIDDEN, "Only the slot owner can cancel it.");
        slot.cancel();
    }
}