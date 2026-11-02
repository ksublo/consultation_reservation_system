package consultation_reservation_backend.api;

import consultation_reservation_backend.domain.Reservation;
import consultation_reservation_backend.domain.ReservationStatus;
import consultation_reservation_backend.domain.ConsultationMode;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ReservationResponse(
    UUID id,
    UUID slotId,
    UUID studentId,
    UUID teacherId,
    String teacherName,
    String studentFirstName,
    String studentLastName,
    String studentLogin,
    String studentEmail,
    String reasonTitle,
    String reasonDescription,
    ConsultationMode consultationMode,
    String teacherCabinet,
    ReservationStatus status,
    OffsetDateTime startsAt,
    OffsetDateTime endsAt,
    OffsetDateTime createdAt,
    OffsetDateTime confirmedAt,
    OffsetDateTime cancelledAt,
    String cancelledByName,
    String cancellationNote) {
  public static ReservationResponse from(Reservation r) {
    return new ReservationResponse(
        r.getId(),
        r.getSlot().getId(),
        r.getStudent().getId(),
        r.getSlot().getTeacher().getId(),
        r.getSlot().getTeacher().getFirstName() + " " + r.getSlot().getTeacher().getLastName(),
        r.getStudent().getFirstName(),
        r.getStudent().getLastName(),
        r.getStudent().getLogin(),
        r.getStudent().getEmail(),
        r.getReasonTitle(),
        r.getReasonDescription(),
        r.getConsultationMode(),
        r.getSlot().getTeacher().getCabinet() == null
            ? null
            : r.getSlot().getTeacher().getCabinet().getName(),
        r.getStatus(),
        r.getSlot().getStartsAt(),
        r.getSlot().getEndsAt(),
        r.getCreatedAt(),
        r.getConfirmedAt(),
        r.getCancelledAt(),
        r.getCancelledByUser() == null
            ? null
            : r.getCancelledByUser().getFirstName() + " " + r.getCancelledByUser().getLastName(),
        r.getCancellationNote());
  }
}
