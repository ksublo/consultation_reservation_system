package consultation_reservation_backend.api;

import consultation_reservation_backend.domain.ConsultationSlot;
import consultation_reservation_backend.domain.SlotStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SlotResponse(
    UUID id,
    UUID teacherId,
    String teacherName,
    OffsetDateTime startsAt,
    OffsetDateTime endsAt,
    SlotStatus status) {
  public static SlotResponse from(ConsultationSlot slot) {
    return new SlotResponse(
        slot.getId(),
        slot.getTeacher().getId(),
        slot.getTeacher().getFirstName() + " " + slot.getTeacher().getLastName(),
        slot.getStartsAt(),
        slot.getEndsAt(),
        slot.getStatus());
  }
}
