package consultation_reservation_backend.api;
import consultation_reservation_backend.domain.Notification;
import java.time.OffsetDateTime;
import java.util.UUID;
public record NotificationResponse(UUID id, UUID reservationId, String type, String title, String message, OffsetDateTime startsAt, OffsetDateTime endsAt, OffsetDateTime createdAt, OffsetDateTime readAt) {
    public static NotificationResponse from(Notification notification) { return new NotificationResponse(notification.getId(), notification.getReservationId(), notification.getType(), notification.getTitle(), notification.getMessage(), notification.getReservationId() == null ? null : notification.getReservation().getSlot().getStartsAt(), notification.getReservationId() == null ? null : notification.getReservation().getSlot().getEndsAt(), notification.getCreatedAt(), notification.getReadAt()); }
}
