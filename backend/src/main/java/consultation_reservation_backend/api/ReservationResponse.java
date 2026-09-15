package consultation_reservation_backend.api;

import consultation_reservation_backend.domain.Reservation;
import consultation_reservation_backend.domain.ReservationStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ReservationResponse(UUID id, UUID slotId, UUID studentId, UUID teacherId, String reasonTitle, String reasonDescription, ReservationStatus status, OffsetDateTime createdAt, OffsetDateTime confirmedAt, OffsetDateTime cancelledAt) {
    public static ReservationResponse from(Reservation reservation) {
        return new ReservationResponse(reservation.getId(), reservation.getSlot().getId(), reservation.getStudent().getId(), reservation.getSlot().getTeacher().getId(), reservation.getReasonTitle(), reservation.getReasonDescription(), reservation.getStatus(), reservation.getCreatedAt(), reservation.getConfirmedAt(), reservation.getCancelledAt());
    }
}